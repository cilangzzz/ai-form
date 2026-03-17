# AI-Form Server

AI-powered form data generation backend server built with Flask.

## Project Structure

The project follows the modern Python **src layout** pattern as recommended by PEP 517/518:

```
server/python-simple-server/
├── pyproject.toml           # Modern Python packaging configuration
├── requirements.txt         # Dependencies (backward compatibility)
├── config.json              # AI service configuration
├── .env.example             # Environment template
├── pytest.ini               # Pytest configuration
├── src/
│   └── ai_form_server/      # Main package
│       ├── __init__.py      # Package initialization and exports
│       ├── __main__.py      # Entry point for `python -m ai_form_server`
│       ├── py.typed         # PEP 561 marker for type hints
│       ├── app.py           # Flask application factory
│       ├── config.py        # Configuration management
│       ├── auth/            # Authentication module
│       │   ├── __init__.py
│       │   ├── jwt_handler.py   # JWT token management
│       │   └── decorators.py    # Auth decorators (@require_auth)
│       ├── services/        # Business logic
│       │   ├── __init__.py
│       │   ├── chat.py      # ChatAssistant class
│       │   └── roles.py     # AI role definitions
│       └── routes/          # API routes
│           ├── __init__.py
│           └── chat.py      # Chat API endpoints
└── tests/                   # Test suite
    ├── __init__.py
    ├── conftest.py          # Pytest fixtures
    ├── test_auth.py         # Authentication tests
    ├── test_api.py          # API endpoint tests
    ├── unit/                # Unit tests
    └── integration/         # Integration tests
```

## Installation

### Using pip (development mode)

```bash
# Clone the repository
git clone https://github.com/cilang/ai-form.git
cd ai-form/server/python-simple-server

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install in development mode
pip install -e ".[dev]"
```

### Using requirements.txt

```bash
pip install -r requirements.txt
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key configuration options:

| Variable | Description | Default |
|----------|-------------|---------|
| `FLASK_DEBUG` | Enable debug mode | `false` |
| `FLASK_HOST` | Server host | `0.0.0.0` |
| `FLASK_PORT` | Server port | `5001` |
| `AI_API_KEY` | AI service API key | Required |
| `AI_BASE_URL` | AI service URL | Qwen default |
| `AI_MODEL_NAME` | Model name | `qwen-turbo-latest` |
| `JWT_SECRET_KEY` | JWT signing key | Required |
| `API_KEYS` | Valid API keys (comma-separated) | - |

### Configuration File

Edit `config.json` for AI service configuration:

```json
{
  "qwen-3-fast": {
    "model": {"name": "qwen-turbo-latest"},
    "server": {"url": "https://dashscope.aliyuncs.com/compatible-mode/v1"},
    "key": {"key": "your-api-key"},
    "proxy": {"socket": "http://127.0.0.1:7897"}
  }
}
```

## Usage

### Running the Server

```bash
# Using module entry point
python -m ai_form_server

# Or using the console script (after installation)
ai-form-server

# Or directly with Python
python -c "from ai_form_server import create_app; app = create_app(); app.run()"
```

### Using the Application Factory

```python
from ai_form_server import create_app, get_config

# Create app with default configuration
app = create_app()

# Create app with custom configuration
from ai_form_server.config import Config
config = Config.from_env()
app = create_app(config)

app.run(host='0.0.0.0', port=5001)
```

### API Endpoints

#### Health Check

```bash
GET /ai/health

Response:
{
  "status": "healthy",
  "timestamp": "2025-03-17T12:00:00",
  "service": "ai-chat-server",
  "version": "1.0.0",
  "checks": {
    "api_configured": true,
    "model": "qwen-turbo-latest",
    "debug_mode": false
  }
}
```

#### Authentication

```bash
# Get JWT tokens
POST /auth/token
Content-Type: application/json

{
  "username": "user",
  "password": "password"
}

# Or with API key
POST /auth/token
Content-Type: application/json

{
  "api_key": "your-api-key"
}

Response:
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}

# Refresh token
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJ..."
}
```

#### Chat Endpoint

```bash
POST /ai/chat_remark
Authorization: Bearer <token>
Content-Type: application/json

{
  "userInput": "Generate test data for username field",
  "chatContext": "Optional context"
}

Response:
{
  "success": true,
  "data": {
    "response": ["['username': 'testUser123']"]
  }
}
```

## Development

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=ai_form_server --cov-report=html

# Run specific test markers
pytest -m auth
pytest -m security
pytest -m integration

# Run with verbose output
pytest -v --tb=short
```

### Code Quality

```bash
# Format code
black src/ tests/

# Lint code
ruff check src/ tests/

# Type checking
mypy src/
```

### Building

```bash
# Build package
python -m build

# The distribution will be in dist/
```

## Architecture

### Module Organization

The codebase follows a layered architecture:

1. **Routes Layer** (`routes/`): HTTP request handling, input validation
2. **Services Layer** (`services/`): Business logic, AI interactions
3. **Auth Layer** (`auth/`): Authentication, authorization
4. **Configuration** (`config.py`): Settings management

### Key Components

- **Application Factory** (`app.py`): Flask app creation with flexible configuration
- **ChatAssistant** (`services/chat.py`): OpenAI-compatible API wrapper
- **TokenManager** (`auth/jwt_handler.py`): JWT generation and validation
- **Security Middleware**: Headers, rate limiting, prompt injection detection

## Security Features

- JWT-based authentication with refresh tokens
- API key authentication
- Rate limiting per endpoint
- Security headers (CSP, HSTS, X-Frame-Options)
- Prompt injection detection
- Input validation and sanitization
- Error message sanitization

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## Authors

- cilang (cilanguser@Gmail.com)