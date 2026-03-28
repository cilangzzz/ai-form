# -*- coding: utf-8 -*-
# -------------------------------
# @File: app.py
# @Time: 2025/03/17
# @Author: cilang
# @Email: cilanguser@Gmail.com
# @Desc: Flask application factory
# -------------------------------
"""
Flask Application Factory for AI-Form Server.

Provides:
- Application factory pattern for flexible app creation
- Configuration management
- Extension initialization
- Blueprint registration
- Middleware setup
"""

from __future__ import annotations

import logging
import sys
import uuid
from pathlib import Path

# Fix module path when running directly (e.g., PyCharm docrunner)
# This allows the file to be run both directly and as a module
_src_dir = Path(__file__).resolve().parent.parent
if str(_src_dir) not in sys.path:
    sys.path.insert(0, str(_src_dir))
from datetime import timedelta
from typing import Any, Dict, Optional

from flask import Flask, Response, g, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from ai_form_server.config import Config, get_config, init_config
from ai_form_server.services.chat import ChatAssistant
from ai_form_server.services.roles import DEFAULT_FORM_ROLE

# Configure logging
logger = logging.getLogger(__name__)


# Security headers middleware
SECURITY_HEADERS: Dict[str, str] = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Content-Security-Policy": (
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; font-src 'self'; connect-src 'self'; "
        "frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
    ),
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
}


def create_app(config: Optional[Config] = None) -> Flask:
    """
    Create and configure the Flask application.

    Uses the application factory pattern for flexible configuration
    and testing.

    Args:
        config: Optional Config instance. If not provided, uses global config.

    Returns:
        Configured Flask application instance

    Example:
        >>> app = create_app()  # doctest: +SKIP
        >>> app.run(host='0.0.0.0', port=5001)  # doctest: +SKIP

        >>> # With custom config
        >>> config = Config.from_env()  # doctest: +SKIP
        >>> app = create_app(config)  # doctest: +SKIP
    """
    # Initialize configuration
    if config is None:
        config = get_config()
    else:
        init_config(config)

    # Create Flask app
    app = Flask(__name__)

    # Store config in app for access throughout
    app.config["APP_CONFIG"] = config

    # Configure Flask settings
    app.config.update(
        {
            "DEBUG": config.flask.debug,
            "TESTING": config.flask.testing,
            "MAX_CONTENT_LENGTH": config.flask.max_content_length,
            "SECRET_KEY": config.security.jwt_secret_key,
            # JWT configuration
            "JWT_SECRET_KEY": config.security.jwt_secret_key,
            "JWT_ACCESS_TOKEN_EXPIRES": timedelta(
                seconds=config.security.jwt_access_token_expires
            ),
            "JWT_REFRESH_TOKEN_EXPIRES": timedelta(
                seconds=config.security.jwt_refresh_token_expires
            ),
        }
    )

    # Setup logging
    _setup_logging(config.log_level)

    # Initialize extensions
    _init_cors(app, config)
    limiter = _init_limiter(app, config)

    # Register middlewares
    _register_middlewares(app)

    # Initialize chat assistant
    chat_assistant = _init_chat_assistant(config)

    # Register blueprints
    _register_blueprints(app, config, chat_assistant, limiter)

    # Register error handlers
    _register_error_handlers(app)

    # Validate configuration
    _validate_config(config)

    logger.info(
        f"AI-Form Server initialized - Debug: {config.flask.debug}, "
        f"Model: {config.ai.model_name}"
    )

    return app


def _setup_logging(log_level: str) -> None:
    """Setup application logging."""
    level = getattr(logging, log_level.upper(), logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )


def _init_cors(app: Flask, config: Config) -> None:
    """Initialize CORS extension."""
    cors_config = config.cors

    CORS(
        app,
        resources={
            r"/ai/*": {
                "origins": cors_config.origins,
                "methods": cors_config.methods,
                "allow_headers": cors_config.allow_headers,
                "max_age": cors_config.max_age,
            },
            r"/auth/*": {
                "origins": cors_config.origins,
                "methods": ["GET", "POST", "OPTIONS"],
                "allow_headers": cors_config.allow_headers,
                "max_age": cors_config.max_age,
            },
        },
    )


def _init_limiter(app: Flask, config: Config) -> Limiter:
    """Initialize rate limiter."""
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=[config.rate_limit.default],
        storage_uri="memory://",
    )
    return limiter


def _register_middlewares(app: Flask) -> None:
    """Register request/response middlewares."""

    @app.before_request
    def add_request_id() -> None:
        """Generate and attach a unique request ID for tracing."""
        request_id = request.headers.get("X-Request-ID")
        if not request_id:
            request_id = str(uuid.uuid4())
        g.request_id = request_id

    @app.after_request
    def add_security_headers(response: Response) -> Response:
        """Add security headers to all responses."""
        for header, value in SECURITY_HEADERS.items():
            response.headers[header] = value
        response.headers.pop("Server", None)
        return response

    @app.after_request
    def add_request_id_header(response: Response) -> Response:
        """Add request ID to response headers."""
        if hasattr(g, "request_id"):
            response.headers["X-Request-ID"] = g.request_id
        return response


def _init_chat_assistant(config: Config) -> ChatAssistant:
    """Initialize the chat assistant with configuration."""
    api_key, base_url, model_name, proxy = config.get_ai_config_with_fallback()

    chat_assistant = ChatAssistant(
        api_key=api_key,
        base_url=base_url,
        proxy=proxy if proxy else None,
        model=model_name,
    )
    chat_assistant.set_role(DEFAULT_FORM_ROLE)

    return chat_assistant


def _register_blueprints(
    app: Flask,
    config: Config,
    chat_assistant: ChatAssistant,
    limiter: Limiter,
) -> None:
    """Register Flask blueprints."""
    from ai_form_server.auth import init_auth
    from ai_form_server.routes.chat import create_chat_blueprint

    # Register auth blueprint
    init_auth(app, register_blueprint=True, url_prefix="/auth")

    # Register chat blueprint with rate limiting
    chat_bp = create_chat_blueprint(chat_assistant)

    # Apply rate limiting to chat endpoint
    @chat_bp.route("/chat_remark", methods=["POST"])
    @limiter.limit(config.rate_limit.chat)
    def chat_remark_rate_limited():
        # This will be handled by the blueprint's existing route
        pass

    app.register_blueprint(chat_bp, url_prefix="/ai")


def _register_error_handlers(app: Flask) -> None:
    """Register error handlers."""

    @app.errorhandler(400)
    def bad_request(error: Any) -> tuple:
        """Handle bad request errors."""
        return jsonify(
            {
                "success": False,
                "error": "Bad request",
                "code": "BAD_REQUEST",
            }
        ), 400

    @app.errorhandler(404)
    def not_found(error: Any) -> tuple:
        """Handle not found errors."""
        return jsonify(
            {
                "success": False,
                "error": "Resource not found",
                "code": "NOT_FOUND",
            }
        ), 404

    @app.errorhandler(429)
    def rate_limit_exceeded(error: Any) -> tuple:
        """Handle rate limit errors."""
        return jsonify(
            {
                "success": False,
                "error": "Rate limit exceeded. Please try again later.",
                "code": "RATE_LIMIT_EXCEEDED",
            }
        ), 429

    @app.errorhandler(500)
    def internal_error(error: Any) -> tuple:
        """Handle internal server errors."""
        logger.error(f"Internal server error: {error}")
        return jsonify(
            {
                "success": False,
                "error": "Internal server error",
                "code": "INTERNAL_ERROR",
            }
        ), 500

    @app.errorhandler(Exception)
    def handle_exception(error: Exception) -> tuple:
        """Handle unexpected exceptions."""
        logger.exception(f"Unexpected error: {error}")
        return jsonify(
            {
                "success": False,
                "error": "An unexpected error occurred",
                "code": "UNEXPECTED_ERROR",
            }
        ), 500


def _validate_config(config: Config) -> None:
    """Validate configuration and log warnings."""
    is_valid, errors = config.validate()

    if not is_valid:
        for error in errors:
            logger.warning(f"Configuration warning: {error}")

    if not config.security.jwt_secret_key or config.security.jwt_secret_key == "":
        logger.warning(
            "JWT_SECRET_KEY is not set. Authentication will not work properly."
        )

    if not config.ai.api_key:
        logger.warning(
            "AI_API_KEY is not configured. AI features may not work properly."
        )


__all__ = [
    "create_app",
]


if __name__ == "__main__":
    # Run server when executed directly
    config = get_config()
    logger.info(f"Starting AI-Form Server on {config.flask.host}:{config.flask.port}")
    logger.info(f"Debug mode: {config.flask.debug}")

    app = create_app(config)
    app.run(
        host=config.flask.host,
        port=config.flask.port,
        debug=config.flask.debug,
    )