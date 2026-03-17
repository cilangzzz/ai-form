# -*- coding: utf-8 -*-
# -------------------------------
# @File: conftest.py
# @Time: 2025/03/17
# @Author: api-tester
# @Desc: Pytest fixtures for API testing
# -------------------------------
"""
Pytest configuration and fixtures for comprehensive API testing.

Provides:
- Flask application fixture
- Test client fixture
- Authentication fixtures (JWT tokens, API keys)
- Mock AI responses for chat endpoint
- Test database/data fixtures
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta, timezone
from typing import Dict
from unittest.mock import MagicMock

import pytest

# Add src directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

# -------------------------------
# Test Configuration
# -------------------------------
# Test JWT Secret (MUST be different from production!)
TEST_JWT_SECRET = "test_jwt_secret_key_do_not_use_in_production_12345"
TEST_JWT_ALGORITHM = "HS256"
TEST_JWT_EXPIRATION_MINUTES = 30
TEST_JWT_REFRESH_EXPIRATION_DAYS = 7

# Test API Keys
TEST_API_KEYS = {
    "valid_key": "test_api_key_valid_12345678",
    "admin_key": "test_api_key_admin_87654321",
    "expired_key": "test_api_key_expired_11111111",
    "invalid_key": "invalid_key_format",
}

# Test User Credentials
TEST_USERS = {
    "valid_user": {
        "username": "testuser",
        "password": "TestPassword123!",
        "role": "user",
    },
    "admin_user": {
        "username": "admin",
        "password": "AdminPassword456!",
        "role": "admin",
    },
    "invalid_user": {"username": "invalid", "password": "wrong_password"},
}


# -------------------------------
# Mock AI Responses
# -------------------------------
MOCK_AI_RESPONSES = {
    "success": {
        "success": True,
        "data": {"response": ["['username': 'testUser123', 'password': 'A1b@cD9eF']"]},
    },
    "empty_response": {"success": True, "data": {"response": []}},
    "error_response": {
        "success": False,
        "error": "AI service error",
        "code": "AI_SERVICE_ERROR",
    },
}


# -------------------------------
# Pytest Configuration
# -------------------------------
def pytest_configure(config):
    """Configure pytest markers."""
    config.addinivalue_line("markers", "auth: Authentication tests")
    config.addinivalue_line("markers", "security: Security validation tests")
    config.addinivalue_line("markers", "performance: Performance tests")
    config.addinivalue_line("markers", "integration: Integration tests")


# -------------------------------
# Application Fixtures
# -------------------------------
@pytest.fixture
def app():
    """Create and configure Flask application for testing."""
    # Set test environment variables
    os.environ["TESTING"] = "true"
    os.environ["JWT_SECRET_KEY"] = TEST_JWT_SECRET
    os.environ["JWT_ALGORITHM"] = TEST_JWT_ALGORITHM
    os.environ["FLASK_DEBUG"] = "false"
    os.environ["AI_API_KEY"] = "test_api_key_for_testing"
    os.environ["AI_BASE_URL"] = "https://test.api.url"
    os.environ["AI_MODEL_NAME"] = "test-model"

    # Import after environment variables are set
    from ai_form_server import create_app
    from ai_form_server.config import init_config, Config, SecurityConfig, FlaskConfig

    # Create test configuration
    config = Config(
        flask=FlaskConfig(testing=True, debug=False),
        security=SecurityConfig(
            jwt_secret_key=TEST_JWT_SECRET,
            jwt_algorithm=TEST_JWT_ALGORITHM,
        ),
    )
    init_config(config)

    flask_app = create_app(config)

    yield flask_app


@pytest.fixture
def client(app):
    """Create test client for the Flask application."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create test CLI runner for the Flask application."""
    return app.test_cli_runner()


# -------------------------------
# Authentication Fixtures
# -------------------------------
@pytest.fixture
def test_jwt_secret():
    """Provide test JWT secret key."""
    return TEST_JWT_SECRET


@pytest.fixture
def test_api_keys():
    """Provide test API keys."""
    return TEST_API_KEYS.copy()


@pytest.fixture
def test_users():
    """Provide test user credentials."""
    return {k: v.copy() for k, v in TEST_USERS.items()}


@pytest.fixture
def valid_user_credentials(test_users):
    """Provide valid user credentials for authentication."""
    return test_users["valid_user"]


@pytest.fixture
def admin_user_credentials(test_users):
    """Provide admin user credentials for authentication."""
    return test_users["admin_user"]


# -------------------------------
# JWT Token Fixtures
# -------------------------------
@pytest.fixture
def generate_token():
    """Factory fixture to generate JWT tokens with custom claims."""
    import jwt

    def _generate_token(
        username: str = "testuser",
        role: str = "user",
        expires_delta: timedelta = None,
        secret: str = TEST_JWT_SECRET,
    ) -> str:
        """Generate a JWT token with specified parameters."""
        if expires_delta is None:
            expires_delta = timedelta(minutes=TEST_JWT_EXPIRATION_MINUTES)

        now = datetime.now(timezone.utc)
        payload = {
            "sub": username,
            "role": role,
            "iat": now,
            "exp": now + expires_delta,
            "type": "access",
        }
        return jwt.encode(payload, secret, algorithm=TEST_JWT_ALGORITHM)

    return _generate_token


@pytest.fixture
def generate_refresh_token():
    """Factory fixture to generate refresh tokens."""
    import jwt

    def _generate_refresh_token(
        username: str = "testuser",
        role: str = "user",
        expires_delta: timedelta = None,
        secret: str = TEST_JWT_SECRET,
    ) -> str:
        """Generate a refresh token with specified parameters."""
        if expires_delta is None:
            expires_delta = timedelta(days=TEST_JWT_REFRESH_EXPIRATION_DAYS)

        now = datetime.now(timezone.utc)
        payload = {
            "sub": username,
            "role": role,
            "iat": now,
            "exp": now + expires_delta,
            "type": "refresh",
        }
        return jwt.encode(payload, secret, algorithm=TEST_JWT_ALGORITHM)

    return _generate_refresh_token


@pytest.fixture
def valid_access_token(generate_token):
    """Provide a valid access token."""
    return generate_token()


@pytest.fixture
def valid_refresh_token(generate_refresh_token):
    """Provide a valid refresh token."""
    return generate_refresh_token()


@pytest.fixture
def expired_access_token(generate_token):
    """Provide an expired access token."""
    return generate_token(expires_delta=timedelta(seconds=-1))


@pytest.fixture
def expired_refresh_token(generate_refresh_token):
    """Provide an expired refresh token."""
    return generate_refresh_token(expires_delta=timedelta(seconds=-1))


# -------------------------------
# Mock Fixtures
# -------------------------------
@pytest.fixture
def mock_ai_response():
    """Provide mock AI response for chat endpoint tests."""
    return MOCK_AI_RESPONSES["success"].copy()


@pytest.fixture
def mock_chat_assistant():
    """Mock ChatAssistant for testing without actual AI calls."""
    mock = MagicMock()
    mock.chat_without_context.return_value = (
        "['username': 'testUser123', 'password': 'A1b@cD9eF']"
    )
    mock.chat_supplement.return_value = (
        "['username': 'testUser123', 'password': 'A1b@cD9eF']"
    )
    return mock


@pytest.fixture
def mock_openai_client():
    """Mock OpenAI client for testing."""
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "Mock AI response"
    mock_client.chat.completions.create.return_value = mock_response
    return mock_client


# -------------------------------
# Request Helpers
# -------------------------------
@pytest.fixture
def auth_headers():
    """Factory fixture to create authorization headers."""

    def _create_auth_headers(token: str, token_type: str = "Bearer") -> Dict[str, str]:
        return {
            "Authorization": f"{token_type} {token}",
            "Content-Type": "application/json",
        }

    return _create_auth_headers


@pytest.fixture
def api_key_headers():
    """Factory fixture to create API key headers."""

    def _create_api_key_headers(api_key: str) -> Dict[str, str]:
        return {"X-API-Key": api_key, "Content-Type": "application/json"}

    return _create_api_key_headers


# -------------------------------
# Test Data Fixtures
# -------------------------------
@pytest.fixture
def sample_chat_request():
    """Provide sample chat request data."""
    return {"userInput": "Generate test data for username field", "chatContext": None}


@pytest.fixture
def sample_chat_request_with_context():
    """Provide sample chat request with context."""
    return {
        "userInput": "Generate test data for email field",
        "chatContext": "Email field: text input, required, valid email format",
    }


@pytest.fixture
def invalid_chat_requests():
    """Provide various invalid chat request payloads for testing."""
    return [
        # Empty input
        {"userInput": ""},
        # Missing userInput
        {"chatContext": "some context"},
        # Input too long
        {"userInput": "a" * 10001},
        # Context too long
        {"userInput": "test", "chatContext": "a" * 50001},
        # Empty dict
        {},
    ]


# -------------------------------
# Performance Test Fixtures
# -------------------------------
@pytest.fixture
def performance_test_config():
    """Configuration for performance tests."""
    return {
        "concurrent_requests": 50,
        "max_response_time_ms": 200,
        "min_success_rate": 0.99,
        "timeout_seconds": 30,
    }


# -------------------------------
# Cleanup Fixtures
# -------------------------------
@pytest.fixture(autouse=True)
def cleanup_environment():
    """Clean up environment variables after each test."""
    original_env = os.environ.copy()
    yield
    # Restore original environment
    for key in list(os.environ.keys()):
        if key not in original_env:
            del os.environ[key]
    os.environ.update(original_env)


@pytest.fixture(autouse=True)
def reset_user_store():
    """Reset UserStore before and after each test."""
    from ai_form_server.auth.jwt_handler import UserStore

    UserStore.reset()
    yield
    UserStore.reset()