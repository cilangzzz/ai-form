# -*- coding: utf-8 -*-
# -------------------------------
# @File: __init__.py
# @Time: 2025/03/17
# @Author: cilang
# @Email: cilanguser@Gmail.com
# @Desc: Services package initialization
# -------------------------------
"""
AI-Form Server Services Package.

This package contains business logic services:
- ChatAssistant: AI chat service for OpenAI-compatible APIs
- Roles: Predefined AI role configurations
"""

from ai_form_server.services.chat import ChatAssistant, create_chat_assistant
from ai_form_server.services.roles import (
    DEFAULT_FORM_ROLE,
    PROMPT_GENERATION_ROLE,
    SYSTEM_CODER_ROLE,
    SYSTEM_MD_GENERATE_ROLE,
    SYSTEM_PROMPT_GENERATION_ROLE,
    SYSTEM_PROMPT_GENERATION_ROLE_FORMAT_BASE,
    SYSTEM_WORKER_LOGGER_ROLE,
    get_role,
)

__all__ = [
    # Chat service
    "ChatAssistant",
    "create_chat_assistant",
    # Roles
    "DEFAULT_FORM_ROLE",
    "SYSTEM_CODER_ROLE",
    "SYSTEM_MD_GENERATE_ROLE",
    "SYSTEM_WORKER_LOGGER_ROLE",
    "SYSTEM_PROMPT_GENERATION_ROLE_FORMAT_BASE",
    "SYSTEM_PROMPT_GENERATION_ROLE",
    "PROMPT_GENERATION_ROLE",
    "get_role",
]