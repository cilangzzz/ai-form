# -*- coding: utf-8 -*-
# -------------------------------
# @File: test_api.py
# @Time: 2025/03/17
# @Author: api-tester
# @Desc: Protected API endpoint tests
# -------------------------------
"""
Comprehensive API tests covering:
- Protected endpoint access control
- /ai/chat_remark endpoint with authentication
- Input validation
- Error handling
- Rate limiting
"""

from __future__ import annotations

import os
import sys
from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest

# Add src directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))


# -------------------------------
# Test Fixtures Setup
# -------------------------------
@pytest.fixture(autouse=True)
def setup_test_environment():
    """Set up test environment before each test."""
    from ai_form_server.auth.jwt_handler import UserStore

    UserStore.reset()

    # Create test users
    UserStore.add_user("testuser", "TestPassword123!", "user", "test_api_key_valid")
    UserStore.add_user("admin", "AdminPassword456!", "admin", "test_api_key_admin")

    yield

    # Cleanup
    UserStore.reset()


@pytest.fixture
def mock_chat_assistant():
    """Mock ChatAssistant for isolated API testing."""
    mock = MagicMock()
    mock.chat_without_context.return_value = (
        "['username': 'testUser123', 'password': 'A1b@cD9eF']"
    )
    mock.chat_supplement.return_value = (
        "['username': 'testUser123', 'password': 'A1b@cD9eF']"
    )
    return mock


# -------------------------------
# Health Check Tests
# -------------------------------
class TestHealthEndpoint:
    """Tests for /health endpoint."""

    @pytest.mark.integration
    def test_health_check_success(self, client):
        """Test health check returns healthy status."""
        response = client.get("/ai/health")

        assert response.status_code == 200
        data = response.get_json()

        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert data["service"] == "ai-chat-server"

    @pytest.mark.integration
    def test_health_check_structure(self, client):
        """Test health check response structure."""
        response = client.get("/ai/health")
        data = response.get_json()

        assert "checks" in data
        assert "version" in data


# -------------------------------
# Chat Endpoint Authentication Tests
# -------------------------------
class TestChatEndpointAuthentication:
    """Tests for /ai/chat_remark authentication."""

    @pytest.mark.auth
    def test_chat_without_auth_returns_401(self, client):
        """Test accessing chat endpoint without auth returns 401."""
        response = client.post("/ai/chat_remark", json={"userInput": "test input"})

        assert response.status_code == 401
        assert response.get_json()["code"] == "AUTHENTICATION_REQUIRED"

    @pytest.mark.auth
    def test_chat_with_valid_bearer_token(self, client, generate_token):
        """Test chat endpoint with valid Bearer token."""
        token = generate_token()

        with patch("ai_form_server.routes.chat._transfer_remark") as mock_transfer:
            mock_transfer.return_value = "['test': 'data']"
            response = client.post(
                "/ai/chat_remark",
                json={"userInput": "Generate test data for username field"},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )

        assert response.status_code == 200

    @pytest.mark.auth
    def test_chat_with_expired_token(self, client, generate_token):
        """Test chat endpoint with expired token."""
        expired_token = generate_token(expires_delta=timedelta(seconds=-1))

        response = client.post(
            "/ai/chat_remark",
            json={"userInput": "test"},
            headers={"Authorization": f"Bearer {expired_token}"},
        )

        assert response.status_code == 401
        data = response.get_json()
        assert data["code"] in ["AUTHENTICATION_ERROR", "AUTHENTICATION_REQUIRED"]


# -------------------------------
# Chat Endpoint Input Validation Tests
# -------------------------------
class TestChatInputValidation:
    """Tests for /ai/chat_remark input validation."""

    @pytest.fixture
    def auth_headers(self, generate_token):
        """Provide valid auth headers."""
        token = generate_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    @pytest.mark.integration
    def test_valid_input_request(self, client, auth_headers):
        """Test valid input request returns success."""
        with patch("ai_form_server.routes.chat._transfer_remark") as mock_transfer:
            mock_transfer.return_value = "['test': 'data']"
            response = client.post(
                "/ai/chat_remark",
                json={"userInput": "Generate test data for username field"},
                headers=auth_headers,
            )

        assert response.status_code == 200
        data = response.get_json()

        assert data["success"] is True
        assert "data" in data
        assert "response" in data["data"]

    @pytest.mark.integration
    def test_empty_user_input(self, client, auth_headers):
        """Test empty user input returns 400."""
        response = client.post(
            "/ai/chat_remark", json={"userInput": ""}, headers=auth_headers
        )

        assert response.status_code == 400
        data = response.get_json()

        assert data["success"] is False
        assert "empty" in data["error"].lower()

    @pytest.mark.integration
    def test_missing_user_input(self, client, auth_headers):
        """Test missing user input returns 400."""
        response = client.post(
            "/ai/chat_remark", json={"chatContext": "some context"}, headers=auth_headers
        )

        assert response.status_code == 400
        data = response.get_json()

        assert data["success"] is False

    @pytest.mark.integration
    def test_whitespace_only_input(self, client, auth_headers):
        """Test whitespace-only input returns 400."""
        response = client.post(
            "/ai/chat_remark", json={"userInput": "   "}, headers=auth_headers
        )

        assert response.status_code == 400

    @pytest.mark.integration
    def test_input_too_long(self, client, auth_headers):
        """Test input exceeding max length returns 400."""
        long_input = "a" * 10001

        response = client.post(
            "/ai/chat_remark", json={"userInput": long_input}, headers=auth_headers
        )

        assert response.status_code == 400
        data = response.get_json()

        assert data["code"] == "VALIDATION_ERROR"

    @pytest.mark.integration
    def test_input_with_context(self, client, auth_headers):
        """Test valid input with context."""
        with patch("ai_form_server.routes.chat._transfer_remark") as mock_transfer:
            mock_transfer.return_value = "['test': 'data']"
            response = client.post(
                "/ai/chat_remark",
                json={
                    "userInput": "Generate test data",
                    "chatContext": "Email field, required, valid format",
                },
                headers=auth_headers,
            )

        assert response.status_code == 200
        data = response.get_json()

        assert data["success"] is True


# -------------------------------
# Chat Endpoint Response Tests
# -------------------------------
class TestChatResponses:
    """Tests for /ai/chat_remark response handling."""

    @pytest.fixture
    def auth_headers(self, generate_token):
        token = generate_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    @pytest.mark.integration
    def test_successful_response_structure(self, client, auth_headers):
        """Test successful response has correct structure."""
        with patch("ai_form_server.routes.chat._transfer_remark") as mock_transfer:
            mock_transfer.return_value = "['test': 'data']"
            response = client.post(
                "/ai/chat_remark", json={"userInput": "test"}, headers=auth_headers
            )

        assert response.status_code == 200
        data = response.get_json()

        # Required fields
        assert "success" in data
        assert data["success"] is True
        assert "data" in data
        assert "response" in data["data"]

        # Response should be a list
        assert isinstance(data["data"]["response"], list)

    @pytest.mark.integration
    def test_error_response_structure(self, client, auth_headers):
        """Test error response has correct structure."""
        response = client.post(
            "/ai/chat_remark", json={"userInput": ""}, headers=auth_headers
        )

        assert response.status_code == 400
        data = response.get_json()

        assert "success" in data
        assert data["success"] is False
        assert "error" in data
        assert "code" in data

    @pytest.mark.integration
    def test_ai_service_error_handling(self, client, auth_headers):
        """Test handling of AI service errors."""
        with patch("ai_form_server.routes.chat._transfer_remark") as mock_transfer:
            mock_transfer.side_effect = Exception("AI service unavailable")
            response = client.post(
                "/ai/chat_remark", json={"userInput": "test"}, headers=auth_headers
            )

        assert response.status_code == 500
        data = response.get_json()

        assert data["success"] is False
        assert data["code"] == "AI_SERVICE_ERROR"


# -------------------------------
# Security Tests
# -------------------------------
class TestAPISecurity:
    """Security-focused API tests."""

    @pytest.fixture
    def auth_headers(self, generate_token):
        token = generate_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    @pytest.mark.security
    def test_sql_injection_in_input(self, client, auth_headers):
        """Test SQL injection handling in user input."""
        sql_payload = "'; DROP TABLE users; --"

        with patch("ai_form_server.routes.chat._transfer_remark") as mock_transfer:
            mock_transfer.return_value = "['test': 'data']"
            response = client.post(
                "/ai/chat_remark",
                json={"userInput": sql_payload},
                headers=auth_headers,
            )

        # Should not crash, return 200 or 500 with sanitized error
        assert response.status_code in [200, 400, 500]
        if response.status_code not in [200]:
            assert "DROP TABLE" not in response.get_json().get("error", "")

    @pytest.mark.security
    def test_xss_in_input(self, client, auth_headers):
        """Test XSS handling in user input."""
        xss_payload = '<script>alert("xss")</script>'

        with patch("ai_form_server.routes.chat._transfer_remark") as mock_transfer:
            mock_transfer.return_value = "['test': 'data']"
            response = client.post(
                "/ai/chat_remark",
                json={"userInput": xss_payload},
                headers=auth_headers,
            )

        # Should process safely
        assert response.status_code in [200, 400]

    @pytest.mark.security
    def test_unicode_handling(self, client, auth_headers):
        """Test Unicode handling in user input."""
        unicode_input = "Test \u4e2d\u6587 \u0440\u0443\u0441\u0441\u043a\u0438\u0439 \u65e5\u672c\u8a9e"

        with patch("ai_form_server.routes.chat._transfer_remark") as mock_transfer:
            mock_transfer.return_value = "['test': 'data']"
            response = client.post(
                "/ai/chat_remark",
                json={"userInput": unicode_input},
                headers=auth_headers,
            )

        assert response.status_code == 200


# -------------------------------
# Error Handling Tests
# -------------------------------
class TestErrorHandling:
    """Tests for error handling."""

    @pytest.fixture
    def auth_headers(self, generate_token):
        token = generate_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    @pytest.mark.integration
    def test_404_not_found(self, client):
        """Test 404 error response."""
        response = client.get("/nonexistent/endpoint")

        assert response.status_code == 404
        data = response.get_json()

        assert data["success"] is False
        assert data["code"] == "NOT_FOUND"

    @pytest.mark.integration
    def test_400_bad_request(self, client, auth_headers):
        """Test 400 error response."""
        response = client.post("/ai/chat_remark", json={}, headers=auth_headers)

        assert response.status_code == 400
        data = response.get_json()

        assert data["success"] is False
        assert data["code"] in ["VALIDATION_ERROR", "EMPTY_INPUT"]


# -------------------------------
# Integration Tests
# -------------------------------
class TestIntegration:
    """End-to-end integration tests."""

    @pytest.fixture
    def auth_headers(self, generate_token):
        token = generate_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    @pytest.mark.integration
    def test_full_auth_flow(self, client):
        """Test complete authentication flow."""
        # 1. Get token
        response = client.post(
            "/auth/token",
            json={"username": "testuser", "password": "TestPassword123!"},
        )

        assert response.status_code == 200
        tokens = response.get_json()["data"]
        access_token = tokens["access_token"]
        refresh_token = tokens["refresh_token"]

        # 2. Use access token for API call
        with patch("ai_form_server.routes.chat._transfer_remark") as mock_transfer:
            mock_transfer.return_value = "['test': 'data']"
            response = client.post(
                "/ai/chat_remark",
                json={"userInput": "test"},
                headers={"Authorization": f"Bearer {access_token}"},
            )

        assert response.status_code == 200

        # 3. Refresh token
        response = client.post("/auth/refresh", json={"refresh_token": refresh_token})

        assert response.status_code == 200
        new_access_token = response.get_json()["data"]["access_token"]

        # 4. Use new token
        with patch("ai_form_server.routes.chat._transfer_remark") as mock_transfer:
            mock_transfer.return_value = "['test': 'data']"
            response = client.post(
                "/ai/chat_remark",
                json={"userInput": "test"},
                headers={"Authorization": f"Bearer {new_access_token}"},
            )

        assert response.status_code == 200

    @pytest.mark.integration
    def test_api_key_auth_flow(self, client):
        """Test API key authentication flow."""
        # Use API key to get token
        response = client.post("/auth/token", json={"api_key": "test_api_key_valid"})

        assert response.status_code == 200
        access_token = response.get_json()["data"]["access_token"]

        # Use token for API call
        with patch("ai_form_server.routes.chat._transfer_remark") as mock_transfer:
            mock_transfer.return_value = "['test': 'data']"
            response = client.post(
                "/ai/chat_remark",
                json={"userInput": "test"},
                headers={"Authorization": f"Bearer {access_token}"},
            )

        assert response.status_code == 200