# -*- coding: utf-8 -*-
# -------------------------------
# @File: __init__.py
# @Time: 2025/03/17
# @Author: cilang
# @Email: cilanguser@Gmail.com
# @Desc: Routes package initialization
# -------------------------------
"""
AI-Form Server Routes Package.

This package contains API route blueprints:
- Chat routes: AI chat endpoints for form data generation
"""

from ai_form_server.routes.chat import (
    create_chat_blueprint,
    detect_prompt_injection,
    sanitize_error_message,
    sanitize_prompt_input,
    validate_input_length,
)

__all__ = [
    "create_chat_blueprint",
    "detect_prompt_injection",
    "sanitize_prompt_input",
    "validate_input_length",
    "sanitize_error_message",
]