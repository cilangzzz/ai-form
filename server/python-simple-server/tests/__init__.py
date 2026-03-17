# -*- coding: utf-8 -*-
# -------------------------------
# @File: __init__.py
# @Time: 2025/03/17
# @Author: api-tester
# @Desc: Test package initialization
# -------------------------------
"""
AI-Form API Test Suite

This package contains comprehensive tests for:
- Authentication endpoints (/auth/token, /auth/refresh)
- Protected API endpoints (/ai/chat_remark)
- Security validation
- Performance testing

Test Structure:
    tests/
    ├── __init__.py          # This file
    ├── conftest.py          # Pytest fixtures
    ├── test_auth.py         # Authentication tests
    ├── test_api.py          # API endpoint tests
    ├── unit/                # Unit tests (future)
    └── integration/         # Integration tests (future)

Running Tests:
    # Run all tests
    pytest

    # Run with coverage
    pytest --cov=ai_form_server --cov-report=html

    # Run specific test markers
    pytest -m auth
    pytest -m security
    pytest -m integration
"""

__version__ = "1.0.0"
__author__ = "api-tester"