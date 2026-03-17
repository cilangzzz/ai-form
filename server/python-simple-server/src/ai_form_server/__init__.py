# -*- coding: utf-8 -*-
# -------------------------------
# @File: __init__.py
# @Time: 2025/03/17
# @Author: cilang
# @Email: cilanguser@Gmail.com
# @Desc: AI-Form Server package initialization
# -------------------------------
"""
AI-Form Server - AI-powered form data generation backend.

This package provides a Flask-based REST API for generating test data
using AI (OpenAI-compatible APIs).

Quick Start:
    # Run as module
    python -m ai_form_server

    # Or use the application factory
    from ai_form_server import create_app
    app = create_app()
    app.run()

Features:
    - AI-powered test data generation for forms
    - JWT and API key authentication
    - Rate limiting
    - Security headers and prompt injection detection
    - Configurable AI providers (DeepSeek, Qwen, OpenAI)

Modules:
    - app: Flask application factory
    - config: Configuration management
    - auth: Authentication (JWT, API keys)
    - services: Business logic (ChatAssistant, Roles)
    - routes: API endpoints
"""

from __future__ import annotations

__version__ = "1.0.0"
__author__ = "cilang"
__email__ = "cilanguser@Gmail.com"

# Import main components for easy access
from ai_form_server.app import create_app
from ai_form_server.config import (
    AIConfig,
    CORSConfig,
    Config,
    FlaskConfig,
    RateLimitConfig,
    SecurityConfig,
    get_config,
    init_config,
)
from ai_form_server.services import (
    ChatAssistant,
    DEFAULT_FORM_ROLE,
    create_chat_assistant,
)

__all__ = [
    # Version info
    "__version__",
    "__author__",
    "__email__",
    # Application
    "create_app",
    # Configuration
    "Config",
    "FlaskConfig",
    "AIConfig",
    "SecurityConfig",
    "RateLimitConfig",
    "CORSConfig",
    "get_config",
    "init_config",
    # Services
    "ChatAssistant",
    "create_chat_assistant",
    "DEFAULT_FORM_ROLE",
]