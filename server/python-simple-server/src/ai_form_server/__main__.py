# -*- coding: utf-8 -*-
# -------------------------------
# @File: __main__.py
# @Time: 2025/03/17
# @Author: cilang
# @Email: cilanguser@Gmail.com
# @Desc: Application entry point for python -m ai_form_server
# -------------------------------
"""
Entry point for running AI-Form Server as a module.

Usage:
    python -m ai_form_server

Environment Variables:
    FLASK_DEBUG: Enable debug mode (default: false)
    FLASK_HOST: Server host (default: 0.0.0.0)
    FLASK_PORT: Server port (default: 5001)
"""

from __future__ import annotations

import logging

from ai_form_server.app import create_app
from ai_form_server.config import get_config

logger = logging.getLogger(__name__)


def main() -> None:
    """
    Main entry point for the AI-Form Server.

    Creates and runs the Flask application using configuration
    from environment variables.
    """
    config = get_config()

    logger.info(f"Starting AI-Form Server on {config.flask.host}:{config.flask.port}")
    logger.info(f"Debug mode: {config.flask.debug}")
    logger.info(f"Model: {config.ai.model_name}")

    app = create_app(config)

    app.run(
        host=config.flask.host,
        port=config.flask.port,
        debug=config.flask.debug,
    )


if __name__ == "__main__":
    main()