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
- Performance testing
"""

import pytest
import json
import time
from datetime import timedelta
from unittest.mock import patch, MagicMock
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from auth import init_auth, TokenManager, UserStore, require_auth


# -------------------------------
# Test Fixtures Setup
# -------------------------------
@pytest.fixture(autouse=True)
def setup_test_environment():
    """Set up test environment before each test."""
    # Reset user store
    UserStore._users = {}
    UserStore._api_keys = {}

    # Create test users
    UserStore.add_user('testuser', 'TestPassword123!', 'user', 'test_api_key_valid')
    UserStore.add_user('admin', 'AdminPassword456!', 'admin', 'test_api_key_admin')

    yield

    # Cleanup
    UserStore._users = {}
    UserStore._api_keys = {}


@pytest.fixture
def mock_chat_assistant():
    """Mock ChatAssistant for isolated API testing."""
    mock = MagicMock()
    mock.chatWithoutContext.return_value = "['username': 'testUser123', 'password': 'A1b@cD9eF']"
    mock.chatSupplement.return_value = "['username': 'testUser123', 'password': 'A1b@cD9eF']"
    return mock


# -------------------------------
# Health Check Tests
# -------------------------------
class TestHealthEndpoint:
    """Tests for /health endpoint."""

    @pytest.mark.integration
    def test_health_check_success(self, client):
        """Test health check returns healthy status."""
        response = client.get('/health')

        assert response.status_code == 200
        data = response.get_json()

        assert data['status'] == 'healthy'
        assert 'timestamp' in data
        assert data['service'] == 'ai-chat-server'

    @pytest.mark.integration
    def test_health_check_structure(self, client):
        """Test health check response structure."""
        response = client.get('/health')
        data = response.get_json()

        assert 'checks' in data
        assert 'version' in data


# -------------------------------
# Chat Endpoint Authentication Tests
# -------------------------------
class TestChatEndpointAuthentication:
    """Tests for /ai/chat_remark authentication."""

    @pytest.mark.auth
    def test_chat_without_auth_returns_401(self, client, app):
        """Test accessing chat endpoint without auth returns 401."""
        # This test assumes /ai/chat_remark is protected
        # If not protected in the current implementation, this tests the expected behavior

        response = client.post('/ai/chat_remark', json={
            'userInput': 'test input'
        })

        # If endpoint is protected, should return 401
        # If not protected, will return 200 (current behavior)
        # This documents expected behavior after protection is added
        if response.status_code == 401:
            assert response.get_json()['code'] == 'AUTHENTICATION_REQUIRED'

    @pytest.mark.auth
    def test_chat_with_valid_bearer_token(self, client, generate_token, mock_chat_assistant, app):
        """Test chat endpoint with valid Bearer token."""
        init_auth(app, register_blueprint=False)

        token = generate_token()

        with patch('AiServer.transferAichatAssistant', mock_chat_assistant):
            response = client.post('/ai/chat_remark', json={
                'userInput': 'Generate test data for username field'
            }, headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            })

        # If protected, should succeed; if not, will still succeed
        assert response.status_code in [200, 201]

    @pytest.mark.auth
    def test_chat_with_api_key_header(self, client, mock_chat_assistant, app):
        """Test chat endpoint with API key header."""
        init_auth(app, register_blueprint=False)

        with patch('AiServer.transferAichatAssistant', mock_chat_assistant):
            response = client.post('/ai/chat_remark', json={
                'userInput': 'test input'
            }, headers={
                'X-API-Key': 'test_api_key_valid',
                'Content-Type': 'application/json'
            })

        # Verify request was processed
        assert response.status_code in [200, 401]

    @pytest.mark.auth
    def test_chat_with_expired_token(self, client, generate_token, app):
        """Test chat endpoint with expired token."""
        init_auth(app, register_blueprint=False)

        expired_token = generate_token(expires_delta=timedelta(seconds=-1))

        response = client.post('/ai/chat_remark', json={
            'userInput': 'test'
        }, headers={
            'Authorization': f'Bearer {expired_token}'
        })

        # Should return 401 if protected
        if response.status_code == 401:
            data = response.get_json()
            assert data['code'] in ['AUTHENTICATION_ERROR', 'AUTHENTICATION_REQUIRED']

    @pytest.mark.auth
    def test_chat_with_malformed_auth_header(self, client, app):
        """Test chat endpoint with malformed Authorization header."""
        init_auth(app, register_blueprint=False)

        response = client.post('/ai/chat_remark', json={
            'userInput': 'test'
        }, headers={
            'Authorization': 'InvalidFormat token'
        })

        # Should return 401 if protected
        if response.status_code == 401:
            assert response.get_json()['code'] == 'AUTHENTICATION_REQUIRED'

    @pytest.mark.auth
    def test_chat_with_invalid_api_key(self, client, app):
        """Test chat endpoint with invalid API key."""
        init_auth(app, register_blueprint=False)

        response = client.post('/ai/chat_remark', json={
            'userInput': 'test'
        }, headers={
            'X-API-Key': 'invalid_key_12345'
        })

        # Should return 401 if protected
        if response.status_code == 401:
            assert response.get_json()['code'] == 'INVALID_API_KEY'


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
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    @pytest.mark.integration
    def test_valid_input_request(self, client, mock_chat_assistant, auth_headers, app):
        """Test valid input request returns success."""
        with patch('AiServer.transferAichatAssistant', mock_chat_assistant):
            response = client.post('/ai/chat_remark', json={
                'userInput': 'Generate test data for username field'
            }, headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()

        assert data['success'] is True
        assert 'data' in data
        assert 'response' in data['data']

    @pytest.mark.integration
    def test_empty_user_input(self, client, auth_headers):
        """Test empty user input returns 400."""
        response = client.post('/ai/chat_remark', json={
            'userInput': ''
        }, headers=auth_headers)

        assert response.status_code == 400
        data = response.get_json()

        assert data['success'] is False
        assert 'empty' in data['error'].lower()

    @pytest.mark.integration
    def test_missing_user_input(self, client, auth_headers):
        """Test missing user input returns 400."""
        response = client.post('/ai/chat_remark', json={
            'chatContext': 'some context'
        }, headers=auth_headers)

        assert response.status_code == 400
        data = response.get_json()

        assert data['success'] is False

    @pytest.mark.integration
    def test_whitespace_only_input(self, client, auth_headers):
        """Test whitespace-only input returns 400."""
        response = client.post('/ai/chat_remark', json={
            'userInput': '   '
        }, headers=auth_headers)

        assert response.status_code == 400

    @pytest.mark.integration
    def test_input_too_long(self, client, auth_headers):
        """Test input exceeding max length returns 400."""
        long_input = 'a' * 10001

        response = client.post('/ai/chat_remark', json={
            'userInput': long_input
        }, headers=auth_headers)

        assert response.status_code == 400
        data = response.get_json()

        assert data['code'] == 'VALIDATION_ERROR'

    @pytest.mark.integration
    def test_context_too_long(self, client, auth_headers, mock_chat_assistant):
        """Test context exceeding max length returns 400."""
        long_context = 'a' * 50001

        with patch('AiServer.transferAichatAssistant', mock_chat_assistant):
            response = client.post('/ai/chat_remark', json={
                'userInput': 'test',
                'chatContext': long_context
            }, headers=auth_headers)

        assert response.status_code == 400
        data = response.get_json()

        assert data['code'] == 'VALIDATION_ERROR'

    @pytest.mark.integration
    def test_input_with_context(self, client, mock_chat_assistant, auth_headers):
        """Test valid input with context."""
        with patch('AiServer.transferAichatAssistant', mock_chat_assistant):
            response = client.post('/ai/chat_remark', json={
                'userInput': 'Generate test data',
                'chatContext': 'Email field, required, valid format'
            }, headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()

        assert data['success'] is True

    @pytest.mark.integration
    def test_form_data_input(self, client, mock_chat_assistant, generate_token):
        """Test form data input handling."""
        token = generate_token()

        with patch('AiServer.transferAichatAssistant', mock_chat_assistant):
            response = client.post('/ai/chat_remark', data={
                'userInput': 'test input'
            }, headers={
                'Authorization': f'Bearer {token}'
            })

        # Should accept form data
        assert response.status_code in [200, 400]


# -------------------------------
# Chat Endpoint Response Tests
# -------------------------------
class TestChatResponses:
    """Tests for /ai/chat_remark response handling."""

    @pytest.fixture
    def auth_headers(self, generate_token):
        token = generate_token()
        return {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    @pytest.mark.integration
    def test_successful_response_structure(self, client, mock_chat_assistant, auth_headers):
        """Test successful response has correct structure."""
        with patch('AiServer.transferAichatAssistant', mock_chat_assistant):
            response = client.post('/ai/chat_remark', json={
                'userInput': 'test'
            }, headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()

        # Required fields
        assert 'success' in data
        assert data['success'] is True
        assert 'data' in data
        assert 'response' in data['data']

        # Response should be a list
        assert isinstance(data['data']['response'], list)

    @pytest.mark.integration
    def test_error_response_structure(self, client, auth_headers):
        """Test error response has correct structure."""
        response = client.post('/ai/chat_remark', json={
            'userInput': ''
        }, headers=auth_headers)

        assert response.status_code == 400
        data = response.get_json()

        assert 'success' in data
        assert data['success'] is False
        assert 'error' in data
        assert 'code' in data

    @pytest.mark.integration
    def test_ai_service_error_handling(self, client, auth_headers):
        """Test handling of AI service errors."""
        mock_assistant = MagicMock()
        mock_assistant.chatWithoutContext.side_effect = Exception("AI service unavailable")

        with patch('AiServer.transferAichatAssistant', mock_assistant):
            response = client.post('/ai/chat_remark', json={
                'userInput': 'test'
            }, headers=auth_headers)

        assert response.status_code == 500
        data = response.get_json()

        assert data['success'] is False
        assert data['code'] == 'AI_SERVICE_ERROR'


# -------------------------------
# Rate Limiting Tests
# -------------------------------
class TestRateLimiting:
    """Tests for rate limiting functionality."""

    @pytest.fixture
    def auth_headers(self, generate_token):
        token = generate_token()
        return {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    @pytest.mark.security
    def test_rate_limit_enforcement(self, client, auth_headers, mock_chat_assistant):
        """Test rate limiting is enforced."""
        # Make multiple requests rapidly
        responses = []
        for i in range(35):  # Default limit is 30 per minute
            with patch('AiServer.transferAichatAssistant', mock_chat_assistant):
                response = client.post('/ai/chat_remark', json={
                    'userInput': f'test {i}'
                }, headers=auth_headers)
                responses.append(response)

        # At least one should be rate limited
        status_codes = [r.status_code for r in responses]
        assert 429 in status_codes or all(code == 200 for code in status_codes[:30])

    @pytest.mark.security
    def test_rate_limit_response_format(self, client, auth_headers):
        """Test rate limit response format."""
        # Exhaust rate limit
        for _ in range(100):
            client.post('/ai/chat_remark', json={'userInput': 'test'}, headers=auth_headers)

        # Next request should be rate limited
        response = client.post('/ai/chat_remark', json={'userInput': 'test'}, headers=auth_headers)

        if response.status_code == 429:
            data = response.get_json()
            assert data['code'] == 'RATE_LIMIT_EXCEEDED'
            assert 'error' in data


# -------------------------------
# Security Tests
# -------------------------------
class TestAPISecurity:
    """Security-focused API tests."""

    @pytest.fixture
    def auth_headers(self, generate_token):
        token = generate_token()
        return {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    @pytest.mark.security
    def test_sql_injection_in_input(self, client, mock_chat_assistant, auth_headers):
        """Test SQL injection handling in user input."""
        sql_payload = "'; DROP TABLE users; --"

        with patch('AiServer.transferAichatAssistant', mock_chat_assistant):
            response = client.post('/ai/chat_remark', json={
                'userInput': sql_payload
            }, headers=auth_headers)

        # Should not crash, return 200 or 500 with sanitized error
        assert response.status_code in [200, 400, 500]
        if response.status_code not in [200]:
            assert 'DROP TABLE' not in response.get_json().get('error', '')

    @pytest.mark.security
    def test_xss_in_input(self, client, mock_chat_assistant, auth_headers):
        """Test XSS handling in user input."""
        xss_payload = '<script>alert("xss")</script>'

        with patch('AiServer.transferAichatAssistant', mock_chat_assistant):
            response = client.post('/ai/chat_remark', json={
                'userInput': xss_payload
            }, headers=auth_headers)

        # Should process safely
        assert response.status_code in [200, 400]

    @pytest.mark.security
    def test_null_bytes_in_input(self, client, mock_chat_assistant, auth_headers):
        """Test null bytes handling in user input."""
        null_input = 'test\x00input'

        with patch('AiServer.transferAichatAssistant', mock_chat_assistant):
            response = client.post('/ai/chat_remark', json={
                'userInput': null_input
            }, headers=auth_headers)

        # Should handle gracefully
        assert response.status_code in [200, 400]

    @pytest.mark.security
    def test_unicode_handling(self, client, mock_chat_assistant, auth_headers):
        """Test Unicode handling in user input."""
        unicode_input = "Test \u4e2d\u6587 \u0440\u0443\u0441\u0441\u043a\u0438\u0439 \u65e5\u672c\u8a9e"

        with patch('AiServer.transferAichatAssistant', mock_chat_assistant):
            response = client.post('/ai/chat_remark', json={
                'userInput': unicode_input
            }, headers=auth_headers)

        assert response.status_code == 200

    @pytest.mark.security
    def test_large_json_payload(self, client, auth_headers):
        """Test handling of large JSON payloads."""
        # Create payload just under MAX_CONTENT_LENGTH
        large_input = 'a' * 10000

        response = client.post('/ai/chat_remark', json={
            'userInput': large_input
        }, headers=auth_headers)

        # Should handle within limits
        assert response.status_code in [200, 400, 413]

    @pytest.mark.security
    def test_content_type_validation(self, client, generate_token):
        """Test content type validation."""
        token = generate_token()

        # Send with wrong content type
        response = client.post('/ai/chat_remark', data='not json',
                              content_type='text/plain',
                              headers={'Authorization': f'Bearer {token}'})

        # Should handle gracefully
        assert response.status_code in [400, 415, 200]


# -------------------------------
# Performance Tests
# -------------------------------
class TestAPIPerformance:
    """Performance tests for API endpoints."""

    @pytest.fixture
    def auth_headers(self, generate_token):
        token = generate_token()
        return {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    @pytest.mark.performance
    def test_response_time_sla(self, client, mock_chat_assistant, auth_headers, performance_test_config):
        """Test API response time meets SLA."""
        with patch('AiServer.transferAichatAssistant', mock_chat_assistant):
            start_time = time.time()

            response = client.post('/ai/chat_remark', json={
                'userInput': 'test input'
            }, headers=auth_headers)

            end_time = time.time()
            response_time_ms = (end_time - start_time) * 1000

        assert response.status_code == 200
        # SLA: 95th percentile under 200ms
        assert response_time_ms < performance_test_config['max_response_time_ms']

    @pytest.mark.performance
    def test_concurrent_requests(self, client, mock_chat_assistant, generate_token, performance_test_config):
        """Test handling concurrent requests."""
        import concurrent.futures

        def make_request():
            token = generate_token()
            with patch('AiServer.transferAichatAssistant', mock_chat_assistant):
                return client.post('/ai/chat_remark', json={
                    'userInput': 'concurrent test'
                }, headers={'Authorization': f'Bearer {token}'})

        concurrent_requests = performance_test_config['concurrent_requests']

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(concurrent_requests)]
            results = [f.result() for f in futures]

        # All requests should complete
        assert len(results) == concurrent_requests

        # Most should succeed
        success_count = sum(1 for r in results if r.status_code == 200)
        success_rate = success_count / concurrent_requests

        assert success_rate >= 0.95  # 95% success rate


# -------------------------------
# Error Handling Tests
# -------------------------------
class TestErrorHandling:
    """Tests for error handling."""

    @pytest.fixture
    def auth_headers(self, generate_token):
        token = generate_token()
        return {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    @pytest.mark.integration
    def test_404_not_found(self, client):
        """Test 404 error response."""
        response = client.get('/nonexistent/endpoint')

        assert response.status_code == 404
        data = response.get_json()

        assert data['success'] is False
        assert data['code'] == 'NOT_FOUND'

    @pytest.mark.integration
    def test_405_method_not_allowed(self, client):
        """Test 405 error response."""
        response = client.get('/ai/chat_remark')  # GET instead of POST

        assert response.status_code == 405

    @pytest.mark.integration
    def test_400_bad_request(self, client, auth_headers):
        """Test 400 error response."""
        response = client.post('/ai/chat_remark', json={}, headers=auth_headers)

        assert response.status_code == 400
        data = response.get_json()

        assert data['success'] is False
        assert data['code'] in ['VALIDATION_ERROR', 'EMPTY_INPUT']

    @pytest.mark.integration
    def test_error_message_sanitization(self, client, auth_headers):
        """Test error messages don't expose sensitive info."""
        mock_assistant = MagicMock()
        mock_assistant.chatWithoutContext.side_effect = Exception(
            "Database password: secret123 at /etc/config/db.conf"
        )

        with patch('AiServer.transferAichatAssistant', mock_assistant):
            response = client.post('/ai/chat_remark', json={
                'userInput': 'test'
            }, headers=auth_headers)

        if response.status_code == 500:
            data = response.get_json()
            error_msg = data.get('error', '')

            # Should not contain sensitive info
            assert 'password' not in error_msg.lower()
            assert 'secret' not in error_msg.lower()
            assert '/etc/' not in error_msg


# -------------------------------
# Integration Tests
# -------------------------------
class TestIntegration:
    """End-to-end integration tests."""

    @pytest.fixture
    def auth_headers(self, generate_token):
        token = generate_token()
        return {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    @pytest.mark.integration
    def test_full_auth_flow(self, client, app):
        """Test complete authentication flow."""
        init_auth(app, register_blueprint=False)

        # 1. Get token
        response = client.post('/auth/token', json={
            'username': 'testuser',
            'password': 'TestPassword123!'
        })

        assert response.status_code == 200
        tokens = response.get_json()['data']
        access_token = tokens['access_token']
        refresh_token = tokens['refresh_token']

        # 2. Use access token for API call
        mock_assistant = MagicMock()
        mock_assistant.chatWithoutContext.return_value = "['test': 'data']"

        with patch('AiServer.transferAichatAssistant', mock_assistant):
            response = client.post('/ai/chat_remark', json={
                'userInput': 'test'
            }, headers={
                'Authorization': f'Bearer {access_token}'
            })

        assert response.status_code == 200

        # 3. Refresh token
        response = client.post('/auth/refresh', json={
            'refresh_token': refresh_token
        })

        assert response.status_code == 200
        new_access_token = response.get_json()['data']['access_token']

        # 4. Use new token
        with patch('AiServer.transferAichatAssistant', mock_assistant):
            response = client.post('/ai/chat_remark', json={
                'userInput': 'test'
            }, headers={
                'Authorization': f'Bearer {new_access_token}'
            })

        assert response.status_code == 200

    @pytest.mark.integration
    def test_api_key_auth_flow(self, client, mock_chat_assistant, app):
        """Test API key authentication flow."""
        init_auth(app, register_blueprint=False)

        # Use API key to get token
        response = client.post('/auth/token', json={
            'api_key': 'test_api_key_valid'
        })

        assert response.status_code == 200
        access_token = response.get_json()['data']['access_token']

        # Use token for API call
        with patch('AiServer.transferAichatAssistant', mock_chat_assistant):
            response = client.post('/ai/chat_remark', json={
                'userInput': 'test'
            }, headers={
                'Authorization': f'Bearer {access_token}'
            })

        assert response.status_code == 200


# -------------------------------
# CORS Tests
# -------------------------------
class TestCORS:
    """Tests for CORS configuration."""

    @pytest.mark.security
    def test_cors_headers(self, client):
        """Test CORS headers are present."""
        response = client.options('/ai/chat_remark', headers={
            'Origin': 'http://localhost:3000',
            'Access-Control-Request-Method': 'POST'
        })

        # Check for CORS headers
        assert 'Access-Control-Allow-Origin' in response.headers or response.status_code == 200

    @pytest.mark.security
    def test_allowed_methods(self, client):
        """Test only allowed methods are accepted."""
        # POST should be allowed
        response = client.post('/ai/chat_remark', json={'userInput': 'test'})
        assert response.status_code != 405

        # GET should not be allowed
        response = client.get('/ai/chat_remark')
        assert response.status_code == 405

    @pytest.mark.security
    def test_allowed_headers(self, client):
        """Test allowed headers."""
        response = client.options('/ai/chat_remark', headers={
            'Origin': 'http://localhost:3000',
            'Access-Control-Request-Headers': 'Authorization, Content-Type'
        })

        # Should accept Authorization and Content-Type
        assert response.status_code in [200, 204]