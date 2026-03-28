# -*- coding: utf-8 -*-
# -------------------------------
# @File: input.py
# @Time: 2025/03/28
# @Author: cilang
# @Email: cilanguser@Gmail.com
# @Desc: Input validation utilities
# -------------------------------
"""
Input validation utilities.

Provides the InputValidator class for validating input length
and sanitizing error messages.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class LengthValidationResult:
    """
    Result of length validation.

    Attributes:
        is_valid: True if validation passed
        error_message: Error message if validation failed, None otherwise
    """

    is_valid: bool
    error_message: Optional[str] = None


class InputValidator:
    """
    Validator for input strings.

    Provides methods to:
    - Validate input string length
    - Sanitize error messages to avoid exposing sensitive information
    """

    # Error message mapping for known exception types
    ERROR_MAPPING = {
        "AuthenticationError": "AI service authentication failed. Please check configuration.",
        "RateLimitError": "AI service rate limit exceeded. Please try again later.",
        "APIConnectionError": "Unable to connect to AI service. Please check network.",
        "APIStatusError": "AI service temporarily unavailable. Please try again later.",
        "Timeout": "Request timed out. Please try again.",
    }

    # Default sanitized error message
    DEFAULT_ERROR_MESSAGE = "An internal error occurred. Please try again later."

    @classmethod
    def validate_length(
        cls,
        input_str: Optional[str],
        max_length: int,
        field_name: str,
    ) -> LengthValidationResult:
        """
        Validate input string length.

        Args:
            input_str: Input string to validate
            max_length: Maximum allowed length
            field_name: Name of the field for error message

        Returns:
            LengthValidationResult with is_valid flag and optional error message
        """
        if input_str is None:
            return LengthValidationResult(
                is_valid=False,
                error_message=f"{field_name} is required",
            )

        if len(input_str) > max_length:
            return LengthValidationResult(
                is_valid=False,
                error_message=f"{field_name} exceeds maximum length of {max_length} characters",
            )

        return LengthValidationResult(is_valid=True)

    @classmethod
    def sanitize_error_message(cls, error: Exception) -> str:
        """
        Sanitize error message to avoid exposing sensitive information.

        Maps known exception types to user-friendly messages,
        returns a generic message for unknown exceptions.

        Args:
            error: Exception instance

        Returns:
            Sanitized error message safe for user display
        """
        error_type = type(error).__name__
        return cls.ERROR_MAPPING.get(error_type, cls.DEFAULT_ERROR_MESSAGE)


__all__ = [
    "LengthValidationResult",
    "InputValidator",
]