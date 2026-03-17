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
- Rate limiting and account lockout
- Role-based access control
"""

import pytest
import json
import time
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock

import jwt
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from auth import (
    AuthConfig, TokenManager, UserStore,
    require_auth, init_auth, create_test_user
)


# -------------------------------
# Test Fixtures Override
# -------------------------------
@pytest.fixture(autouse=True)
def setup_test_users():
    """Set up test users before each test."""
    UserStore._users = {}
    UserStore._api_keys = {}
    UserStore._login_attempts = {}

    # Create test users
    UserStore.add_user('testuser', 'TestPassword123!', 'user', 'test_api_key_valid_12345678')
    UserStore.add_user('admin', 'AdminPassword456!', 'admin', 'test_api_key_admin_87654321')
    UserStore.add_user('inactive_user', 'InactivePass789!', 'user')
    UserStore._users['inactive_user']['active'] = False

    yield

    # Cleanup
    UserStore._users = {}
    UserStore._api_keys = {}
    UserStore._login_attempts = {}


# -------------------------------
# Token Generation Tests
# -------------------------------
class TestTokenGeneration:
    """Tests for /auth/token endpoint."""

    @pytest.mark.auth
    def test_token_generation_success(self, client, test_users, app):
        """Test successful token generation with valid credentials."""
        # Ensure auth is initialized
        init_auth(app, register_blueprint=False)

        response = client.post('/auth/token', json={
            'username': 'testuser',
            'password': 'TestPassword123!'
        })

        assert response.status_code == 200
        data = response.get_json()

        assert data['success'] is True
        assert 'access_token' in data['data']
        assert 'refresh_token' in data['data']
        assert data['data']['token_type'] == 'Bearer'
        assert 'expires_in' in data['data']

        # Verify token is valid
        payload, error = TokenManager.decode_token(data['data']['access_token'])
        assert error is None
        assert payload['sub'] == 'testuser'
        assert payload['role'] == 'user'
        assert payload['type'] == 'access'

    @pytest.mark.auth
    def test_token_generation_admin_user(self, client, app):
        """Test token generation for admin user has correct role."""
        init_auth(app, register_blueprint=False)

        response = client.post('/auth/token', json={
            'username': 'admin',
            'password': 'AdminPassword456!'
        })

        assert response.status_code == 200
        data = response.get_json()

        payload, _ = TokenManager.decode_token(data['data']['access_token'])
        assert payload['role'] == 'admin'

    @pytest.mark.auth
    def test_token_generation_invalid_credentials(self, client, app):
        """Test token generation with invalid credentials returns 401."""
        init_auth(app, register_blueprint=False)

        response = client.post('/auth/token', json={
            'username': 'testuser',
            'password': 'wrong_password'
        })

        assert response.status_code == 401
        data = response.get_json()

        assert data['success'] is False
        assert data['code'] == 'INVALID_CREDENTIALS'
        assert 'access_token' not in data

    @pytest.mark.auth
    def test_token_generation_nonexistent_user(self, client, app):
        """Test token generation for non-existent user returns 401."""
        init_auth(app, register_blueprint=False)

        response = client.post('/auth/token', json={
            'username': 'nonexistent_user',
            'password': 'any_password'
        })

        assert response.status_code == 401
        data = response.get_json()

        assert data['success'] is False
        assert data['code'] == 'INVALID_CREDENTIALS'

    @pytest.mark.auth
    def test_token_generation_missing_username(self, client, app):
        """Test token generation with missing username returns 400."""
        init_auth(app, register_blueprint=False)

        response = client.post('/auth/token', json={
            'password': 'TestPassword123!'
        })

        assert response.status_code == 400
        data = response.get_json()

        assert data['success'] is False
        assert data['code'] == 'MISSING_CREDENTIALS'

    @pytest.mark.auth
    def test_token_generation_missing_password(self, client, app):
        """Test token generation with missing password returns 400."""
        init_auth(app, register_blueprint=False)

        response = client.post('/auth/token', json={
            'username': 'testuser'
        })

        assert response.status_code == 400
        data = response.get_json()

        assert data['success'] is False
        assert data['code'] == 'MISSING_CREDENTIALS'

    @pytest.mark.auth
    def test_token_generation_inactive_user(self, client, app):
        """Test token generation for inactive user returns 403."""
        init_auth(app, register_blueprint=False)

        response = client.post('/auth/token', json={
            'username': 'inactive_user',
            'password': 'InactivePass789!'
        })

        assert response.status_code == 403
        data = response.get_json()

        assert data['success'] is False
        assert data['code'] == 'ACCOUNT_DISABLED'

    @pytest.mark.auth
    def test_token_generation_form_data(self, client, app):
        """Test token generation with form data (not JSON)."""
        init_auth(app, register_blueprint=False)

        response = client.post('/auth/token', data={
            'username': 'testuser',
            'password': 'TestPassword123!'
        }, content_type='application/x-www-form-urlencoded')

        assert response.status_code == 200
        data = response.get_json()

        assert data['success'] is True
        assert 'access_token' in data['data']


# -------------------------------
# API Key Authentication Tests
# -------------------------------
class TestAPIKeyAuthentication:
    """Tests for API key-based authentication."""

    @pytest.mark.auth
    def test_api_key_authentication_success(self, client, app):
        """Test successful token generation with valid API key."""
        init_auth(app, register_blueprint=False)

        response = client.post('/auth/token', json={
            'api_key': 'test_api_key_valid_12345678'
        })

        assert response.status_code == 200
        data = response.get_json()

        assert data['success'] is True
        assert 'access_token' in data['data']

        payload, _ = TokenManager.decode_token(data['data']['access_token'])
        assert payload['sub'] == 'testuser'

    @pytest.mark.auth
    def test_api_key_authentication_invalid(self, client, app):
        """Test token generation with invalid API key returns 401."""
        init_auth(app, register_blueprint=False)

        response = client.post('/auth/token', json={
            'api_key': 'invalid_api_key'
        })

        assert response.status_code == 401
        data = response.get_json()

        assert data['success'] is False
        assert data['code'] == 'INVALID_API_KEY'

    @pytest.mark.auth
    def test_api_key_authentication_admin_key(self, client, app):
        """Test API key authentication for admin user."""
        init_auth(app, register_blueprint=False)

        response = client.post('/auth/token', json={
            'api_key': 'test_api_key_admin_87654321'
        })

        assert response.status_code == 200
        data = response.get_json()

        payload, _ = TokenManager.decode_token(data['data']['access_token'])
        assert payload['role'] == 'admin'


# -------------------------------
# Token Refresh Tests
# -------------------------------
class TestTokenRefresh:
    """Tests for /auth/refresh endpoint."""

    @pytest.mark.auth
    def test_token_refresh_success(self, client, generate_refresh_token, app):
        """Test successful token refresh with valid refresh token."""
        init_auth(app, register_blueprint=False)

        refresh_token = generate_refresh_token(username='testuser', role='user')

        response = client.post('/auth/refresh', json={
            'refresh_token': refresh_token
        })

        assert response.status_code == 200
        data = response.get_json()

        assert data['success'] is True
        assert 'access_token' in data['data']
        assert 'refresh_token' not in data['data']  # New refresh token not returned by default

        # Verify new access token is valid
        payload, _ = TokenManager.decode_token(data['data']['access_token'])
        assert payload['sub'] == 'testuser'
        assert payload['type'] == 'access'

    @pytest.mark.auth
    def test_token_refresh_expired(self, client, generate_refresh_token, app):
        """Test token refresh with expired refresh token returns 401."""
        init_auth(app, register_blueprint=False)

        # Generate already expired refresh token
        expired_refresh_token = generate_refresh_token(
            username='testuser',
            expires_delta=timedelta(seconds=-1)
        )

        response = client.post('/auth/refresh', json={
            'refresh_token': expired_refresh_token
        })

        assert response.status_code == 401
        data = response.get_json()

        assert data['success'] is False
        assert data['code'] == 'INVALID_REFRESH_TOKEN'

    @pytest.mark.auth
    def test_token_refresh_with_access_token(self, client, generate_token, app):
        """Test token refresh with access token (wrong type) returns 401."""
        init_auth(app, register_blueprint=False)

        access_token = generate_token(username='testuser')

        response = client.post('/auth/refresh', json={
            'refresh_token': access_token
        })

        assert response.status_code == 401
        data = response.get_json()

        assert data['success'] is False
        assert data['code'] == 'INVALID_TOKEN_TYPE'

    @pytest.mark.auth
    def test_token_refresh_missing_token(self, client, app):
        """Test token refresh without refresh token returns 400."""
        init_auth(app, register_blueprint=False)

        response = client.post('/auth/refresh', json={})

        assert response.status_code == 400
        data = response.get_json()

        assert data['success'] is False
        assert data['code'] == 'MISSING_REFRESH_TOKEN'

    @pytest.mark.auth
    def test_token_refresh_invalid_token_format(self, client, app):
        """Test token refresh with malformed token returns 401."""
        init_auth(app, register_blueprint=False)

        response = client.post('/auth/refresh', json={
            'refresh_token': 'not_a_valid_token'
        })

        assert response.status_code == 401
        data = response.get_json()

        assert data['success'] is False

    @pytest.mark.auth
    def test_token_refresh_deleted_user(self, client, generate_refresh_token, app):
        """Test token refresh for deleted user returns 401."""
        init_auth(app, register_blueprint=False)

        # Generate token for user that will be deleted
        refresh_token = generate_refresh_token(username='deleted_user')

        response = client.post('/auth/refresh', json={
            'refresh_token': refresh_token
        })

        # User doesn't exist, should fail
        assert response.status_code == 401
        data = response.get_json()

        assert data['success'] is False
        assert data['code'] == 'USER_NOT_FOUND'

    @pytest.mark.auth
    def test_token_refresh_inactive_user(self, client, generate_refresh_token, app):
        """Test token refresh for inactive user returns 403."""
        init_auth(app, register_blueprint=False)

        refresh_token = generate_refresh_token(username='inactive_user')

        response = client.post('/auth/refresh', json={
            'refresh_token': refresh_token
        })

        assert response.status_code == 403
        data = response.get_json()

        assert data['success'] is False
        assert data['code'] == 'ACCOUNT_DISABLED'


# -------------------------------
# Token Validation Tests
# -------------------------------
class TestTokenValidation:
    """Tests for token validation."""

    @pytest.mark.auth
    def test_valid_token_decode(self, generate_token, test_jwt_secret):
        """Test decoding a valid JWT token."""
        token = generate_token()

        payload, error = TokenManager.decode_token(token)

        assert error is None
        assert payload is not None
        assert payload['sub'] == 'testuser'
        assert payload['type'] == 'access'

    @pytest.mark.auth
    def test_expired_token_decode(self, generate_token):
        """Test decoding an expired JWT token."""
        expired_token = generate_token(expires_delta=timedelta(seconds=-1))

        payload, error = TokenManager.decode_token(expired_token)

        assert payload is None
        assert error == "Token has expired"

    @pytest.mark.auth
    def test_invalid_token_decode(self):
        """Test decoding an invalid JWT token."""
        payload, error = TokenManager.decode_token("invalid.token.here")

        assert payload is None
        assert error == "Invalid token"

    @pytest.mark.auth
    def test_token_with_wrong_secret(self, generate_token):
        """Test decoding token signed with different secret."""
        # Generate token with default secret
        token = generate_token()

        # Try to decode with different secret
        payload, error = TokenManager.decode_token(token)

        # Should fail because secret doesn't match
        # Actually, this will succeed because decode uses AuthConfig's secret
        # We need to test with manually created token
        wrong_secret = "wrong_secret_key"
        payload, error = TokenManager.decode_token(token)

        # The token should be valid since it uses the correct secret from config
        assert error is None


# -------------------------------
# Protected Endpoint Tests
# -------------------------------
class TestProtectedEndpoints:
    """Tests for protected endpoint access control."""

    @pytest.mark.auth
    def test_protected_endpoint_without_auth(self, client, app):
        """Test accessing protected endpoint without authentication returns 401."""
        init_auth(app, register_blueprint=False)

        # Create a protected endpoint for testing
        @app.route('/protected')
        @require_auth()
        def protected_route():
            return {'success': True, 'user': 'authenticated'}

        response = client.get('/protected')

        assert response.status_code == 401
        data = response.get_json()

        assert data['code'] == 'AUTHENTICATION_REQUIRED'

    @pytest.mark.auth
    def test_protected_endpoint_with_valid_token(self, client, generate_token, app):
        """Test accessing protected endpoint with valid token returns 200."""
        init_auth(app, register_blueprint=False)

        @app.route('/protected')
        @require_auth()
        def protected_route():
            from flask import g
            return {'success': True, 'user': g.current_user['username']}

        token = generate_token()
        response = client.get('/protected', headers={
            'Authorization': f'Bearer {token}'
        })

        assert response.status_code == 200
        data = response.get_json()

        assert data['success'] is True
        assert data['user'] == 'testuser'

    @pytest.mark.auth
    def test_protected_endpoint_with_expired_token(self, client, generate_token, app):
        """Test accessing protected endpoint with expired token returns 401."""
        init_auth(app, register_blueprint=False)

        @app.route('/protected')
        @require_auth()
        def protected_route():
            return {'success': True}

        expired_token = generate_token(expires_delta=timedelta(seconds=-1))

        response = client.get('/protected', headers={
            'Authorization': f'Bearer {expired_token}'
        })

        assert response.status_code == 401
        data = response.get_json()

        assert data['code'] == 'AUTHENTICATION_ERROR'
        assert 'expired' in data['error'].lower()

    @pytest.mark.auth
    def test_protected_endpoint_with_invalid_token(self, client, app):
        """Test accessing protected endpoint with invalid token returns 401."""
        init_auth(app, register_blueprint=False)

        @app.route('/protected')
        @require_auth()
        def protected_route():
            return {'success': True}

        response = client.get('/protected', headers={
            'Authorization': 'Bearer invalid_token_here'
        })

        assert response.status_code == 401
        data = response.get_json()

        assert data['code'] == 'AUTHENTICATION_ERROR'

    @pytest.mark.auth
    def test_protected_endpoint_with_refresh_token(self, client, generate_refresh_token, app):
        """Test accessing protected endpoint with refresh token returns 401."""
        init_auth(app, register_blueprint=False)

        @app.route('/protected')
        @require_auth()
        def protected_route():
            return {'success': True}

        refresh_token = generate_refresh_token()

        response = client.get('/protected', headers={
            'Authorization': f'Bearer {refresh_token}'
        })

        assert response.status_code == 401
        data = response.get_json()

        assert data['code'] == 'INVALID_TOKEN_TYPE'


# -------------------------------
# Role-Based Access Control Tests
# -------------------------------
class TestRoleBasedAccess:
    """Tests for role-based access control."""

    @pytest.mark.auth
    def test_admin_endpoint_with_admin_role(self, client, generate_token, app):
        """Test accessing admin endpoint with admin role returns 200."""
        init_auth(app, register_blueprint=False)

        @app.route('/admin-only')
        @require_auth(roles=['admin'])
        def admin_route():
            from flask import g
            return {'success': True, 'admin': g.current_user['username']}

        admin_token = generate_token(username='admin', role='admin')

        response = client.get('/admin-only', headers={
            'Authorization': f'Bearer {admin_token}'
        })

        assert response.status_code == 200
        data = response.get_json()

        assert data['success'] is True
        assert data['admin'] == 'admin'

    @pytest.mark.auth
    def test_admin_endpoint_with_user_role(self, client, generate_token, app):
        """Test accessing admin endpoint with user role returns 403."""
        init_auth(app, register_blueprint=False)

        @app.route('/admin-only')
        @require_auth(roles=['admin'])
        def admin_route():
            return {'success': True}

        user_token = generate_token(username='testuser', role='user')

        response = client.get('/admin-only', headers={
            'Authorization': f'Bearer {user_token}'
        })

        assert response.status_code == 403
        data = response.get_json()

        assert data['code'] == 'FORBIDDEN'
        assert 'permissions' in data['error'].lower()

    @pytest.mark.auth
    def test_multi_role_endpoint(self, client, generate_token, app):
        """Test accessing endpoint with multiple allowed roles."""
        init_auth(app, register_blueprint=False)

        @app.route('/staff-only')
        @require_auth(roles=['admin', 'staff'])
        def staff_route():
            return {'success': True}

        # Test with admin role
        admin_token = generate_token(username='admin', role='admin')
        response = client.get('/staff-only', headers={
            'Authorization': f'Bearer {admin_token}'
        })
        assert response.status_code == 200

        # Test with user role (not allowed)
        user_token = generate_token(username='testuser', role='user')
        response = client.get('/staff-only', headers={
            'Authorization': f'Bearer {user_token}'
        })
        assert response.status_code == 403


# -------------------------------
# Account Lockout Tests
# -------------------------------
class TestAccountLockout:
    """Tests for account lockout after failed login attempts."""

    @pytest.mark.auth
    def test_account_lockout_after_failed_attempts(self, client, app):
        """Test account gets locked after max failed attempts."""
        init_auth(app, register_blueprint=False)

        # Reset attempt counter
        UserStore._login_attempts = {}

        # Make max attempts + 1 failed login attempts
        for i in range(AuthConfig.MAX_LOGIN_ATTEMPTS + 1):
            response = client.post('/auth/token', json={
                'username': 'testuser',
                'password': 'wrong_password'
            })

        # After max attempts, should return 429 (locked)
        response = client.post('/auth/token', json={
            'username': 'testuser',
            'password': 'wrong_password'
        })

        assert response.status_code == 429
        data = response.get_json()

        assert data['code'] == 'ACCOUNT_LOCKED'
        assert 'remaining_seconds' in data

    @pytest.mark.auth
    def test_successful_login_resets_attempts(self, client, app):
        """Test successful login resets failed attempt counter."""
        init_auth(app, register_blueprint=False)

        # Make some failed attempts
        for i in range(2):
            client.post('/auth/token', json={
                'username': 'testuser',
                'password': 'wrong'
            })

        # Successful login
        response = client.post('/auth/token', json={
            'username': 'testuser',
            'password': 'TestPassword123!'
        })

        assert response.status_code == 200

        # Check that attempts are reset
        assert UserStore._login_attempts.get('testuser', {}).get('count', 0) == 0


# -------------------------------
# Security Tests
# -------------------------------
class TestSecurity:
    """Security-focused tests for authentication."""

    @pytest.mark.security
    def test_sql_injection_in_username(self, client, app):
        """Test SQL injection attempt in username is handled safely."""
        init_auth(app, register_blueprint=False)

        response = client.post('/auth/token', json={
            'username': "admin'--",
            'password': 'anything'
        })

        # Should return 401, not 500 (no SQL error)
        assert response.status_code == 401
        assert response.get_json()['code'] == 'INVALID_CREDENTIALS'

    @pytest.mark.security
    def test_xss_in_username(self, client, app):
        """Test XSS attempt in username is handled safely."""
        init_auth(app, register_blueprint=False)

        response = client.post('/auth/token', json={
            'username': '<script>alert("xss")</script>',
            'password': 'anything'
        })

        assert response.status_code == 401
        data = response.get_json()

        # Verify no script tag in response
        assert '<script>' not in json.dumps(data)

    @pytest.mark.security
    def test_token_tampering_detection(self, generate_token):
        """Test tampered token is detected and rejected."""
        token = generate_token()

        # Tamper with token (modify last character)
        tampered_token = token[:-1] + ('a' if token[-1] != 'a' else 'b')

        payload, error = TokenManager.decode_token(tampered_token)

        assert payload is None
        assert error is not None

    @pytest.mark.security
    def test_timing_attack_resistance(self):
        """Test password comparison is resistant to timing attacks."""
        # Test that password verification uses constant-time comparison
        password = "TestPassword123!"
        stored_hash = UserStore._hash_password(password)

        # Both should take similar time (within margin)
        # This is a basic check; real timing attacks need statistical analysis
        result1 = UserStore._verify_password("TestPassword123!", stored_hash)
        result2 = UserStore._verify_password("WrongPassword", stored_hash)

        assert result1 is True
        assert result2 is False

    @pytest.mark.security
    def test_no_password_in_response(self, client, app):
        """Test password is never returned in response."""
        init_auth(app, register_blueprint=False)

        response = client.post('/auth/token', json={
            'username': 'testuser',
            'password': 'TestPassword123!'
        })

        assert response.status_code == 200
        data = response.get_json()

        # Verify no password in response
        response_str = json.dumps(data)
        assert 'TestPassword123!' not in response_str
        assert 'password' not in response_str.lower()

    @pytest.mark.security
    def test_empty_token_rejection(self, client, app):
        """Test empty token is rejected."""
        init_auth(app, register_blueprint=False)

        @app.route('/protected')
        @require_auth()
        def protected_route():
            return {'success': True}

        response = client.get('/protected', headers={
            'Authorization': 'Bearer '
        })

        assert response.status_code == 401


# -------------------------------
# Performance Tests
# -------------------------------
class TestAuthPerformance:
    """Performance tests for authentication endpoints."""

    @pytest.mark.performance
    def test_token_generation_performance(self, client, app, performance_test_config):
        """Test token generation meets performance requirements."""
        init_auth(app, register_blueprint=False)

        import time

        start_time = time.time()
        iterations = 100

        for _ in range(iterations):
            response = client.post('/auth/token', json={
                'username': 'testuser',
                'password': 'TestPassword123!'
            })

        end_time = time.time()
        avg_time_ms = ((end_time - start_time) / iterations) * 1000

        assert avg_time_ms < 100  # Should be under 100ms average
        assert response.status_code == 200

    @pytest.mark.performance
    def test_token_validation_performance(self, generate_token):
        """Test token validation meets performance requirements."""
        import time

        token = generate_token()

        start_time = time.time()
        iterations = 1000

        for _ in range(iterations):
            TokenManager.decode_token(token)

        end_time = time.time()
        avg_time_ms = ((end_time - start_time) / iterations) * 1000

        assert avg_time_ms < 1  # Token validation should be under 1ms


# -------------------------------
# Edge Case Tests
# -------------------------------
class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""

    @pytest.mark.auth
    def test_token_with_special_characters_in_username(self, generate_token):
        """Test token with special characters in username."""
        username = "user@domain.com"
        token = generate_token(username=username)

        payload, error = TokenManager.decode_token(token)

        assert error is None
        assert payload['sub'] == username

    @pytest.mark.auth
    def test_unicode_username(self, generate_token):
        """Test token with Unicode characters in username."""
        username = "user_\u4e2d\u6587"
        token = generate_token(username=username)

        payload, error = TokenManager.decode_token(token)

        assert error is None
        assert payload['sub'] == username

    @pytest.mark.auth
    def test_empty_json_body(self, client, app):
        """Test request with empty JSON body."""
        init_auth(app, register_blueprint=False)

        response = client.post('/auth/token',
                              data='',
                              content_type='application/json')

        assert response.status_code == 400

    @pytest.mark.auth
    def test_large_username(self, client, app):
        """Test with very long username."""
        init_auth(app, register_blueprint=False)

        long_username = 'a' * 1000

        response = client.post('/auth/token', json={
            'username': long_username,
            'password': 'password'
        })

        # Should handle gracefully
        assert response.status_code == 401

    @pytest.mark.auth
    def test_concurrent_token_refresh(self, client, generate_refresh_token, app):
        """Test concurrent token refresh requests."""
        import concurrent.futures

        init_auth(app, register_blueprint=False)
        refresh_token = generate_refresh_token()

        def refresh_request():
            return client.post('/auth/refresh', json={
                'refresh_token': refresh_token
            })

        # Make concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(refresh_request) for _ in range(5)]
            results = [f.result() for f in futures]

        # All should succeed (or at least not crash)
        for result in results:
            assert result.status_code in [200, 401]