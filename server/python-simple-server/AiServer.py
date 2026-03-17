# -*- coding: utf-8 -*-
# -------------------------------
#
# @File：AiServer.py
# @Time：2025/5/9
# @Author：cilang
# @Email：cilanguser@Gmail.com
# @Desc：提供AI聊天后端接口（已优化安全性和架构）
import json
import os
import logging
import sys
from datetime import datetime
from functools import wraps

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from tenacity import stop_after_attempt, retry, retry_if_exception_type, wait_exponential
from dotenv import load_dotenv

from Chat import ChatAssistant

# Load environment variables from .env file
load_dotenv()

# -------------------------------
# Logging Configuration
# -------------------------------
log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
logging.basicConfig(
    level=getattr(logging, log_level, logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# -------------------------------
# Configuration Management
# -------------------------------
class Config:
    """Application configuration with environment variable support."""

    # Flask settings
    DEBUG = os.getenv('FLASK_DEBUG', 'false').lower() in ('true', '1', 'yes')
    HOST = os.getenv('FLASK_HOST', '0.0.0.0')
    PORT = int(os.getenv('FLASK_PORT', '5001'))

    # API settings
    API_KEY = os.getenv('AI_API_KEY', '')
    BASE_URL = os.getenv('AI_BASE_URL', 'https://dashscope.aliyuncs.com/compatible-mode/v1')
    MODEL_NAME = os.getenv('AI_MODEL_NAME', 'qwen-turbo-latest')
    PROXY = os.getenv('AI_PROXY', '')

    # Security settings
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', '1048576'))  # 1MB default
    MAX_INPUT_LENGTH = int(os.getenv('MAX_INPUT_LENGTH', '10000'))  # 10KB default
    MAX_CONTEXT_LENGTH = int(os.getenv('MAX_CONTEXT_LENGTH', '50000'))  # 50KB default

    # Rate limiting
    RATE_LIMIT_DEFAULT = os.getenv('RATE_LIMIT_DEFAULT', '100 per hour')
    RATE_LIMIT_CHAT = os.getenv('RATE_LIMIT_CHAT', '30 per minute')

    @classmethod
    def load_from_config_file(cls, config_path: str = './config.json') -> dict:
        """Load configuration from JSON file with error handling."""
        try:
            if not os.path.exists(config_path):
                logger.warning(f"Config file not found: {config_path}")
                return {}

            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)

            logger.info(f"Successfully loaded config from {config_path}")
            return config
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in config file: {e}")
            return {}
        except Exception as e:
            logger.error(f"Error loading config file: {e}")
            return {}

    @classmethod
    def get_ai_config(cls) -> tuple:
        """Get AI configuration with fallback priority: env vars > config file."""
        config = cls.load_from_config_file()

        # Priority: environment variables > config file
        api_key = cls.API_KEY
        base_url = cls.BASE_URL
        model_name = cls.MODEL_NAME
        proxy = cls.PROXY

        # Fallback to config file if env vars not set
        if not api_key and 'qwen-3-fast' in config:
            api_key = config['qwen-3-fast'].get('key', {}).get('key', '')

        if cls.BASE_URL == 'https://dashscope.aliyuncs.com/compatible-mode/v1' and 'qwen-3-fast' in config:
            base_url = config['qwen-3-fast'].get('server', {}).get('url', cls.BASE_URL)

        if cls.MODEL_NAME == 'qwen-turbo-latest' and 'qwen-3-fast' in config:
            model_name = config['qwen-3-fast'].get('model', {}).get('name', cls.MODEL_NAME)

        if not proxy and 'qwen-3-fast' in config:
            proxy = config['qwen-3-fast'].get('proxy', {}).get('socket', '')

        # Validate required configuration
        if not api_key:
            logger.warning("API key not configured. AI features may not work properly.")

        return api_key, base_url, model_name, proxy


# -------------------------------
# Flask Application Setup
# -------------------------------
app = Flask(__name__)

# Security: Set max content length
app.config['MAX_CONTENT_LENGTH'] = Config.MAX_CONTENT_LENGTH

# CORS Configuration
CORS(app, resources={
    r"/ai/*": {
        "origins": os.getenv('CORS_ORIGINS', '*').split(','),
        "methods": ["POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "max_age": 3600
    }
})

# Rate Limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=[Config.RATE_LIMIT_DEFAULT],
    storage_uri="memory://"
)


# -------------------------------
# AI Chat Configuration
# -------------------------------
# AI Chat roles and configuration
ROLE = [
    {"role": "system",
     "content": "You are a frontend development expert skilled at generating test data that conforms to format requirements based on form structures. Output only the data itself, without explanations."},
    {"role": "user", "content": "Please generate test data conforming to format requirements for the following form elements:"},
    {"role": "assistant",
     "content": "Please provide the form structure including: 1. Field name 2. Field type (text/email/number etc.) 3. Required or not 4. Format requirements (e.g., password strength) 5. Value range (for numbers)"},
    {"role": "system",
     "content": "Example output: For 'Username: text input, required, 3-16 characters', give multiple choices, output: ['username': 'testUser123','username': 'testUser123333',"
                "'username': 'testUser123333sd']"},
    {"role": "system",
     "content": "For multiple fields, output format: ['username': 'testUser123', 'password': 'A1b@cD9eF', 'email': 'user123@example.com']"},
    {"role": "system",
     "content": "Output only field values that meet requirements, wrapped in a list, with space separators between fields"},
    {"role": "system", "content": "Automatically generate strong passwords for password fields (e.g., A1b@cD9eF)"},
    {"role": "system", "content": "Automatically generate valid emails for email fields (e.g., user123@example.com)"},
    {"role": "system", "content": "Generate reasonable values for number fields based on range (e.g., 1-100 -> 28)"},
    {"role": "system", "content": "Output array format for multi-select fields (e.g., hobbies: [reading, swimming])"},
    {"role": "system", "content": "Can specify generation of multiple test data entries"},
    {"role": "system", "content": "Support generation of data that conforms or does not conform to rules"}
]

# Initialize AI chat assistant
api_key, base_url, model_name, proxy = Config.get_ai_config()
transferAichatAssistant = ChatAssistant(api_key, base_url, proxy=proxy, model=model_name)
transferAichatAssistant.setRole(ROLE)


# -------------------------------
# Input Validation Helpers
# -------------------------------
def validate_input_length(input_str: str, max_length: int, field_name: str) -> tuple:
    """Validate input string length.

    Returns:
        tuple: (is_valid, error_message)
    """
    if input_str is None:
        return False, f"{field_name} is required"

    if len(input_str) > max_length:
        return False, f"{field_name} exceeds maximum length of {max_length} characters"

    return True, None


def sanitize_error_message(error: Exception) -> str:
    """Sanitize error message to avoid exposing sensitive information."""
    error_type = type(error).__name__

    # Map common errors to user-friendly messages
    error_mapping = {
        'AuthenticationError': 'AI service authentication failed. Please check configuration.',
        'RateLimitError': 'AI service rate limit exceeded. Please try again later.',
        'APIConnectionError': 'Unable to connect to AI service. Please check network.',
        'APIStatusError': 'AI service temporarily unavailable. Please try again later.',
        'Timeout': 'Request timed out. Please try again.',
    }

    return error_mapping.get(error_type, 'An internal error occurred. Please try again later.')


# -------------------------------
# Retry Decorator with Improved Error Handling
# -------------------------------
def ai_retry_decorator(func):
    """Custom retry decorator with better error handling and logging."""
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(Exception),
        reraise=True
    )
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            logger.debug(f"Executing {func.__name__}")
            result = func(*args, **kwargs)
            logger.debug(f"Successfully completed {func.__name__}")
            return result
        except Exception as e:
            logger.error(f"Error in {func.__name__}: {type(e).__name__}")
            raise
    return wrapper


# -------------------------------
# API Routes
# -------------------------------
@app.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for monitoring and load balancer.
    Returns service status and configuration validation.
    """
    api_key, base_url, model_name, _ = Config.get_ai_config()

    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "ai-chat-server",
        "version": "1.0.0",
        "checks": {
            "api_configured": bool(api_key),
            "model": model_name,
            "debug_mode": Config.DEBUG
        }
    }

    # Return 503 if critical configuration is missing
    if not api_key:
        health_status["status"] = "degraded"
        health_status["checks"]["api_configured"] = False
        return jsonify(health_status), 503

    return jsonify(health_status), 200


@app.route('/ai/chat_remark', methods=['POST'])
@limiter.limit(Config.RATE_LIMIT_CHAT)
def ai_chat_remark_api():
    """
    Backend API: Receive userInput, call AI remark interface and return response.

    Request body (JSON or form-data):
        - userInput: User input text (required, max 10000 chars)
        - chatContext: Additional context (optional, max 50000 chars)

    Returns:
        JSON response with AI-generated test data
    """
    try:
        # Support both JSON and form-data requests
        if request.is_json:
            data = request.get_json()
            user_input = data.get('userInput')
            context = data.get('chatContext')
        else:
            user_input = request.form.get('userInput')
            context = request.form.get('chatContext')

        # Input validation
        is_valid, error_msg = validate_input_length(user_input, Config.MAX_INPUT_LENGTH, 'userInput')
        if not is_valid:
            logger.warning(f"Input validation failed: {error_msg}")
            return jsonify({
                "success": False,
                "error": error_msg,
                "code": "VALIDATION_ERROR"
            }), 400

        if not user_input or not user_input.strip():
            return jsonify({
                "success": False,
                "error": "userInput cannot be empty",
                "code": "EMPTY_INPUT"
            }), 400

        # Context validation (optional but if provided, validate length)
        if context:
            is_valid, error_msg = validate_input_length(context, Config.MAX_CONTEXT_LENGTH, 'chatContext')
            if not is_valid:
                logger.warning(f"Context validation failed: {error_msg}")
                return jsonify({
                    "success": False,
                    "error": error_msg,
                    "code": "VALIDATION_ERROR"
                }), 400

        # Process AI request
        if context and context.strip() and context != "null":
            append_role = {"role": "system", "content": context}
            ai_response = transferRemark(user_input, append_role)
        else:
            ai_response = transferRemark(user_input)

        # Ensure response is in list format
        if isinstance(ai_response, str):
            ai_response_list = [ai_response]
        elif isinstance(ai_response, list):
            ai_response_list = ai_response
        else:
            ai_response_list = [str(ai_response)]

        logger.info(f"Successfully processed AI request, response length: {len(str(ai_response_list))}")

        return jsonify({
            "success": True,
            "data": {
                "response": ai_response_list
            }
        })

    except Exception as e:
        logger.error(f"Error processing AI request: {type(e).__name__}")
        sanitized_error = sanitize_error_message(e)

        return jsonify({
            "success": False,
            "error": sanitized_error,
            "code": "AI_SERVICE_ERROR"
        }), 500


@ai_retry_decorator
def transferRemark(userInput, context=None):
    """
    Call AI assistant with retry logic.

    Args:
        userInput: User input text
        context: Optional context for the conversation

    Returns:
        AI assistant response
    """
    if context is not None:
        response = transferAichatAssistant.chatSupplement(userInput, context)
    else:
        response = transferAichatAssistant.chatWithoutContext(userInput)
    return response


# -------------------------------
# Error Handlers
# -------------------------------
@app.errorhandler(400)
def bad_request(_error):
    """Handle bad request errors."""
    return jsonify({
        "success": False,
        "error": "Bad request",
        "code": "BAD_REQUEST"
    }), 400


@app.errorhandler(404)
def not_found(_error):
    """Handle not found errors."""
    return jsonify({
        "success": False,
        "error": "Resource not found",
        "code": "NOT_FOUND"
    }), 404


@app.errorhandler(429)
def rate_limit_exceeded(_error):
    """Handle rate limit errors."""
    return jsonify({
        "success": False,
        "error": "Rate limit exceeded. Please try again later.",
        "code": "RATE_LIMIT_EXCEEDED"
    }), 429


@app.errorhandler(500)
def internal_error(error):
    """Handle internal server errors."""
    logger.error(f"Internal server error: {error}")
    return jsonify({
        "success": False,
        "error": "Internal server error",
        "code": "INTERNAL_ERROR"
    }), 500


@app.errorhandler(Exception)
def handle_exception(error):
    """Handle unexpected exceptions."""
    logger.exception(f"Unexpected error: {error}")
    return jsonify({
        "success": False,
        "error": "An unexpected error occurred",
        "code": "UNEXPECTED_ERROR"
    }), 500


# -------------------------------
# Application Entry Point
# -------------------------------
if __name__ == '__main__':
    logger.info(f"Starting AI Chat Server on {Config.HOST}:{Config.PORT}")
    logger.info(f"Debug mode: {Config.DEBUG}")
    logger.info(f"Model: {Config.MODEL_NAME}")

    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG
    )