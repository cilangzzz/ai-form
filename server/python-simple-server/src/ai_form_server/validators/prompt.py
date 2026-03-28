# -*- coding: utf-8 -*-
# -------------------------------
# @File: prompt.py
# @Time: 2025/03/28
# @Author: cilang
# @Email: cilanguser@Gmail.com
# @Desc: Prompt injection detection and sanitization
# -------------------------------
"""
Prompt injection detection and sanitization utilities.

Provides the PromptValidator class for detecting and sanitizing
potentially malicious prompt injection attempts.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import List, Optional

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """
    Result of prompt injection detection.

    Attributes:
        is_safe: True if no injection patterns detected
        detected_patterns: List of patterns that matched
    """

    is_safe: bool
    detected_patterns: List[str] = field(default_factory=list)


@dataclass
class SanitizationResult:
    """
    Result of prompt input sanitization.

    Attributes:
        sanitized_text: The cleaned/sanitized text
        warnings: List of warning messages generated during sanitization
    """

    sanitized_text: str
    warnings: List[str] = field(default_factory=list)


class PatternsRegistry:
    """
    Registry of prompt injection patterns.

    Provides a centralized collection of regex patterns used to detect
    potential prompt injection attempts.
    """

    # System prompt manipulation patterns
    SYSTEM_MANIPULATION = [
        r"(?i)ignore\s+(previous|all|prior)\s+(instructions?|prompts?|rules?)",
        r"(?i)forget\s+(everything|all|previous)",
        r"(?i)disregard\s+(all|any|previous)",
        r"(?i)override\s+(previous|default|system)",
    ]

    # Role manipulation patterns
    ROLE_MANIPULATION = [
        r"(?i)you\s+are\s+now",
        r"(?i)act\s+as\s+(if|though|a)",
        r"(?i)pretend\s+(to\s+be|you\s+are)",
        r"(?i)role[ -]?play",
    ]

    # Output manipulation patterns
    OUTPUT_MANIPULATION = [
        r"(?i)output\s+(the\s+)?(exact|following)",
        r"(?i)print\s+(the\s+)?(exact|following)",
        r"(?i)repeat\s+(after\s+me|the\s+following)",
        r"(?i)echo\s+(back|the\s+following)",
    ]

    # Instruction injection patterns
    INSTRUCTION_INJECTION = [
        r"(?i)system\s*:\s*",
        r"(?i)assistant\s*:\s*",
        r"(?i)user\s*:\s*",
        r"(?i)\[system\]",
        r"(?i)\[assistant\]",
    ]

    # Data extraction patterns
    DATA_EXTRACTION = [
        r"(?i)reveal\s+(your|the|system)",
        r"(?i)show\s+(me\s+)?(your|the|system)",
        r"(?i)what\s+(is|are)\s+your\s+(instructions?|prompts?)",
        r"(?i)tell\s+me\s+(about\s+)?your\s+(instructions?|prompts?)",
    ]

    # Jailbreak attempt patterns
    JAILBREAK = [
        r"(?i)developer\s+mode",
        r"(?i)debug\s+mode",
        r"(?i)admin\s+mode",
        r"(?i)god\s+mode",
        r"(?i)unrestricted",
    ]

    @classmethod
    def get_all_patterns(cls) -> List[str]:
        """
        Get all prompt injection patterns as a flat list.

        Returns:
            List of all regex pattern strings
        """
        return (
            cls.SYSTEM_MANIPULATION
            + cls.ROLE_MANIPULATION
            + cls.OUTPUT_MANIPULATION
            + cls.INSTRUCTION_INJECTION
            + cls.DATA_EXTRACTION
            + cls.JAILBREAK
        )

    @classmethod
    def get_compiled_patterns(cls) -> List[re.Pattern]:
        """
        Get all patterns as compiled regex objects.

        Returns:
            List of compiled regex patterns
        """
        return [re.compile(pattern) for pattern in cls.get_all_patterns()]


class PromptValidator:
    """
    Validator for detecting and sanitizing prompt injection attempts.

    Provides methods to:
    - Detect potential prompt injection patterns in text
    - Sanitize text by removing control characters and truncating
    """

    def __init__(self) -> None:
        """Initialize the validator with compiled patterns."""
        self._compiled_patterns = PatternsRegistry.get_compiled_patterns()

    def detect(self, text: str) -> ValidationResult:
        """
        Detect potential prompt injection attempts in user input.

        Args:
            text: The input text to analyze

        Returns:
            ValidationResult with is_safe flag and list of detected patterns
        """
        if not text:
            return ValidationResult(is_safe=True, detected_patterns=[])

        detected: List[str] = []

        for pattern in self._compiled_patterns:
            matches = pattern.findall(text)
            if matches:
                detected.append(pattern.pattern)

        return ValidationResult(
            is_safe=len(detected) == 0,
            detected_patterns=detected,
        )

    def sanitize(
        self,
        text: str,
        max_length: Optional[int] = None,
    ) -> SanitizationResult:
        """
        Sanitize user input for prompt injection prevention.

        Performs:
        - Prompt injection detection with warning
        - Control character removal (preserves newlines, tabs, carriage returns)
        - Optional length truncation

        Args:
            text: The input text to sanitize
            max_length: Optional maximum length for the text

        Returns:
            SanitizationResult with sanitized text and warnings
        """
        warnings: List[str] = []

        if not text:
            return SanitizationResult(sanitized_text=text, warnings=warnings)

        # Check for prompt injection
        detection_result = self.detect(text)
        if not detection_result.is_safe:
            warnings.append(
                f"Potential prompt injection detected: "
                f"{len(detection_result.detected_patterns)} pattern(s) found"
            )
            logger.warning(
                f"Prompt injection attempt detected, "
                f"Patterns: {detection_result.detected_patterns[:3]}"
            )

        # Remove control characters (except newlines and tabs)
        sanitized = "".join(
            char for char in text if char.isprintable() or char in "\n\t\r"
        )

        # Truncate if max_length specified
        if max_length is not None and len(sanitized) > max_length:
            warnings.append(
                f"Text truncated from {len(sanitized)} to {max_length} characters"
            )
            sanitized = sanitized[:max_length]

        return SanitizationResult(sanitized_text=sanitized, warnings=warnings)


__all__ = [
    "ValidationResult",
    "SanitizationResult",
    "PatternsRegistry",
    "PromptValidator",
]