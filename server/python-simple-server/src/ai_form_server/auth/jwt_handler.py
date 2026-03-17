# -*- coding: utf-8 -*-
# -------------------------------
# @File: jwt_handler.py
# @Time: 2025/03/17
# @Author: cilang
# @Email: cilanguser@Gmail.com
# @Desc: JWT token management
# -------------------------------
"""
JWT token management module.

Provides JWT token generation, validation, and management functionality.
"""

from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

import jwt

logger = logging.getLogger(__name__)


class TokenManager:
    """JWT token management class.

    Provides methods for generating, decoding, and validating JWT tokens.

    Example:
        >>> from ai_form_server.auth.jwt_handler import TokenManager
        >>> token = TokenManager.generate_access_token("user123", "user")
        >>> payload, error = TokenManager.decode_token(token)
    """

    @staticmethod
    def generate_access_token(
        username: str,
        secret_key: str,
        algorithm: str = "HS256",
        expires_seconds: int = 3600,
        role: str = "user",
        additional_claims: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Generate an access token.

        Args:
            username: User identifier
            secret_key: Secret key for signing
            algorithm: JWT algorithm (default: HS256)
            expires_seconds: Token expiration time in seconds
            role: User role for RBAC
            additional_claims: Extra claims to include

        Returns:
            JWT access token string
        """
        now = datetime.now(timezone.utc)
        payload = {
            "sub": username,
            "role": role,
            "type": "access",
            "iat": now,
            "exp": now + timedelta(seconds=expires_seconds),
            "jti": secrets.token_urlsafe(16),  # Unique token ID
        }

        if additional_claims:
            payload.update(additional_claims)

        token = jwt.encode(payload, secret_key, algorithm=algorithm)

        logger.debug(f"Generated access token for user: {username}")
        return token

    @staticmethod
    def generate_refresh_token(
        username: str,
        secret_key: str,
        algorithm: str = "HS256",
        expires_seconds: int = 2592000,
        role: str = "user",
    ) -> str:
        """
        Generate a refresh token.

        Args:
            username: User identifier
            secret_key: Secret key for signing
            algorithm: JWT algorithm (default: HS256)
            expires_seconds: Token expiration time in seconds (default: 30 days)
            role: User role for RBAC

        Returns:
            JWT refresh token string
        """
        now = datetime.now(timezone.utc)
        payload = {
            "sub": username,
            "role": role,
            "type": "refresh",
            "iat": now,
            "exp": now + timedelta(seconds=expires_seconds),
            "jti": secrets.token_urlsafe(16),
        }

        token = jwt.encode(payload, secret_key, algorithm=algorithm)

        logger.debug(f"Generated refresh token for user: {username}")
        return token

    @staticmethod
    def decode_token(
        token: str,
        secret_key: str,
        algorithm: str = "HS256",
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Decode and validate a JWT token.

        Args:
            token: JWT token string
            secret_key: Secret key for verification
            algorithm: JWT algorithm (default: HS256)

        Returns:
            Tuple of (payload, error_message)
        """
        try:
            payload = jwt.decode(
                token,
                secret_key,
                algorithms=[algorithm],
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
        """
        Validate token type matches expected.

        Args:
            payload: Decoded token payload
            expected_type: Expected token type (access/refresh)

        Returns:
            True if token type matches
        """
        return payload.get("type") == expected_type


class UserStore:
    """
    In-memory user store for demonstration.

    In production, this should be replaced with a database-backed user store.

    Attributes:
        _users: Dictionary of user data
        _api_keys: Mapping of API keys to usernames
        _login_attempts: Tracking of login attempts for lockout
    """

    _users: Dict[str, Dict[str, Any]] = {}
    _api_keys: Dict[str, str] = {}  # api_key -> username mapping
    _login_attempts: Dict[str, Dict[str, Any]] = {}  # username -> {count, lockout_until}

    @classmethod
    def initialize(cls, users: Optional[Dict[str, Dict[str, Any]]] = None) -> "UserStore":
        """
        Initialize user store with default users.

        Args:
            users: Optional dictionary of users to initialize with

        Returns:
            The UserStore class for chaining
        """
        if users:
            cls._users = users
        return cls

    @classmethod
    def add_user(
        cls,
        username: str,
        password: str,
        role: str = "user",
        api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Add a user to the store.

        Args:
            username: User identifier
            password: User password (will be hashed)
            role: User role (default: user)
            api_key: Optional API key for the user

        Returns:
            The created user data
        """
        password_hash = cls._hash_password(password)
        cls._users[username] = {
            "username": username,
            "password_hash": password_hash,
            "role": role,
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        if api_key:
            cls._api_keys[api_key] = username
        return cls._users[username]

    @classmethod
    def get_user(cls, username: str) -> Optional[Dict[str, Any]]:
        """
        Get user by username.

        Args:
            username: User identifier

        Returns:
            User data or None if not found
        """
        return cls._users.get(username)

    @classmethod
    def verify_password(cls, username: str, password: str) -> bool:
        """
        Verify user password.

        Args:
            username: User identifier
            password: Password to verify

        Returns:
            True if password matches
        """
        user = cls.get_user(username)
        if not user:
            return False
        return cls._verify_password(password, user["password_hash"])

    @classmethod
    def get_user_by_api_key(cls, api_key: str) -> Optional[Dict[str, Any]]:
        """
        Get user by API key.

        Args:
            api_key: API key to look up

        Returns:
            User data or None if not found
        """
        username = cls._api_keys.get(api_key)
        if username:
            return cls.get_user(username)
        return None

    @classmethod
    def record_login_attempt(
        cls,
        username: str,
        success: bool,
        max_attempts: int = 5,
        lockout_duration: int = 300,
    ) -> Dict[str, Any]:
        """
        Record login attempt and check for lockout.

        Args:
            username: User identifier
            success: Whether the login was successful
            max_attempts: Maximum failed attempts before lockout
            lockout_duration: Lockout duration in seconds

        Returns:
            Dictionary with lockout status
        """
        now = datetime.now(timezone.utc)

        if username not in cls._login_attempts:
            cls._login_attempts[username] = {
                "count": 0,
                "lockout_until": None,
            }

        attempt = cls._login_attempts[username]

        # Check if currently locked out
        if attempt["lockout_until"] and now < attempt["lockout_until"]:
            return {
                "locked": True,
                "remaining_seconds": int(
                    (attempt["lockout_until"] - now).total_seconds()
                ),
            }

        # Reset lockout if expired
        if attempt["lockout_until"] and now >= attempt["lockout_until"]:
            attempt["count"] = 0
            attempt["lockout_until"] = None

        if success:
            attempt["count"] = 0
            attempt["lockout_until"] = None
            return {"locked": False}
        else:
            attempt["count"] += 1
            if attempt["count"] >= max_attempts:
                attempt["lockout_until"] = now + timedelta(seconds=lockout_duration)
                return {
                    "locked": True,
                    "remaining_seconds": lockout_duration,
                }
            return {
                "locked": False,
                "attempts_remaining": max_attempts - attempt["count"],
            }

    @staticmethod
    def _hash_password(password: str) -> str:
        """
        Hash password using SHA-256 with salt.

        Args:
            password: Plain text password

        Returns:
            Hashed password string (salt:hash)
        """
        import hashlib

        salt = secrets.token_hex(16)
        hash_value = hashlib.sha256((password + salt).encode()).hexdigest()
        return f"{salt}:{hash_value}"

    @staticmethod
    def _verify_password(password: str, stored_hash: str) -> bool:
        """
        Verify password against stored hash.

        Args:
            password: Plain text password to verify
            stored_hash: Stored hash (salt:hash format)

        Returns:
            True if password matches
        """
        import hashlib

        try:
            salt, hash_value = stored_hash.split(":")
            new_hash = hashlib.sha256((password + salt).encode()).hexdigest()
            return secrets.compare_digest(new_hash, hash_value)
        except (ValueError, TypeError):
            return False

    @classmethod
    def reset(cls) -> None:
        """Reset all stored data (for testing)."""
        cls._users = {}
        cls._api_keys = {}
        cls._login_attempts = {}


def create_test_user(
    username: str,
    password: str,
    role: str = "user",
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Create a test user in the user store.

    This is primarily for testing purposes. In production,
    use a proper database-backed user store.

    Args:
        username: User identifier
        password: User password
        role: User role
        api_key: Optional API key

    Returns:
        Created user data
    """
    return UserStore.add_user(username, password, role, api_key)


__all__ = [
    "TokenManager",
    "UserStore",
    "create_test_user",
]