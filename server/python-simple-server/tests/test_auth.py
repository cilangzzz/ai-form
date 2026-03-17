# -*- coding: utf-8 -*-
# -------------------------------
# @File: test_auth.py
# @Time: 2025/03/17
# @Author: api-tester
# @Desc: Authentication endpoint tests
# -------------------------------
"""
Comprehensive authentication tests covering:
- Token generation (username/password and API key)
- Token refresh
- Token validation
- Security testing (invalid tokens, expired tokens)
- Role-based access control
"""

from __future__ import annotations

import json
import os
import sys
from datetime import timedelta
from unittest.mock import patch

import pytest

# Add src directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from ai_form_server.auth import TokenManager, UserStore


# -------------------------------
# Test constants
# -------------------------------
TEST_JWT_SECRET = "test_jwt_secret_key_do_not_use_in_production_12345"
TEST_JWT_ALGORITHM = "HS256"


# -------------------------------
# Test Fixtures Override
# -------------------------------
@pytest.fixture(autouse=True)
def setup_test_users():
    """Set up test users before each test."""
    UserStore.reset()

    # Create test users
    UserStore.add_user(
        "testuser", "TestPassword123!", "user", "test_api_key_valid_12345678"
    )
    UserStore.add_user(
        "admin", "AdminPassword456!", "admin", "test_api_key_admin_87654321"
    )
    UserStore.add_user("inactive_user", "InactivePass789!", "user")
    UserStore._users["inactive_user"]["active"] = False

    yield

    # Cleanup
    UserStore.reset()


# -------------------------------
# Token Generation Tests
# -------------------------------
class TestTokenGeneration:
    """Tests for /auth/token endpoint."""

    @pytest.mark.auth
    def test_token_generation_success(self, client):
        """Test successful token generation with valid credentials."""
        response = client.post(
            "/auth/token", json={"username": "testuser", "password": "TestPassword123!"}
        )

        assert response.status_code == 200
        data = response.get_json()

        assert data["success"] is True
        assert "access_token" in data["data"]
        assert "refresh_token" in data["data"]
        assert data["data"]["token_type"] == "Bearer"
        assert "expires_in" in data["data"]

        # Verify token is valid
        payload, error = TokenManager.decode_token(
            data["data"]["access_token"],
            TEST_JWT_SECRET,
            TEST_JWT_ALGORITHM,
        )
        assert error is None
        assert payload["sub"] == "testuser"
        assert payload["role"] == "user"
        assert payload["type"] == "access"

    @pytest.mark.auth
    def test_token_generation_admin_user(self, client):
        """Test token generation for admin user has correct role."""
        response = client.post(
            "/auth/token", json={"username": "admin", "password": "AdminPassword456!"}
        )

        assert response.status_code == 200
        data = response.get_json()

        payload, _ = TokenManager.decode_token(
            data["data"]["access_token"], TEST_JWT_SECRET, TEST_JWT_ALGORITHM
        )
        assert payload["role"] == "admin"

    @pytest.mark.auth
    def test_token_generation_invalid_credentials(self, client):
        """Test token generation with invalid credentials returns 401."""
        response = client.post(
            "/auth/token",
            json={"username": "testuser", "password": "wrong_password"},
        )

        assert response.status_code == 401
        data = response.get_json()

        assert data["success"] is False
        assert data["code"] == "INVALID_CREDENTIALS"
        assert "access_token" not in data

    @pytest.mark.auth
    def test_token_generation_nonexistent_user(self, client):
        """Test token generation for non-existent user returns 401."""
        response = client.post(
            "/auth/token",
            json={"username": "nonexistent_user", "password": "any_password"},
        )

        assert response.status_code == 401
        data = response.get_json()

        assert data["success"] is False
        assert data["code"] == "INVALID_CREDENTIALS"

    @pytest.mark.auth
    def test_token_generation_missing_username(self, client):
        """Test token generation with missing username returns 400."""
        response = client.post("/auth/token", json={"password": "TestPassword123!"})

        assert response.status_code == 400
        data = response.get_json()

        assert data["success"] is False
        assert data["code"] == "MISSING_CREDENTIALS"

    @pytest.mark.auth
    def test_token_generation_missing_password(self, client):
        """Test token generation with missing password returns 400."""
        response = client.post("/auth/token", json={"username": "testuser"})

        assert response.status_code == 400
        data = response.get_json()

        assert data["success"] is False
        assert data["code"] == "MISSING_CREDENTIALS"

    @pytest.mark.auth
    def test_token_generation_inactive_user(self, client):
        """Test token generation for inactive user returns 403."""
        response = client.post(
            "/auth/token",
            json={"username": "inactive_user", "password": "InactivePass789!"},
        )

        assert response.status_code == 403
        data = response.get_json()

        assert data["success"] is False
        assert data["code"] == "ACCOUNT_DISABLED"

    @pytest.mark.auth
    def test_token_generation_form_data(self, client):
        """Test token generation with form data (not JSON)."""
        response = client.post(
            "/auth/token",
            data={"username": "testuser", "password": "TestPassword123!"},
            content_type="application/x-www-form-urlencoded",
        )

        assert response.status_code == 200
        data = response.get_json()

        assert data["success"] is True
        assert "access_token" in data["data"]


# -------------------------------
# API Key Authentication Tests
# -------------------------------
class TestAPIKeyAuthentication:
    """Tests for API key-based authentication."""

    @pytest.mark.auth
    def test_api_key_authentication_success(self, client):
        """Test successful token generation with valid API key."""
        response = client.post(
            "/auth/token", json={"api_key": "test_api_key_valid_12345678"}
        )

        assert response.status_code == 200
        data = response.get_json()

        assert data["success"] is True
        assert "access_token" in data["data"]

        payload, _ = TokenManager.decode_token(
            data["data"]["access_token"], TEST_JWT_SECRET, TEST_JWT_ALGORITHM
        )
        assert payload["sub"] == "testuser"

    @pytest.mark.auth
    def test_api_key_authentication_invalid(self, client):
        """Test token generation with invalid API key returns 401."""
        response = client.post("/auth/token", json={"api_key": "invalid_api_key"})

        assert response.status_code == 401
        data = response.get_json()

        assert data["success"] is False
        assert data["code"] == "INVALID_API_KEY"

    @pytest.mark.auth
    def test_api_key_authentication_admin_key(self, client):
        """Test API key authentication for admin user."""
        response = client.post(
            "/auth/token", json={"api_key": "test_api_key_admin_87654321"}
        )

        assert response.status_code == 200
        data = response.get_json()

        payload, _ = TokenManager.decode_token(
            data["data"]["access_token"], TEST_JWT_SECRET, TEST_JWT_ALGORITHM
        )
        assert payload["role"] == "admin"


# -------------------------------
# Token Refresh Tests
# -------------------------------
class TestTokenRefresh:
    """Tests for /auth/refresh endpoint."""

    @pytest.mark.auth
    def test_token_refresh_success(self, client, generate_refresh_token):
        """Test successful token refresh with valid refresh token."""
        refresh_token = generate_refresh_token(username="testuser", role="user")

        response = client.post("/auth/refresh", json={"refresh_token": refresh_token})

        assert response.status_code == 200
        data = response.get_json()

        assert data["success"] is True
        assert "access_token" in data["data"]

        # Verify new access token is valid
        payload, _ = TokenManager.decode_token(
            data["data"]["access_token"], TEST_JWT_SECRET, TEST_JWT_ALGORITHM
        )
        assert payload["sub"] == "testuser"
        assert payload["type"] == "access"

    @pytest.mark.auth
    def test_token_refresh_expired(self, client, generate_refresh_token):
        """Test token refresh with expired refresh token returns 401."""
        expired_refresh_token = generate_refresh_token(
            username="testuser", expires_delta=timedelta(seconds=-1)
        )

        response = client.post(
            "/auth/refresh", json={"refresh_token": expired_refresh_token}
        )

        assert response.status_code == 401
        data = response.get_json()

        assert data["success"] is False
        assert data["code"] == "INVALID_REFRESH_TOKEN"

    @pytest.mark.auth
    def test_token_refresh_with_access_token(self, client, generate_token):
        """Test token refresh with access token (wrong type) returns 401."""
        access_token = generate_token(username="testuser")

        response = client.post("/auth/refresh", json={"refresh_token": access_token})

        assert response.status_code == 401
        data = response.get_json()

        assert data["success"] is False
        assert data["code"] == "INVALID_TOKEN_TYPE"

    @pytest.mark.auth
    def test_token_refresh_missing_token(self, client):
        """Test token refresh without refresh token returns 400."""
        response = client.post("/auth/refresh", json={})

        assert response.status_code == 400
        data = response.get_json()

        assert data["success"] is False
        assert data["code"] == "MISSING_REFRESH_TOKEN"

    @pytest.mark.auth
    def test_token_refresh_invalid_token_format(self, client):
        """Test token refresh with malformed token returns 401."""
        response = client.post("/auth/refresh", json={"refresh_token": "not_a_valid_token"})

        assert response.status_code == 401
        data = response.get_json()

        assert data["success"] is False

    @pytest.mark.auth
    def test_token_refresh_deleted_user(self, client, generate_refresh_token):
        """Test token refresh for deleted user returns 401."""
        refresh_token = generate_refresh_token(username="deleted_user")

        response = client.post("/auth/refresh", json={"refresh_token": refresh_token})

        assert response.status_code == 401
        data = response.get_json()

        assert data["success"] is False
        assert data["code"] == "USER_NOT_FOUND"

    @pytest.mark.auth
    def test_token_refresh_inactive_user(self, client, generate_refresh_token):
        """Test token refresh for inactive user returns 403."""
        refresh_token = generate_refresh_token(username="inactive_user")

        response = client.post("/auth/refresh", json={"refresh_token": refresh_token})

        assert response.status_code == 403
        data = response.get_json()

        assert data["success"] is False
        assert data["code"] == "ACCOUNT_DISABLED"


# -------------------------------
# Token Validation Tests
# -------------------------------
class TestTokenValidation:
    """Tests for token validation."""

    @pytest.mark.auth
    def test_valid_token_decode(self, generate_token, test_jwt_secret):
        """Test decoding a valid JWT token."""
        token = generate_token()

        payload, error = TokenManager.decode_token(
            token, test_jwt_secret, TEST_JWT_ALGORITHM
        )

        assert error is None
        assert payload is not None
        assert payload["sub"] == "testuser"
        assert payload["type"] == "access"

    @pytest.mark.auth
    def test_expired_token_decode(self, generate_token):
        """Test decoding an expired JWT token."""
        expired_token = generate_token(expires_delta=timedelta(seconds=-1))

        payload, error = TokenManager.decode_token(
            expired_token, TEST_JWT_SECRET, TEST_JWT_ALGORITHM
        )

        assert payload is None
        assert error == "Token has expired"

    @pytest.mark.auth
    def test_invalid_token_decode(self):
        """Test decoding an invalid JWT token."""
        payload, error = TokenManager.decode_token(
            "invalid.token.here", TEST_JWT_SECRET, TEST_JWT_ALGORITHM
        )

        assert payload is None
        assert error == "Invalid token"


# -------------------------------
# Protected Endpoint Tests
# -------------------------------
class TestProtectedEndpoints:
    """Tests for protected endpoint access control."""

    @pytest.mark.auth
    def test_protected_endpoint_without_auth(self, client):
        """Test accessing protected endpoint without authentication returns 401."""
        response = client.post("/ai/chat_remark", json={"userInput": "test"})

        assert response.status_code == 401
        data = response.get_json()

        assert data["code"] == "AUTHENTICATION_REQUIRED"

    @pytest.mark.auth
    def test_protected_endpoint_with_valid_token(self, client, generate_token):
        """Test accessing protected endpoint with valid token returns 200."""
        token = generate_token()

        with patch("ai_form_server.routes.chat._transfer_remark") as mock_transfer:
            mock_transfer.return_value = "['test': 'data']"
            response = client.post(
                "/ai/chat_remark",
                json={"userInput": "test"},
                headers={"Authorization": f"Bearer {token}"},
            )

        assert response.status_code == 200

    @pytest.mark.auth
    def test_protected_endpoint_with_expired_token(self, client, generate_token):
        """Test accessing protected endpoint with expired token returns 401."""
        expired_token = generate_token(expires_delta=timedelta(seconds=-1))

        response = client.post(
            "/ai/chat_remark",
            json={"userInput": "test"},
            headers={"Authorization": f"Bearer {expired_token}"},
        )

        assert response.status_code == 401
        data = response.get_json()

        assert data["code"] == "AUTHENTICATION_ERROR"


# -------------------------------
# Security Tests
# -------------------------------
class TestSecurity:
    """Security-focused tests for authentication."""

    @pytest.mark.security
    def test_no_password_in_response(self, client):
        """Test password is never returned in response."""
        response = client.post(
            "/auth/token",
            json={"username": "testuser", "password": "TestPassword123!"},
        )

        assert response.status_code == 200
        data = response.get_json()

        # Verify no password in response
        response_str = json.dumps(data)
        assert "TestPassword123!" not in response_str

    @pytest.mark.security
    def test_token_tampering_detection(self, generate_token):
        """Test tampered token is detected and rejected."""
        token = generate_token()

        # Tamper with token (modify last character)
        tampered_token = token[:-1] + ("a" if token[-1] != "a" else "b")

        payload, error = TokenManager.decode_token(
            tampered_token, TEST_JWT_SECRET, TEST_JWT_ALGORITHM
        )

        assert payload is None
        assert error is not None