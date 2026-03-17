# -*- coding: utf-8 -*-
# -------------------------------
# @File: auth.py
# @Time: 2025/03/17
# @Author: api-tester
# @Desc: Authentication module with JWT support
# -------------------------------
"""
Authentication module providing JWT-based authentication.

Features:
- JWT token generation and validation
- Token refresh mechanism
- API key authentication
- Role-based access control
- Rate limiting for auth endpoints
"""

import os
import logging
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from functools import wraps
from typing import Optional, Dict, Any, Tuple

import jwt
from flask import request, jsonify, g

logger = logging.getLogger(__name__)


# -------------------------------
# Configuration
# -------------------------------
class AuthConfig:
    """Authentication configuration with environment variable support."""

    # JWT Settings
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', '')
    JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', '1800'))  # 30 min
    JWT_REFRESH_TOKEN_EXPIRES = int(os.getenv('JWT_REFRESH_TOKEN_EXPIRES', '604800'))  # 7 days

    # API Key Settings
    API_KEY_HEADER = os.getenv('API_KEY_HEADER', 'X-API-Key')
    VALID_API_KEYS = os.getenv('VALID_API_KEYS', '').split(',') if os.getenv('VALID_API_KEYS') else []

    # Auth Settings
    AUTH_RATE_LIMIT = os.getenv('AUTH_RATE_LIMIT', '10 per minute')
    MAX_LOGIN_ATTEMPTS = int(os.getenv('MAX_LOGIN_ATTEMPTS', '5'))
    LOCKOUT_DURATION = int(os.getenv('LOCKOUT_DURATION', '300'))  # 5 minutes

    @classmethod
    def validate(cls) -> Tuple[bool, str]:
        """Validate authentication configuration.

        Returns:
            Tuple of (is_valid, error_message)
        """
        if not cls.JWT_SECRET_KEY:
            logger.error("JWT_SECRET_KEY is not configured")
            return False, "JWT_SECRET_KEY must be configured"

        if len(cls.JWT_SECRET_KEY) < 32:
            logger.warning("JWT_SECRET_KEY is too short, recommend at least 32 characters")

        return True, ""

    @classmethod
    def get_jwt_secret(cls) -> str:
        """Get JWT secret key with validation."""
        if not cls.JWT_SECRET_KEY:
            raise ValueError("JWT_SECRET_KEY is not configured")
        return cls.JWT_SECRET_KEY


# -------------------------------
# User Store (for demo/testing)
# In production, this should be replaced with database
# -------------------------------
class UserStore:
    """
    In-memory user store for demonstration.
    In production, replace with database-backed user store.
    """

    _users: Dict[str, Dict[str, Any]] = {}
    _api_keys: Dict[str, str] = {}  # api_key -> username mapping
    _login_attempts: Dict[str, Dict[str, Any]] = {}  # username -> {count, lockout_until}

    @classmethod
    def initialize(cls, users: Dict[str, Dict[str, Any]] = None):
        """Initialize user store with default users."""
        if users:
            cls._users = users
        return cls

    @classmethod
    def add_user(cls, username: str, password: str, role: str = 'user', api_key: str = None):
        """Add a user to the store."""
        password_hash = cls._hash_password(password)
        cls._users[username] = {
            'username': username,
            'password_hash': password_hash,
            'role': role,
            'active': True,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        if api_key:
            cls._api_keys[api_key] = username
        return cls._users[username]

    @classmethod
    def get_user(cls, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username."""
        return cls._users.get(username)

    @classmethod
    def verify_password(cls, username: str, password: str) -> bool:
        """Verify user password."""
        user = cls.get_user(username)
        if not user:
            return False
        return cls._verify_password(password, user['password_hash'])

    @classmethod
    def get_user_by_api_key(cls, api_key: str) -> Optional[Dict[str, Any]]:
        """Get user by API key."""
        username = cls._api_keys.get(api_key)
        if username:
            return cls.get_user(username)
        return None

    @classmethod
    def record_login_attempt(cls, username: str, success: bool) -> Dict[str, Any]:
        """Record login attempt and check for lockout."""
        now = datetime.now(timezone.utc)

        if username not in cls._login_attempts:
            cls._login_attempts[username] = {
                'count': 0,
                'lockout_until': None
            }

        attempt = cls._login_attempts[username]

        # Check if currently locked out
        if attempt['lockout_until'] and now < attempt['lockout_until']:
            return {
                'locked': True,
                'remaining_seconds': int((attempt['lockout_until'] - now).total_seconds())
            }

        # Reset lockout if expired
        if attempt['lockout_until'] and now >= attempt['lockout_until']:
            attempt['count'] = 0
            attempt['lockout_until'] = None

        if success:
            attempt['count'] = 0
            attempt['lockout_until'] = None
            return {'locked': False}
        else:
            attempt['count'] += 1
            if attempt['count'] >= AuthConfig.MAX_LOGIN_ATTEMPTS:
                attempt['lockout_until'] = now + timedelta(seconds=AuthConfig.LOCKOUT_DURATION)
                return {
                    'locked': True,
                    'remaining_seconds': AuthConfig.LOCKOUT_DURATION
                }
            return {
                'locked': False,
                'attempts_remaining': AuthConfig.MAX_LOGIN_ATTEMPTS - attempt['count']
            }

    @staticmethod
    def _hash_password(password: str) -> str:
        """Hash password using SHA-256 with salt."""
        salt = secrets.token_hex(16)
        hash_value = hashlib.sha256((password + salt).encode()).hexdigest()
        return f"{salt}:{hash_value}"

    @staticmethod
    def _verify_password(password: str, stored_hash: str) -> bool:
        """Verify password against stored hash."""
        try:
            salt, hash_value = stored_hash.split(':')
            new_hash = hashlib.sha256((password + salt).encode()).hexdigest()
            return secrets.compare_digest(new_hash, hash_value)
        except (ValueError, TypeError):
            return False


# -------------------------------
# JWT Token Management
# -------------------------------
class TokenManager:
    """JWT token management class."""

    @staticmethod
    def generate_access_token(
        username: str,
        role: str = 'user',
        additional_claims: Dict[str, Any] = None
    ) -> str:
        """Generate an access token.

        Args:
            username: User identifier
            role: User role for RBAC
            additional_claims: Extra claims to include

        Returns:
            JWT access token string
        """
        now = datetime.now(timezone.utc)
        payload = {
            'sub': username,
            'role': role,
            'type': 'access',
            'iat': now,
            'exp': now + timedelta(seconds=AuthConfig.JWT_ACCESS_TOKEN_EXPIRES),
            'jti': secrets.token_urlsafe(16)  # Unique token ID
        }

        if additional_claims:
            payload.update(additional_claims)

        token = jwt.encode(
            payload,
            AuthConfig.get_jwt_secret(),
            algorithm=AuthConfig.JWT_ALGORITHM
        )

        logger.debug(f"Generated access token for user: {username}")
        return token

    @staticmethod
    def generate_refresh_token(
        username: str,
        role: str = 'user'
    ) -> str:
        """Generate a refresh token.

        Args:
            username: User identifier
            role: User role for RBAC

        Returns:
            JWT refresh token string
        """
        now = datetime.now(timezone.utc)
        payload = {
            'sub': username,
            'role': role,
            'type': 'refresh',
            'iat': now,
            'exp': now + timedelta(seconds=AuthConfig.JWT_REFRESH_TOKEN_EXPIRES),
            'jti': secrets.token_urlsafe(16)
        }

        token = jwt.encode(
            payload,
            AuthConfig.get_jwt_secret(),
            algorithm=AuthConfig.JWT_ALGORITHM
        )

        logger.debug(f"Generated refresh token for user: {username}")
        return token

    @staticmethod
    def decode_token(token: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Decode and validate a JWT token.

        Args:
            token: JWT token string

        Returns:
            Tuple of (payload, error_message)
        """
        try:
            payload = jwt.decode(
                token,
                AuthConfig.get_jwt_secret(),
                algorithms=[AuthConfig.JWT_ALGORITHM]
            )
            return payload, None
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None, "Token has expired"
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            return None, "Invalid token"
        except Exception as e:
            logger.error(f"Token decode error: {e}")
            return None, "Token validation failed"

    @staticmethod
    def validate_token_type(payload: Dict[str, Any], expected_type: str) -> bool:
        """Validate token type matches expected.

        Args:
            payload: Decoded token payload
            expected_type: Expected token type (access/refresh)

        Returns:
            True if token type matches
        """
        return payload.get('type') == expected_type


# -------------------------------
# Authentication Decorators
# -------------------------------
def require_auth(roles: list = None):
    """
    Decorator to require authentication for an endpoint.

    Args:
        roles: List of allowed roles (None = any authenticated user)

    Usage:
        @app.route('/protected')
        @require_auth(roles=['admin'])
        def protected_route():
            user = g.current_user
            return jsonify({'user': user})
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Try JWT authentication first
            auth_header = request.headers.get('Authorization', '')

            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ', 1)[1]
                payload, error = TokenManager.decode_token(token)

                if error:
                    return jsonify({
                        'success': False,
                        'error': error,
                        'code': 'AUTHENTICATION_ERROR'
                    }), 401

                # Validate token type
                if not TokenManager.validate_token_type(payload, 'access'):
                    return jsonify({
                        'success': False,
                        'error': 'Invalid token type. Access token required.',
                        'code': 'INVALID_TOKEN_TYPE'
                    }), 401

                # Check roles if specified
                if roles and payload.get('role') not in roles:
                    return jsonify({
                        'success': False,
                        'error': 'Insufficient permissions',
                        'code': 'FORBIDDEN'
                    }), 403

                # Store user info in g
                g.current_user = {
                    'username': payload.get('sub'),
                    'role': payload.get('role')
                }

                return f(*args, **kwargs)

            # Try API key authentication
            api_key = request.headers.get(AuthConfig.API_KEY_HEADER, '')

            if api_key:
                user = UserStore.get_user_by_api_key(api_key)
                if user:
                    if not user.get('active', False):
                        return jsonify({
                            'success': False,
                            'error': 'User account is disabled',
                            'code': 'ACCOUNT_DISABLED'
                        }), 403

                    # Check roles if specified
                    if roles and user.get('role') not in roles:
                        return jsonify({
                            'success': False,
                            'error': 'Insufficient permissions',
                            'code': 'FORBIDDEN'
                        }), 403

                    g.current_user = {
                        'username': user['username'],
                        'role': user.get('role', 'user')
                    }
                    return f(*args, **kwargs)

                return jsonify({
                    'success': False,
                    'error': 'Invalid API key',
                    'code': 'INVALID_API_KEY'
                }), 401

            # No authentication provided
            return jsonify({
                'success': False,
                'error': 'Authentication required',
                'code': 'AUTHENTICATION_REQUIRED'
            }), 401

        return decorated_function
    return decorator


def optional_auth(f):
    """
    Decorator that optionally extracts authentication info if present.
    Does not require authentication but will populate g.current_user if valid.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        g.current_user = None

        # Try JWT authentication
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ', 1)[1]
            payload, _ = TokenManager.decode_token(token)
            if payload and TokenManager.validate_token_type(payload, 'access'):
                g.current_user = {
                    'username': payload.get('sub'),
                    'role': payload.get('role')
                }

        # Try API key authentication
        elif request.headers.get(AuthConfig.API_KEY_HEADER):
            api_key = request.headers.get(AuthConfig.API_KEY_HEADER)
            user = UserStore.get_user_by_api_key(api_key)
            if user:
                g.current_user = {
                    'username': user['username'],
                    'role': user.get('role', 'user')
                }

        return f(*args, **kwargs)
    return decorated_function


# -------------------------------
# Auth Error Handlers
# -------------------------------
class AuthError(Exception):
    """Base authentication error."""
    def __init__(self, message: str, code: str = 'AUTH_ERROR', status_code: int = 401):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


class TokenExpiredError(AuthError):
    """Token has expired."""
    def __init__(self, message: str = "Token has expired"):
        super().__init__(message, 'TOKEN_EXPIRED', 401)


class InvalidTokenError(AuthError):
    """Token is invalid."""
    def __init__(self, message: str = "Invalid token"):
        super().__init__(message, 'INVALID_TOKEN', 401)


class InsufficientPermissionsError(AuthError):
    """User lacks required permissions."""
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message, 'FORBIDDEN', 403)


class AccountLockedError(AuthError):
    """Account is locked due to too many failed attempts."""
    def __init__(self, remaining_seconds: int = 0):
        message = f"Account locked. Try again in {remaining_seconds} seconds."
        super().__init__(message, 'ACCOUNT_LOCKED', 429)
        self.remaining_seconds = remaining_seconds


# -------------------------------
# Auth Blueprint (to be registered with Flask app)
# -------------------------------
def create_auth_blueprint():
    """Create Flask blueprint for authentication routes.

    Usage:
        from auth import create_auth_blueprint
        app.register_blueprint(create_auth_blueprint(), url_prefix='/auth')
    """
    from flask import Blueprint

    auth_bp = Blueprint('auth', __name__)

    @auth_bp.route('/token', methods=['POST'])
    def generate_token():
        """
        Generate access and refresh tokens.

        Request body:
            - username: User identifier (required)
            - password: User password (required)
            OR
            - api_key: API key for token generation

        Returns:
            JSON with access_token, refresh_token, and expires_in
        """
        try:
            # Support both JSON and form data
            if request.is_json:
                data = request.get_json()
            else:
                data = request.form.to_dict()

            username = data.get('username')
            password = data.get('password')
            api_key = data.get('api_key') or data.get('apiKey')

            # API Key authentication
            if api_key:
                user = UserStore.get_user_by_api_key(api_key)
                if not user:
                    return jsonify({
                        'success': False,
                        'error': 'Invalid API key',
                        'code': 'INVALID_API_KEY'
                    }), 401

                if not user.get('active', False):
                    return jsonify({
                        'success': False,
                        'error': 'User account is disabled',
                        'code': 'ACCOUNT_DISABLED'
                    }), 403

                access_token = TokenManager.generate_access_token(
                    user['username'],
                    user.get('role', 'user')
                )
                refresh_token = TokenManager.generate_refresh_token(
                    user['username'],
                    user.get('role', 'user')
                )

                logger.info(f"Token generated via API key for user: {user['username']}")

                return jsonify({
                    'success': True,
                    'data': {
                        'access_token': access_token,
                        'refresh_token': refresh_token,
                        'token_type': 'Bearer',
                        'expires_in': AuthConfig.JWT_ACCESS_TOKEN_EXPIRES
                    }
                })

            # Username/Password authentication
            if not username or not password:
                return jsonify({
                    'success': False,
                    'error': 'Username and password are required',
                    'code': 'MISSING_CREDENTIALS'
                }), 400

            # Check for account lockout
            user = UserStore.get_user(username)
            if not user:
                # Don't reveal if user exists
                return jsonify({
                    'success': False,
                    'error': 'Invalid credentials',
                    'code': 'INVALID_CREDENTIALS'
                }), 401

            # Check lockout status
            lockout_info = UserStore.record_login_attempt(username, False)
            if lockout_info.get('locked'):
                logger.warning(f"Account locked for user: {username}")
                return jsonify({
                    'success': False,
                    'error': f"Account locked. Try again in {lockout_info['remaining_seconds']} seconds.",
                    'code': 'ACCOUNT_LOCKED',
                    'remaining_seconds': lockout_info['remaining_seconds']
                }), 429

            # Verify password
            if not UserStore.verify_password(username, password):
                logger.warning(f"Failed login attempt for user: {username}")
                return jsonify({
                    'success': False,
                    'error': 'Invalid credentials',
                    'code': 'INVALID_CREDENTIALS'
                }), 401

            # Check if user is active
            if not user.get('active', False):
                return jsonify({
                    'success': False,
                    'error': 'User account is disabled',
                    'code': 'ACCOUNT_DISABLED'
                }), 403

            # Reset login attempts on successful login
            UserStore.record_login_attempt(username, True)

            # Generate tokens
            access_token = TokenManager.generate_access_token(
                username,
                user.get('role', 'user')
            )
            refresh_token = TokenManager.generate_refresh_token(
                username,
                user.get('role', 'user')
            )

            logger.info(f"Token generated for user: {username}")

            return jsonify({
                'success': True,
                'data': {
                    'access_token': access_token,
                    'refresh_token': refresh_token,
                    'token_type': 'Bearer',
                    'expires_in': AuthConfig.JWT_ACCESS_TOKEN_EXPIRES
                }
            })

        except Exception as e:
            logger.error(f"Token generation error: {e}")
            return jsonify({
                'success': False,
                'error': 'An internal error occurred',
                'code': 'INTERNAL_ERROR'
            }), 500

    @auth_bp.route('/refresh', methods=['POST'])
    def refresh_token():
        """
        Refresh access token using refresh token.

        Request body:
            - refresh_token: Valid refresh token (required)

        Returns:
            JSON with new access_token and expires_in
        """
        try:
            # Support both JSON and form data
            if request.is_json:
                data = request.get_json()
            else:
                data = request.form.to_dict()

            refresh_token = data.get('refresh_token') or data.get('refreshToken')

            if not refresh_token:
                return jsonify({
                    'success': False,
                    'error': 'Refresh token is required',
                    'code': 'MISSING_REFRESH_TOKEN'
                }), 400

            # Decode and validate refresh token
            payload, error = TokenManager.decode_token(refresh_token)

            if error:
                return jsonify({
                    'success': False,
                    'error': error,
                    'code': 'INVALID_REFRESH_TOKEN'
                }), 401

            # Validate token type
            if not TokenManager.validate_token_type(payload, 'refresh'):
                return jsonify({
                    'success': False,
                    'error': 'Invalid token type. Refresh token required.',
                    'code': 'INVALID_TOKEN_TYPE'
                }), 401

            username = payload.get('sub')
            role = payload.get('role', 'user')

            # Verify user still exists and is active
            user = UserStore.get_user(username)
            if not user:
                return jsonify({
                    'success': False,
                    'error': 'User no longer exists',
                    'code': 'USER_NOT_FOUND'
                }), 401

            if not user.get('active', False):
                return jsonify({
                    'success': False,
                    'error': 'User account is disabled',
                    'code': 'ACCOUNT_DISABLED'
                }), 403

            # Generate new access token
            new_access_token = TokenManager.generate_access_token(username, role)

            logger.info(f"Token refreshed for user: {username}")

            return jsonify({
                'success': True,
                'data': {
                    'access_token': new_access_token,
                    'token_type': 'Bearer',
                    'expires_in': AuthConfig.JWT_ACCESS_TOKEN_EXPIRES
                }
            })

        except Exception as e:
            logger.error(f"Token refresh error: {e}")
            return jsonify({
                'success': False,
                'error': 'An internal error occurred',
                'code': 'INTERNAL_ERROR'
            }), 500

    @auth_bp.route('/validate', methods=['POST'])
    def validate_token_endpoint():
        """
        Validate an access token.

        Request body:
            - token: Access token to validate (required)

        Returns:
            JSON with validation result and user info
        """
        try:
            if request.is_json:
                data = request.get_json()
            else:
                data = request.form.to_dict()

            token = data.get('token')

            if not token:
                return jsonify({
                    'success': False,
                    'error': 'Token is required',
                    'code': 'MISSING_TOKEN'
                }), 400

            payload, error = TokenManager.decode_token(token)

            if error:
                return jsonify({
                    'success': False,
                    'error': error,
                    'code': 'INVALID_TOKEN'
                }), 401

            if not TokenManager.validate_token_type(payload, 'access'):
                return jsonify({
                    'success': False,
                    'error': 'Invalid token type',
                    'code': 'INVALID_TOKEN_TYPE'
                }), 401

            return jsonify({
                'success': True,
                'data': {
                    'valid': True,
                    'username': payload.get('sub'),
                    'role': payload.get('role'),
                    'expires_at': payload.get('exp')
                }
            })

        except Exception as e:
            logger.error(f"Token validation error: {e}")
            return jsonify({
                'success': False,
                'error': 'An internal error occurred',
                'code': 'INTERNAL_ERROR'
            }), 500

    return auth_bp


# -------------------------------
# Initialize Authentication
# -------------------------------
def init_auth(app, register_blueprint: bool = True, url_prefix: str = '/auth'):
    """
    Initialize authentication for Flask application.

    Args:
        app: Flask application instance
        register_blueprint: Whether to register auth blueprint
        url_prefix: URL prefix for auth routes

    Usage:
        from auth import init_auth
        init_auth(app, url_prefix='/auth')
    """
    # Validate configuration
    is_valid, error = AuthConfig.validate()
    if not is_valid:
        logger.error(f"Auth configuration invalid: {error}")
        raise ValueError(f"Auth configuration invalid: {error}")

    # Register blueprint
    if register_blueprint:
        auth_bp = create_auth_blueprint()
        app.register_blueprint(auth_bp, url_prefix=url_prefix)

    logger.info("Authentication initialized successfully")


# Convenience function for creating test users
def create_test_user(username: str, password: str, role: str = 'user', api_key: str = None):
    """
    Create a test user in the user store.

    This is primarily for testing purposes. In production,
    use a proper database-backed user store.
    """
    return UserStore.add_user(username, password, role, api_key)