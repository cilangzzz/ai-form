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

import json
import logging
from functools import wraps
from typing import Any, Callable, Dict, Optional, Tuple

from flask import Blueprint, Response, g, jsonify, request
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from ai_form_server.auth.decorators import require_auth
from ai_form_server.config import get_config
from ai_form_server.services.chat import ChatAssistant
from ai_form_server.services.roles import (
    DEFAULT_FORM_ROLE,
    get_role_by_type,
    validate_role_type,
)
from ai_form_server.validators import PromptValidator, InputValidator
from ai_form_server.validators.schema import get_schema_validator

logger = logging.getLogger(__name__)

# Initialize validators
prompt_validator = PromptValidator()


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
            - formMetadata: Form metadata object (optional)
            - generationOptions: Generation options (optional)
            - aiOptions: AI options including roleType (optional)

        Returns:
            JSON response with AI-generated test data
        """
        request_id = getattr(g, "request_id", "N/A")

        try:
            # Support both JSON and form-data requests with extended parameters
            if request.is_json:
                data = request.get_json()
                user_input = data.get("userInput")
                context = data.get("chatContext")
                form_metadata = data.get("formMetadata")
                generation_options = data.get("generationOptions", {})
                ai_options = data.get("aiOptions", {})
            else:
                user_input = request.form.get("userInput")
                context = request.form.get("chatContext")
                # Parse extended parameters from form data
                form_metadata_str = request.form.get("formMetadata")
                form_metadata = json.loads(form_metadata_str) if form_metadata_str else None
                generation_options_str = request.form.get("generationOptions")
                generation_options = json.loads(generation_options_str) if generation_options_str else {}
                ai_options_str = request.form.get("aiOptions")
                ai_options = json.loads(ai_options_str) if ai_options_str else {}

            # Backward compatibility: if userInput is empty but formMetadata exists,
            # generate userInput from formMetadata
            if (not user_input or not user_input.strip()) and form_metadata:
                user_input = "Generate test data for the form"
                logger.info(f"[{request_id}] Generated default userInput from formMetadata")

            # Build data dict for schema validation
            data = {
                "userInput": user_input,
                "chatContext": context,
                "formMetadata": form_metadata,
                "generationOptions": generation_options,
                "aiOptions": ai_options,
            }

            # Schema validation (if enabled)
            if config.request_params.validate_schema:
                schema_validator = get_schema_validator()
                validation_result = schema_validator.validate_request(data)
                if not validation_result.is_valid:
                    logger.warning(f"[{request_id}] Schema validation failed: {validation_result.errors}")
                    return jsonify({
                        "success": False,
                        "error": validation_result.errors,
                        "code": "SCHEMA_VALIDATION_ERROR",
                    }), 400
                # Apply defaults
                data = schema_validator.apply_defaults(data)
                user_input = data.get("userInput", user_input)
                generation_options = data.get("generationOptions", {})
                ai_options = data.get("aiOptions", {})

            # Extract role type and validate
            role_type = ai_options.get("roleType", config.ai_options.default_role_type)
            if not validate_role_type(role_type, config.ai_options.allowed_role_types):
                logger.warning(f"[{request_id}] Invalid role type: {role_type}")
                return jsonify({
                    "success": False,
                    "error": f"Invalid role type '{role_type}'. Allowed: {config.ai_options.allowed_role_types}",
                    "code": "INVALID_ROLE_TYPE",
                }), 400

            # Set role based on roleType
            role_def = get_role_by_type(role_type)
            chat_assistant.set_role(role_def["role"])

            # Input validation
            length_result = InputValidator.validate_length(
                user_input, config.security.max_input_length, "userInput"
            )
            if not length_result.is_valid:
                logger.warning(f"[{request_id}] Input validation failed: {length_result.error_message}")
                return jsonify(
                    {
                        "success": False,
                        "error": length_result.error_message,
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
            sanitize_result = prompt_validator.sanitize(
                user_input, config.security.max_input_length
            )
            sanitized_input = sanitize_result.sanitized_text
            if sanitize_result.warnings:
                logger.info(f"[{request_id}] Input sanitization warnings: {sanitize_result.warnings}")

            # Context validation (optional but if provided, validate length and sanitize)
            sanitized_context = None
            if context:
                ctx_length_result = InputValidator.validate_length(
                    context, config.security.max_context_length, "chatContext"
                )
                if not ctx_length_result.is_valid:
                    logger.warning(f"[{request_id}] Context validation failed: {ctx_length_result.error_message}")
                    return jsonify(
                        {
                            "success": False,
                            "error": ctx_length_result.error_message,
                            "code": "VALIDATION_ERROR",
                        }
                    ), 400

                ctx_sanitize_result = prompt_validator.sanitize(
                    context, config.security.max_context_length
                )
                sanitized_context = ctx_sanitize_result.sanitized_text
                if ctx_sanitize_result.warnings:
                    logger.info(
                        f"[{request_id}] Context sanitization warnings: {ctx_sanitize_result.warnings}"
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
            sanitized_error = InputValidator.sanitize_error_message(e)

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
    "prompt_validator",
]