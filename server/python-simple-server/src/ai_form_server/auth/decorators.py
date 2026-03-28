# -*- coding: utf-8 -*-
# -------------------------------
# @File: decorators.py
# @Time: 2025/03/17
# @Author: cilang
# @Email: cilanguser@Gmail.com
# @Desc: Authentication decorators
# -------------------------------
"""
Authentication decorators for Flask routes.

Provides decorators for protecting routes with JWT or API key authentication.
"""

from __future__ import annotations

import logging
from functools import wraps
from typing import Any, Callable, Dict, List, Optional

from flask import g, jsonify, request

from ai_form_server.auth.jwt_handler import TokenManager, UserStore

logger = logging.getLogger(__name__)


def require_auth(roles: Optional[List[str]] = None) -> Callable:
    """
    Decorator to require authentication for an endpoint.

    Supports both JWT Bearer token and API key authentication.

    Args:
        roles: List of allowed roles (None = any authenticated user)

    Returns:
        Decorated function

    Usage:
        @app.route('/protected')
        @require_auth(roles=['admin'])
        def protected_route():
            user = g.current_user
            return jsonify({'user': user})
    """

    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args: Any, **kwargs: Any) -> Any:
            # Import here to avoid circular imports
            from ai_form_server.config import get_config

            config = get_config()
            secret_key = config.security.jwt_secret_key
            algorithm = config.security.jwt_algorithm

            # Try JWT authentication first
            auth_header = request.headers.get("Authorization", "")

            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ", 1)[1]
                payload, error = TokenManager.decode_token(token, secret_key, algorithm)

                if error:
                    return jsonify(
                        {
                            "success": False,
                            "error": error,
                            "code": "AUTHENTICATION_ERROR",
                        }
                    ), 401

                # Validate token type
                if not TokenManager.validate_token_type(payload, "access"):
                    return jsonify(
                        {
                            "success": False,
                            "error": "Invalid token type. Access token required.",
                            "code": "INVALID_TOKEN_TYPE",
                        }
                    ), 401

                # Check roles if specified
                if roles and payload.get("role") not in roles:
                    return jsonify(
                        {
                            "success": False,
                            "error": "Insufficient permissions",
                            "code": "FORBIDDEN",
                        }
                    ), 403

                # Store user info in g
                g.current_user = {
                    "username": payload.get("sub"),
                    "role": payload.get("role"),
                }

                return f(*args, **kwargs)

            # Try API key authentication
            # Get API key from X-API-Key header
            api_key = request.headers.get("X-API-Key", "")

            if api_key:
                # First check against configured API keys (simple validation)
                if api_key in config.security.api_keys:
                    g.current_user = {
                        "username": "api_user",
                        "role": "user",
                    }
                    return f(*args, **kwargs)

                # Then check UserStore for user-bound API keys
                user = UserStore.get_user_by_api_key(api_key)
                if user:
                    if not user.get("active", False):
                        return jsonify(
                            {
                                "success": False,
                                "error": "User account is disabled",
                                "code": "ACCOUNT_DISABLED",
                            }
                        ), 403

                    # Check roles if specified
                    if roles and user.get("role") not in roles:
                        return jsonify(
                            {
                                "success": False,
                                "error": "Insufficient permissions",
                                "code": "FORBIDDEN",
                            }
                        ), 403

                    g.current_user = {
                        "username": user["username"],
                        "role": user.get("role", "user"),
                    }
                    return f(*args, **kwargs)

                return jsonify(
                    {
                        "success": False,
                        "error": "Invalid API key",
                        "code": "INVALID_API_KEY",
                    }
                ), 401

            # No authentication provided
            return jsonify(
                {
                    "success": False,
                    "error": "Authentication required",
                    "code": "AUTHENTICATION_REQUIRED",
                }
            ), 401

        return decorated_function

    return decorator


def optional_auth(f: Callable) -> Callable:
    """
    Decorator that optionally extracts authentication info if present.

    Does not require authentication but will populate g.current_user if valid.
    """

    @wraps(f)
    def decorated_function(*args: Any, **kwargs: Any) -> Any:
        from ai_form_server.config import get_config

        config = get_config()
        secret_key = config.security.jwt_secret_key
        algorithm = config.security.jwt_algorithm

        g.current_user = None

        # Try JWT authentication
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            payload, _ = TokenManager.decode_token(token, secret_key, algorithm)
            if payload and TokenManager.validate_token_type(payload, "access"):
                g.current_user = {
                    "username": payload.get("sub"),
                    "role": payload.get("role"),
                }

        # Try API key authentication
        elif request.headers.get("X-API-Key"):
            api_key = request.headers.get("X-API-Key")
            user = UserStore.get_user_by_api_key(api_key)
            if user:
                g.current_user = {
                    "username": user["username"],
                    "role": user.get("role", "user"),
                }

        return f(*args, **kwargs)

    return decorated_function


def validate_api_key(api_key: str) -> bool:
    """
    Validate API key against configured keys.

    Args:
        api_key: API key to validate

    Returns:
        True if valid
    """
    from ai_form_server.config import get_config

    config = get_config()
    if not config.security.api_keys:
        logger.warning("No API keys configured - API key authentication disabled")
        return False
    return api_key in config.security.api_keys


def get_api_key_from_request() -> Optional[str]:
    """
    Extract API key from request headers.

    Returns:
        API key or None
    """
    return request.headers.get("X-API-Key")


__all__ = [
    "require_auth",
    "optional_auth",
    "validate_api_key",
    "get_api_key_from_request",
]