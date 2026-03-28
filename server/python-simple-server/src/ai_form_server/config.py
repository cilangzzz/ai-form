# -*- coding: utf-8 -*-
# -------------------------------
# @File: config.py
# @Time: 2025/03/17
# @Author: cilang
# @Email: cilanguser@Gmail.com
# @Desc: Application configuration management
# -------------------------------
"""
Configuration management module for AI-Form Server.

Provides centralized configuration with:
- Environment variable support
- Configuration file loading
- Type-safe configuration access
- Validation and defaults
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)


@dataclass
class FlaskConfig:
    """Flask server configuration."""

    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 5001
    max_content_length: int = 1048576  # 1MB default
    testing: bool = False

    @classmethod
    def from_env(cls) -> "FlaskConfig":
        """Create FlaskConfig from environment variables."""
        return cls(
            debug=os.getenv("FLASK_DEBUG", "false").lower() in ("true", "1", "yes"),
            host=os.getenv("FLASK_HOST", "0.0.0.0"),
            port=int(os.getenv("FLASK_PORT", "5001")),
            max_content_length=int(os.getenv("MAX_CONTENT_LENGTH", "1048576")),
            testing=os.getenv("TESTING", "false").lower() in ("true", "1", "yes"),
        )


@dataclass
class AIConfig:
    """AI service configuration."""

    api_key: str = ""
    base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    model_name: str = "qwen-turbo-latest"
    proxy: str = ""

    @classmethod
    def from_env(cls) -> "AIConfig":
        """Create AIConfig from environment variables."""
        return cls(
            api_key=os.getenv("AI_API_KEY", ""),
            base_url=os.getenv(
                "AI_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1"
            ),
            model_name=os.getenv("AI_MODEL_NAME", "qwen-turbo-latest"),
            proxy=os.getenv("AI_PROXY", ""),
        )


@dataclass
class SecurityConfig:
    """Security configuration."""

    max_input_length: int = 10000  # 10KB default
    max_context_length: int = 50000  # 50KB default

    # JWT settings
    jwt_secret_key: str = "123456"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expires: int = 3600  # 1 hour
    jwt_refresh_token_expires: int = 2592000  # 30 days

    # API Key settings
    api_keys: List[str] = field(default_factory=list)

    @classmethod
    def from_env(cls) -> "SecurityConfig":
        """Create SecurityConfig from environment variables."""
        api_keys_str = os.getenv("API_KEYS", "")
        api_keys = [k.strip() for k in api_keys_str.split(",") if k.strip()]

        return cls(
            max_input_length=int(os.getenv("MAX_INPUT_LENGTH", "10000")),
            max_context_length=int(os.getenv("MAX_CONTEXT_LENGTH", "50000")),
            jwt_secret_key=os.getenv("JWT_SECRET_KEY", "123456"),
            jwt_algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
            jwt_access_token_expires=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "3600")),
            jwt_refresh_token_expires=int(
                os.getenv("JWT_REFRESH_TOKEN_EXPIRES", "2592000")
            ),
            api_keys=api_keys,
        )

    def validate(self) -> Tuple[bool, str]:
        """Validate security configuration.

        Returns:
            Tuple of (is_valid, error_message)
        """
        if not self.jwt_secret_key:
            logger.warning("JWT_SECRET_KEY is not configured")
            return False, "JWT_SECRET_KEY must be configured"

        if len(self.jwt_secret_key) < 32:
            logger.warning("JWT_SECRET_KEY is too short, recommend at least 32 characters")

        return True, ""


@dataclass
class RateLimitConfig:
    """Rate limiting configuration."""

    default: str = "100 per hour"
    chat: str = "30 per minute"
    api_key: str = "60 per minute"

    @classmethod
    def from_env(cls) -> "RateLimitConfig":
        """Create RateLimitConfig from environment variables."""
        return cls(
            default=os.getenv("RATE_LIMIT_DEFAULT", "100 per hour"),
            chat=os.getenv("RATE_LIMIT_CHAT", "30 per minute"),
            api_key=os.getenv("API_KEY_RATE_LIMIT", "60 per minute"),
        )


@dataclass
class CORSConfig:
    """CORS configuration."""

    origins: List[str] = field(default_factory=lambda: ["*"])
    methods: List[str] = field(default_factory=lambda: ["POST", "OPTIONS"])
    allow_headers: List[str] = field(
        default_factory=lambda: ["Content-Type", "Authorization", "X-API-Key"]
    )
    max_age: int = 3600

    @classmethod
    def from_env(cls) -> "CORSConfig":
        """Create CORSConfig from environment variables."""
        origins_str = os.getenv("CORS_ORIGINS", "*")
        origins = [o.strip() for o in origins_str.split(",")]

        return cls(origins=origins)


@dataclass
class RequestParamConfig:
    """Request parameter configuration following Skill specification."""

    validate_schema: bool = True
    sanitize_input: bool = True
    max_metadata_fields: int = 100

    # Generation options defaults
    default_generation_count: int = 1
    default_generation_mode: str = "standard"
    allowed_generation_modes: List[str] = field(
        default_factory=lambda: ["quick", "standard", "detailed"]
    )
    allowed_locales: List[str] = field(
        default_factory=lambda: ["zh-CN", "en-US", "ja-JP"]
    )

    @classmethod
    def from_env(cls) -> "RequestParamConfig":
        return cls(
            validate_schema=os.getenv("VALIDATE_SCHEMA", "true").lower() == "true",
            sanitize_input=os.getenv("SANITIZE_INPUT", "true").lower() == "true",
            max_metadata_fields=int(os.getenv("MAX_METADATA_FIELDS", "100")),
            default_generation_count=int(os.getenv("DEFAULT_GENERATION_COUNT", "1")),
            default_generation_mode=os.getenv("DEFAULT_GENERATION_MODE", "standard"),
        )


@dataclass
class AIOptionsConfig:
    """AI options configuration for multi-role support."""

    default_model: str = "qwen-turbo-latest"
    default_temperature: float = 0.7
    default_role_type: str = "default_form"

    allowed_models: List[str] = field(
        default_factory=lambda: ["qwen-turbo-latest", "deepseek-chat", "deepseek-reasoner"]
    )
    allowed_role_types: List[str] = field(
        default_factory=lambda: [
            "default_form",
            "coder",
            "md_generate",
            "worker_logger",
            "prompt_generation"
        ]
    )

    @classmethod
    def from_env(cls) -> "AIOptionsConfig":
        return cls(
            default_model=os.getenv("AI_MODEL_NAME", "qwen-turbo-latest"),
            default_temperature=float(os.getenv("AI_TEMPERATURE", "0.7")),
            default_role_type=os.getenv("AI_DEFAULT_ROLE", "default_form"),
        )


@dataclass
class ErrorHandlingConfig:
    """Error handling configuration."""

    retry_strategy: str = "exponential"
    max_retries: int = 3
    retry_delay_min: float = 1.0
    retry_delay_max: float = 10.0

    error_actions: Dict[str, Dict[str, Any]] = field(
        default_factory=lambda: {
            "VALIDATION_ERROR": {"severity": "warning", "action": "show_message"},
            "SCHEMA_VALIDATION_ERROR": {"severity": "warning", "action": "show_message"},
            "AI_SERVICE_ERROR": {"severity": "error", "action": "retry_fallback"},
            "RATE_LIMIT_ERROR": {"severity": "warning", "action": "delay_retry"},
            "AUTHENTICATION_ERROR": {"severity": "critical", "action": "abort"},
        }
    )

    @classmethod
    def from_env(cls) -> "ErrorHandlingConfig":
        return cls(
            retry_strategy=os.getenv("RETRY_STRATEGY", "exponential"),
            max_retries=int(os.getenv("MAX_RETRIES", "3")),
            retry_delay_min=float(os.getenv("RETRY_DELAY_MIN", "1.0")),
            retry_delay_max=float(os.getenv("RETRY_DELAY_MAX", "10.0")),
        )


@dataclass
class Config:
    """Main application configuration (extended).

    Aggregates all configuration sections and provides
    unified access to configuration values.

    Usage:
        config = Config.from_env()
        print(config.flask.host)
        print(config.ai.model_name)
        print(config.ai_options.default_role_type)
    """

    flask: FlaskConfig = field(default_factory=FlaskConfig)
    ai: AIConfig = field(default_factory=AIConfig)
    security: SecurityConfig = field(default_factory=SecurityConfig)
    rate_limit: RateLimitConfig = field(default_factory=RateLimitConfig)
    cors: CORSConfig = field(default_factory=CORSConfig)

    # Extended configurations
    request_params: RequestParamConfig = field(default_factory=RequestParamConfig)
    ai_options: AIOptionsConfig = field(default_factory=AIOptionsConfig)
    error_handling: ErrorHandlingConfig = field(default_factory=ErrorHandlingConfig)

    log_level: str = "INFO"

    @classmethod
    def from_env(cls) -> "Config":
        """Create Config from environment variables."""
        return cls(
            flask=FlaskConfig.from_env(),
            ai=AIConfig.from_env(),
            security=SecurityConfig.from_env(),
            rate_limit=RateLimitConfig.from_env(),
            cors=CORSConfig.from_env(),
            request_params=RequestParamConfig.from_env(),
            ai_options=AIOptionsConfig.from_env(),
            error_handling=ErrorHandlingConfig.from_env(),
            log_level=os.getenv("LOG_LEVEL", "INFO").upper(),
        )

    def load_from_file(self, config_path: str = "./config.json") -> Dict[str, Any]:
        """Load configuration from JSON file.

        Args:
            config_path: Path to the JSON configuration file

        Returns:
            Dictionary containing the loaded configuration
        """
        try:
            path = Path(config_path)
            if not path.exists():
                logger.warning(f"Config file not found: {config_path}")
                return {}

            with path.open("r", encoding="utf-8") as f:
                config = json.load(f)

            logger.info(f"Successfully loaded config from {config_path}")
            return config

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in config file: {e}")
            return {}
        except Exception as e:
            logger.error(f"Error loading config file: {e}")
            return {}

    def get_ai_config_with_fallback(self) -> Tuple[str, str, str, str]:
        """Get AI configuration with fallback priority: env vars > config file.

        Returns:
            Tuple of (api_key, base_url, model_name, proxy)
        """
        file_config = self.load_from_file()

        # Start with environment variable values
        api_key = self.ai.api_key
        base_url = self.ai.base_url
        model_name = self.ai.model_name
        proxy = self.ai.proxy

        # Fallback to config file if env vars not set
        if not api_key and "qwen-3-fast" in file_config:
            api_key = file_config["qwen-3-fast"].get("key", {}).get("key", "")

        if (
            self.ai.base_url
            == "https://dashscope.aliyuncs.com/compatible-mode/v1"
            and "qwen-3-fast" in file_config
        ):
            base_url = file_config["qwen-3-fast"].get("server", {}).get(
                "url", base_url
            )

        if (
            self.ai.model_name == "qwen-turbo-latest"
            and "qwen-3-fast" in file_config
        ):
            model_name = file_config["qwen-3-fast"].get("model", {}).get(
                "name", model_name
            )

        if not proxy and "qwen-3-fast" in file_config:
            proxy = file_config["qwen-3-fast"].get("proxy", {}).get("socket", "")

        # Validate required configuration
        if not api_key:
            logger.warning("API key not configured. AI features may not work properly.")

        return api_key, base_url, model_name, proxy

    def validate(self) -> Tuple[bool, List[str]]:
        """Validate all configuration sections.

        Returns:
            Tuple of (is_valid, list of error messages)
        """
        errors: List[str] = []

        # Validate security configuration
        is_valid, error = self.security.validate()
        if not is_valid:
            errors.append(f"Security: {error}")

        return len(errors) == 0, errors


# Global configuration instance
_config: Optional[Config] = None


def get_config() -> Config:
    """Get the global configuration instance.

    Creates a new instance if one doesn't exist.

    Returns:
        Config instance
    """
    global _config
    if _config is None:
        _config = Config.from_env()
    return _config


def init_config(config: Config) -> None:
    """Initialize the global configuration instance.

    Args:
        config: Config instance to use globally
    """
    global _config
    _config = config


__all__ = [
    "Config",
    "FlaskConfig",
    "AIConfig",
    "SecurityConfig",
    "RateLimitConfig",
    "CORSConfig",
    "RequestParamConfig",
    "AIOptionsConfig",
    "ErrorHandlingConfig",
    "get_config",
    "init_config",
]