# -*- coding: utf-8 -*-
# -------------------------------
# @File: validators.py
# @Time: 2025/03/28
# @Author: cilang
# @Email: cilanguser@Gmail.com
# @Desc: Input validation and sanitization utilities
# -------------------------------
"""
Validators module for input validation and sanitization.

Provides:
- PromptValidator: For prompt injection detection and sanitization
- InputValidator: For general input validation
"""

from __future__ import annotations

import logging
import re
from typing import List, Optional, Tuple

from flask import g

logger = logging.getLogger(__name__)


class PromptValidator:
    """Validator for detecting and sanitizing prompt injection attempts."""

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

    def __init__(self) -> None:
        """Initialize the validator with compiled patterns."""
        self._compiled_patterns = [re.compile(pattern) for pattern in self.PROMPT_INJECTION_PATTERNS]

    def detect(self, text: str) -> Tuple[bool, List[str]]:
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

        for pattern in self._compiled_patterns:
            matches = pattern.findall(text)
            if matches:
                detected.append(pattern.pattern)

        return len(detected) == 0, detected

    def sanitize(self, text: str, max_length: Optional[int] = None) -> Tuple[str, List[str]]:
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
        is_safe, detected_patterns = self.detect(text)
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


class InputValidator:
    """Validator for general input validation."""

    # Error message mapping for sanitization
    ERROR_MAPPING = {
        "AuthenticationError": "AI service authentication failed. Please check configuration.",
        "RateLimitError": "AI service rate limit exceeded. Please try again later.",
        "APIConnectionError": "Unable to connect to AI service. Please check network.",
        "APIStatusError": "AI service temporarily unavailable. Please try again later.",
        "Timeout": "Request timed out. Please try again.",
    }

    def validate_length(
        self, input_str: Optional[str], max_length: int, field_name: str
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

    def sanitize_error_message(self, error: Exception) -> str:
        """
        Sanitize error message to avoid exposing sensitive information.

        Args:
            error: Exception instance

        Returns:
            Sanitized error message
        """
        error_type = type(error).__name__
        return self.ERROR_MAPPING.get(
            error_type, "An internal error occurred. Please try again later."
        )


# Create singleton instances for convenience
prompt_validator = PromptValidator()
input_validator = InputValidator()


__all__ = [
    "PromptValidator",
    "InputValidator",
    "prompt_validator",
    "input_validator",
]