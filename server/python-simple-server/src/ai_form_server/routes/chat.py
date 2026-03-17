# -*- coding: utf-8 -*-
# -------------------------------
# @File: chat.py
# @Time: 2025/03/17
# @Author: cilang
# @Email: cilanguser@Gmail.com
# @Desc: Chat API routes
# -------------------------------
"""
Chat API routes for AI-powered form data generation.

Provides endpoints for:
- AI chat for form data generation
- Health checks
"""

from __future__ import annotations

import logging
import re
import uuid
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, Tuple

from flask import Blueprint, Response, g, jsonify, request
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from ai_form_server.auth.decorators import require_auth
from ai_form_server.config import get_config
from ai_form_server.services.chat import ChatAssistant
from ai_form_server.services.roles import DEFAULT_FORM_ROLE

logger = logging.getLogger(__name__)

# Compile prompt injection patterns for performance
PROMPT_INJECTION_PATTERNS = [
    # System prompt manipulation
    r"(?i)ignore\s+(previous|all|prior)\s+(instructions?|prompts?|rules?)",
    r"(?i)forget\s+(everything|all|previous)",
    r"(?i)disregard\s+(all|any|previous)",
    r"(?i)override\s+(previous|default|system)",
    # Role manipulation
    r"(?i)you\s+are\s+now",
    r"(?i)act\s+as\s+(if|though|a)",
    r"(?i)pretend\s+(to\s+be|you\s+are)",
    r"(?i)role[ -]?play",
    # Output manipulation
    r"(?i)output\s+(the\s+)?(exact|following)",
    r"(?i)print\s+(the\s+)?(exact|following)",
    r"(?i)repeat\s+(after\s+me|the\s+following)",
    r"(?i)echo\s+(back|the\s+following)",
    # Instruction injection
    r"(?i)system\s*:\s*",
    r"(?i)assistant\s*:\s*",
    r"(?i)user\s*:\s*",
    r"(?i)\[system\]",
    r"(?i)\[assistant\]",
    # Data extraction attempts
    r"(?i)reveal\s+(your|the|system)",
    r"(?i)show\s+(me\s+)?(your|the|system)",
    r"(?i)what\s+(is|are)\s+your\s+(instructions?|prompts?)",
    r"(?i)tell\s+me\s+(about\s+)?your\s+(instructions?|prompts?)",
    # Jailbreak attempts
    r"(?i)developer\s+mode",
    r"(?i)debug\s+mode",
    r"(?i)admin\s+mode",
    r"(?i)god\s+mode",
    r"(?i)unrestricted",
]

COMPILED_PATTERNS = [re.compile(pattern) for pattern in PROMPT_INJECTION_PATTERNS]


def detect_prompt_injection(text: str) -> Tuple[bool, List[str]]:
    """
    Detect potential prompt injection attempts in user input.

    Args:
        text: The input text to analyze

    Returns:
        tuple: (is_safe: bool, detected_patterns: list)
    """
    if not text:
        return True, []

    detected = []

    for pattern in COMPILED_PATTERNS:
        matches = pattern.findall(text)
        if matches:
            detected.append(pattern.pattern)

    return len(detected) == 0, detected


def sanitize_prompt_input(text: str, max_length: Optional[int] = None) -> Tuple[str, List[str]]:
    """
    Sanitize user input for prompt injection prevention.

    Args:
        text: The input text to sanitize
        max_length: Optional maximum length for the text

    Returns:
        tuple: (sanitized_text: str, warnings: list)
    """
    warnings = []

    if not text:
        return text, warnings

    # Check for prompt injection
    is_safe, detected_patterns = detect_prompt_injection(text)
    if not is_safe:
        warnings.append(
            f"Potential prompt injection detected: {len(detected_patterns)} pattern(s) found"
        )
        request_id = getattr(g, "request_id", "N/A")
        logger.warning(
            f"Prompt injection attempt detected - Request ID: {request_id}, "
            f"Patterns: {detected_patterns[:3]}"
        )

    # Remove control characters (except newlines and tabs)
    sanitized = "".join(char for char in text if char.isprintable() or char in "\n\t\r")

    # Truncate if max_length specified
    if max_length and len(sanitized) > max_length:
        warnings.append(f"Text truncated from {len(sanitized)} to {max_length} characters")
        sanitized = sanitized[:max_length]

    return sanitized, warnings


def validate_input_length(
    input_str: Optional[str], max_length: int, field_name: str
) -> Tuple[bool, Optional[str]]:
    """
    Validate input string length.

    Args:
        input_str: Input string to validate
        max_length: Maximum allowed length
        field_name: Name of the field for error message

    Returns:
        Tuple of (is_valid, error_message)
    """
    if input_str is None:
        return False, f"{field_name} is required"

    if len(input_str) > max_length:
        return False, f"{field_name} exceeds maximum length of {max_length} characters"

    return True, None


def sanitize_error_message(error: Exception) -> str:
    """
    Sanitize error message to avoid exposing sensitive information.

    Args:
        error: Exception instance

    Returns:
        Sanitized error message
    """
    error_type = type(error).__name__

    error_mapping = {
        "AuthenticationError": "AI service authentication failed. Please check configuration.",
        "RateLimitError": "AI service rate limit exceeded. Please try again later.",
        "APIConnectionError": "Unable to connect to AI service. Please check network.",
        "APIStatusError": "AI service temporarily unavailable. Please try again later.",
        "Timeout": "Request timed out. Please try again.",
    }

    return error_mapping.get(error_type, "An internal error occurred. Please try again later.")


def ai_retry_decorator(func: Callable) -> Callable:
    """
    Custom retry decorator with better error handling and logging.

    Args:
        func: Function to wrap

    Returns:
        Wrapped function
    """

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(Exception),
        reraise=True,
    )
    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        try:
            logger.debug(f"Executing {func.__name__}")
            result = func(*args, **kwargs)
            logger.debug(f"Successfully completed {func.__name__}")
            return result
        except Exception as e:
            logger.error(f"Error in {func.__name__}: {type(e).__name__}")
            raise

    return wrapper


def create_chat_blueprint(chat_assistant: Optional[ChatAssistant] = None) -> Blueprint:
    """
    Create Flask blueprint for chat routes.

    Args:
        chat_assistant: Optional ChatAssistant instance (created from config if not provided)

    Returns:
        Flask Blueprint
    """
    config = get_config()

    # Initialize chat assistant if not provided
    if chat_assistant is None:
        api_key, base_url, model_name, proxy = config.get_ai_config_with_fallback()
        chat_assistant = ChatAssistant(
            api_key=api_key,
            base_url=base_url,
            proxy=proxy if proxy else None,
            model=model_name,
        )
        chat_assistant.set_role(DEFAULT_FORM_ROLE)

    chat_bp = Blueprint("chat", __name__)

    @chat_bp.route("/health", methods=["GET"])
    def health_check() -> Tuple[Response, int]:
        """
        Health check endpoint for monitoring and load balancer.

        Returns service status and configuration validation.
        """
        from datetime import datetime

        api_key, _, model_name, _ = config.get_ai_config_with_fallback()

        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "service": "ai-chat-server",
            "version": "1.0.0",
            "checks": {
                "api_configured": bool(api_key),
                "model": model_name,
                "debug_mode": config.flask.debug,
            },
        }

        # Return 503 if critical configuration is missing
        if not api_key:
            health_status["status"] = "degraded"
            health_status["checks"]["api_configured"] = False
            return jsonify(health_status), 503

        return jsonify(health_status), 200

    @chat_bp.route("/chat_remark", methods=["POST"])
    @require_auth()
    def ai_chat_remark_api() -> Tuple[Response, int]:
        """
        Backend API: Receive userInput, call AI remark interface and return response.

        Requires authentication via X-API-Key header or Bearer token.

        Request body (JSON or form-data):
            - userInput: User input text (required, max 10000 chars)
            - chatContext: Additional context (optional, max 50000 chars)

        Returns:
            JSON response with AI-generated test data
        """
        request_id = getattr(g, "request_id", "N/A")

        try:
            # Support both JSON and form-data requests
            if request.is_json:
                data = request.get_json()
                user_input = data.get("userInput")
                context = data.get("chatContext")
            else:
                user_input = request.form.get("userInput")
                context = request.form.get("chatContext")

            # Input validation
            is_valid, error_msg = validate_input_length(
                user_input, config.security.max_input_length, "userInput"
            )
            if not is_valid:
                logger.warning(f"[{request_id}] Input validation failed: {error_msg}")
                return jsonify(
                    {
                        "success": False,
                        "error": error_msg,
                        "code": "VALIDATION_ERROR",
                    }
                ), 400

            if not user_input or not user_input.strip():
                return jsonify(
                    {
                        "success": False,
                        "error": "userInput cannot be empty",
                        "code": "EMPTY_INPUT",
                    }
                ), 400

            # Sanitize input for prompt injection prevention
            sanitized_input, warnings = sanitize_prompt_input(
                user_input, config.security.max_input_length
            )
            if warnings:
                logger.info(f"[{request_id}] Input sanitization warnings: {warnings}")

            # Context validation (optional but if provided, validate length and sanitize)
            sanitized_context = None
            if context:
                is_valid, error_msg = validate_input_length(
                    context, config.security.max_context_length, "chatContext"
                )
                if not is_valid:
                    logger.warning(f"[{request_id}] Context validation failed: {error_msg}")
                    return jsonify(
                        {
                            "success": False,
                            "error": error_msg,
                            "code": "VALIDATION_ERROR",
                        }
                    ), 400

                sanitized_context, ctx_warnings = sanitize_prompt_input(
                    context, config.security.max_context_length
                )
                if ctx_warnings:
                    logger.info(
                        f"[{request_id}] Context sanitization warnings: {ctx_warnings}"
                    )

            # Process AI request with sanitized input
            if (
                sanitized_context
                and sanitized_context.strip()
                and sanitized_context != "null"
            ):
                append_role = {"role": "system", "content": sanitized_context}
                ai_response = _transfer_remark(chat_assistant, sanitized_input, append_role)
            else:
                ai_response = _transfer_remark(chat_assistant, sanitized_input)

            # Ensure response is in list format
            if isinstance(ai_response, str):
                ai_response_list = [ai_response]
            elif isinstance(ai_response, list):
                ai_response_list = ai_response
            else:
                ai_response_list = [str(ai_response)]

            logger.info(
                f"[{request_id}] Successfully processed AI request, "
                f"response length: {len(str(ai_response_list))}"
            )

            return jsonify(
                {
                    "success": True,
                    "data": {
                        "response": ai_response_list
                    },
                }
            )

        except Exception as e:
            logger.error(
                f"[{request_id}] Error processing AI request: {type(e).__name__}"
            )
            sanitized_error = sanitize_error_message(e)

            return jsonify(
                {
                    "success": False,
                    "error": sanitized_error,
                    "code": "AI_SERVICE_ERROR",
                }
            ), 500

    return chat_bp


@ai_retry_decorator
def _transfer_remark(
    chat_assistant: ChatAssistant,
    user_input: str,
    context: Optional[Dict[str, str]] = None,
) -> str:
    """
    Call AI assistant with retry logic.

    Args:
        chat_assistant: ChatAssistant instance
        user_input: User input text
        context: Optional context for the conversation

    Returns:
        AI assistant response
    """
    if context is not None:
        response = chat_assistant.chat_supplement(user_input, context)
    else:
        response = chat_assistant.chat_without_context(user_input)
    return response


__all__ = [
    "create_chat_blueprint",
    "detect_prompt_injection",
    "sanitize_prompt_input",
    "validate_input_length",
    "sanitize_error_message",
]