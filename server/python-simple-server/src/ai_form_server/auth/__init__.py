# -*- coding: utf-8 -*-
# -------------------------------
# @File: __init__.py
# @Time: 2025/03/17
# @Author: cilang
# @Email: cilanguser@Gmail.com
# @Desc: Authentication package initialization
# -------------------------------
"""
AI-Form Server Authentication Package.

This package provides authentication functionality:
- JWT token generation and validation
- API key authentication
- Role-based access control
- Authentication decorators

Usage:
    from ai_form_server.auth import (
        TokenManager,
        UserStore,
        require_auth,
        init_auth,
    )
"""

from ai_form_server.auth.decorators import (
    get_api_key_from_request,
    optional_auth,
    require_auth,
    validate_api_key,
)
from ai_form_server.auth.jwt_handler import (
    TokenManager,
    UserStore,
    create_test_user,
)


def init_auth(app, register_blueprint: bool = True, url_prefix: str = "/auth") -> None:
    """
    Initialize authentication for Flask application.

    Args:
        app: Flask application instance
        register_blueprint: Whether to register auth blueprint
        url_prefix: URL prefix for auth routes

    Usage:
        from ai_form_server.auth import init_auth
        init_auth(app, url_prefix='/auth')
    """
    from ai_form_server.config import get_config
    from flask import Blueprint, jsonify, request

    config = get_config()

    # Validate configuration
    is_valid, error = config.security.validate()
    if not is_valid:
        logger.error(f"Auth configuration invalid: {error}")
        raise ValueError(f"Auth configuration invalid: {error}")

    if register_blueprint:
        auth_bp = Blueprint("auth", __name__)

        @auth_bp.route("/token", methods=["POST"])
        def generate_token():
            """Generate access and refresh tokens."""
            from datetime import datetime, timedelta, timezone

            if request.is_json:
                data = request.get_json()
            else:
                data = request.form.to_dict()

            username = data.get("username")
            password = data.get("password")
            api_key = data.get("api_key") or data.get("apiKey")

            # API Key authentication
            if api_key:
                user = UserStore.get_user_by_api_key(api_key)
                if not user:
                    return jsonify(
                        {
                            "success": False,
                            "error": "Invalid API key",
                            "code": "INVALID_API_KEY",
                        }
                    ), 401

                if not user.get("active", False):
                    return jsonify(
                        {
                            "success": False,
                            "error": "User account is disabled",
                            "code": "ACCOUNT_DISABLED",
                        }
                    ), 403

                access_token = TokenManager.generate_access_token(
                    user["username"],
                    config.security.jwt_secret_key,
                    config.security.jwt_algorithm,
                    config.security.jwt_access_token_expires,
                    user.get("role", "user"),
                )
                refresh_token = TokenManager.generate_refresh_token(
                    user["username"],
                    config.security.jwt_secret_key,
                    config.security.jwt_algorithm,
                    config.security.jwt_refresh_token_expires,
                    user.get("role", "user"),
                )

                return jsonify(
                    {
                        "success": True,
                        "data": {
                            "access_token": access_token,
                            "refresh_token": refresh_token,
                            "token_type": "Bearer",
                            "expires_in": config.security.jwt_access_token_expires,
                        },
                    }
                )

            # Username/Password authentication
            if not username or not password:
                return jsonify(
                    {
                        "success": False,
                        "error": "Username and password are required",
                        "code": "MISSING_CREDENTIALS",
                    }
                ), 400

            user = UserStore.get_user(username)
            if not user:
                return jsonify(
                    {
                        "success": False,
                        "error": "Invalid credentials",
                        "code": "INVALID_CREDENTIALS",
                    }
                ), 401

            # Verify password
            if not UserStore.verify_password(username, password):
                return jsonify(
                    {
                        "success": False,
                        "error": "Invalid credentials",
                        "code": "INVALID_CREDENTIALS",
                    }
                ), 401

            # Check if user is active
            if not user.get("active", False):
                return jsonify(
                    {
                        "success": False,
                        "error": "User account is disabled",
                        "code": "ACCOUNT_DISABLED",
                    }
                ), 403

            # Generate tokens
            access_token = TokenManager.generate_access_token(
                username,
                config.security.jwt_secret_key,
                config.security.jwt_algorithm,
                config.security.jwt_access_token_expires,
                user.get("role", "user"),
            )
            refresh_token = TokenManager.generate_refresh_token(
                username,
                config.security.jwt_secret_key,
                config.security.jwt_algorithm,
                config.security.jwt_refresh_token_expires,
                user.get("role", "user"),
            )

            return jsonify(
                {
                    "success": True,
                    "data": {
                        "access_token": access_token,
                        "refresh_token": refresh_token,
                        "token_type": "Bearer",
                        "expires_in": config.security.jwt_access_token_expires,
                    },
                }
            )

        @auth_bp.route("/refresh", methods=["POST"])
        def refresh_token():
            """Refresh access token using refresh token."""
            if request.is_json:
                data = request.get_json()
            else:
                data = request.form.to_dict()

            refresh_token_value = data.get("refresh_token") or data.get("refreshToken")

            if not refresh_token_value:
                return jsonify(
                    {
                        "success": False,
                        "error": "Refresh token is required",
                        "code": "MISSING_REFRESH_TOKEN",
                    }
                ), 400

            payload, error = TokenManager.decode_token(
                refresh_token_value,
                config.security.jwt_secret_key,
                config.security.jwt_algorithm,
            )

            if error:
                return jsonify(
                    {
                        "success": False,
                        "error": error,
                        "code": "INVALID_REFRESH_TOKEN",
                    }
                ), 401

            if not TokenManager.validate_token_type(payload, "refresh"):
                return jsonify(
                    {
                        "success": False,
                        "error": "Invalid token type. Refresh token required.",
                        "code": "INVALID_TOKEN_TYPE",
                    }
                ), 401

            username = payload.get("sub")
            role = payload.get("role", "user")

            user = UserStore.get_user(username)
            if not user:
                return jsonify(
                    {
                        "success": False,
                        "error": "User no longer exists",
                        "code": "USER_NOT_FOUND",
                    }
                ), 401

            if not user.get("active", False):
                return jsonify(
                    {
                        "success": False,
                        "error": "User account is disabled",
                        "code": "ACCOUNT_DISABLED",
                    }
                ), 403

            new_access_token = TokenManager.generate_access_token(
                username,
                config.security.jwt_secret_key,
                config.security.jwt_algorithm,
                config.security.jwt_access_token_expires,
                role,
            )

            return jsonify(
                {
                    "success": True,
                    "data": {
                        "access_token": new_access_token,
                        "token_type": "Bearer",
                        "expires_in": config.security.jwt_access_token_expires,
                    },
                }
            )

        @auth_bp.route("/validate", methods=["POST"])
        def validate_token():
            """Validate an access token."""
            if request.is_json:
                data = request.get_json()
            else:
                data = request.form.to_dict()

            token = data.get("token")

            if not token:
                return jsonify(
                    {
                        "success": False,
                        "error": "Token is required",
                        "code": "MISSING_TOKEN",
                    }
                ), 400

            payload, error = TokenManager.decode_token(
                token,
                config.security.jwt_secret_key,
                config.security.jwt_algorithm,
            )

            if error:
                return jsonify(
                    {
                        "success": False,
                        "error": error,
                        "code": "INVALID_TOKEN",
                    }
                ), 401

            if not TokenManager.validate_token_type(payload, "access"):
                return jsonify(
                    {
                        "success": False,
                        "error": "Invalid token type",
                        "code": "INVALID_TOKEN_TYPE",
                    }
                ), 401

            return jsonify(
                {
                    "success": True,
                    "data": {
                        "valid": True,
                        "username": payload.get("sub"),
                        "role": payload.get("role"),
                        "expires_at": payload.get("exp"),
                    },
                }
            )

        app.register_blueprint(auth_bp, url_prefix=url_prefix)

    logger.info("Authentication initialized successfully")


import logging

logger = logging.getLogger(__name__)

__all__ = [
    "TokenManager",
    "UserStore",
    "require_auth",
    "optional_auth",
    "validate_api_key",
    "get_api_key_from_request",
    "init_auth",
    "create_test_user",
]