# API Reference / API 参考文档

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## English

### API Endpoints

The AI-Form server provides the following API endpoints:

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/ai/chat_remark` | POST | Generate form test data | Required |
| `/ai/health` | GET | Health check endpoint | None |
| `/auth/token` | POST | Generate JWT tokens | None (requires API key in body) |
| `/auth/refresh` | POST | Refresh access token | Required (refresh token) |
| `/auth/verify` | GET | Verify authentication status | Required |

### Request/Response Formats

#### 1. Generate Form Test Data

**Endpoint:** `POST /ai/chat_remark`

**Description:** Submit form metadata and receive AI-generated test data suggestions.

**Authentication:** Required (JWT or API Key)

**Request Body:**

```json
{
    "userInput": "Form field descriptions and requirements",
    "chatContext": "Additional context for generation (optional)"
}
```

Or as form-data:
```
formMetadata: JSON string containing form field metadata
chatContext: Additional context (optional)
```

**Example Request (JSON):**

```bash
curl -X POST "http://localhost:5001/ai/chat_remark" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userInput": "username: text, required, 3-16 chars; email: email format; password: strong password required",
    "chatContext": "Test registration form for e-commerce site"
  }'
```

**Example Request (API Key):**

```bash
curl -X POST "http://localhost:5001/ai/chat_remark" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "userInput": "username: text, required; email: email format"
  }'
```

**Success Response (200):**

```json
{
    "success": true,
    "data": {
        "response": [
            "{\"username\": \"testUser123\", \"email\": \"user123@example.com\", \"password\": \"A1b@cD9eF\"}",
            "{\"username\": \"anotherUser\", \"email\": \"another@example.com\", \"password\": \"X9y@zW2v\"}"
        ]
    }
}
```

**Error Response (400):**

```json
{
    "success": false,
    "error": "userInput cannot be empty",
    "code": "EMPTY_INPUT"
}
```

#### 2. Health Check

**Endpoint:** `GET /ai/health`

**Description:** Check server health status and configuration.

**Response:**

```json
{
    "status": "healthy",
    "timestamp": "2026-03-28T10:00:00.000000",
    "service": "ai-chat-server",
    "version": "1.0.0",
    "checks": {
        "api_configured": true,
        "model": "qwen-turbo-latest",
        "debug_mode": false
    }
}
```

#### 3. Authentication Endpoints

**Generate JWT Token:**

**Endpoint:** `POST /auth/token`

**Request:**

```bash
curl -X POST "http://localhost:5001/auth/token" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_VALID_API_KEY"
  }'
```

**Response:**

```json
{
    "success": true,
    "data": {
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "token_type": "Bearer",
        "expires_in": 3600
    }
}
```

**Refresh Access Token:**

**Endpoint:** `POST /auth/refresh`

**Request:**

```bash
curl -X POST "http://localhost:5001/auth/refresh" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_REFRESH_TOKEN"
```

**Response:**

```json
{
    "success": true,
    "data": {
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "token_type": "Bearer",
        "expires_in": 3600
    }
}
```

**Verify Authentication:**

**Endpoint:** `GET /auth/verify`

**Request:**

```bash
curl -X GET "http://localhost:5001/auth/verify" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**

```json
{
    "success": true,
    "data": {
        "authenticated": true,
        "method": "jwt",
        "identity": "user123"
    }
}
```

### Authentication Methods

The API supports two authentication methods:

#### 1. API Key Authentication

Use the `X-API-Key` header for direct API key authentication:

```bash
curl -X POST "http://localhost:5001/ai/chat_remark" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userInput": "..."}'
```

**Advantages:**
- Simple and straightforward
- No token management required
- Suitable for server-to-server communication

**Configuration:**
Set valid API keys in the `API_KEYS` environment variable (comma-separated).

#### 2. JWT Authentication

For more secure, time-limited authentication:

**Step 1: Obtain Tokens**

```bash
# Exchange API key for JWT tokens
curl -X POST "http://localhost:5001/auth/token" \
  -H "Content-Type: application/json" \
  -d '{"api_key": "YOUR_API_KEY"}'
```

**Step 2: Use Access Token**

```bash
# Use access token for API calls
curl -X POST "http://localhost:5001/ai/chat_remark" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userInput": "..."}'
```

**Step 3: Refresh Token (when expired)**

```bash
# Use refresh token to get new access token
curl -X POST "http://localhost:5001/auth/refresh" \
  -H "Authorization: Bearer REFRESH_TOKEN"
```

**Token Lifetimes:**
- Access Token: 1 hour (configurable via `JWT_ACCESS_TOKEN_EXPIRES`)
- Refresh Token: 30 days (configurable via `JWT_REFRESH_TOKEN_EXPIRES`)

### Error Codes

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `BAD_REQUEST` | 400 | Invalid request format | Check request body format |
| `VALIDATION_ERROR` | 400 | Input validation failed | Check field lengths and format |
| `EMPTY_INPUT` | 400 | userInput is empty | Provide non-empty userInput |
| `INVALID_CONTENT_TYPE` | 400 | Wrong content type | Use application/json or form-data |
| `API_KEY_REQUIRED` | 400 | API key missing in request | Provide api_key in request body |
| `AUTHENTICATION_REQUIRED` | 401 | No authentication provided | Add X-API-Key or Authorization header |
| `INVALID_TOKEN` | 401 | JWT token invalid or expired | Refresh token or use valid API key |
| `TOKEN_EXPIRED` | 401 | JWT token has expired | Use refresh token to get new access token |
| `TOKEN_REVOKED` | 401 | JWT token has been revoked | Obtain new token |
| `TOKEN_REQUIRED` | 401 | Authorization header missing | Add Authorization: Bearer token |
| `INVALID_API_KEY` | 403 | API key is not valid | Use valid API key from API_KEYS config |
| `NOT_FOUND` | 404 | Endpoint not found | Check endpoint URL |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Wait and retry later |
| `AI_SERVICE_ERROR` | 500 | AI service error | Check AI service configuration |
| `INTERNAL_ERROR` | 500 | Internal server error | Check server logs |
| `UNEXPECTED_ERROR` | 500 | Unexpected error occurred | Contact support |

### Rate Limiting

The API enforces rate limits to ensure fair usage:

| Endpoint | Rate Limit |
|----------|------------|
| Default (all endpoints) | 100 requests/hour |
| `/ai/chat_remark` | 30 requests/minute |
| `/auth/token` | 10 requests/minute |
| `/auth/refresh` | 20 requests/minute |

When rate limit is exceeded, the response will be:

```json
{
    "success": false,
    "error": "Rate limit exceeded. Please try again later.",
    "code": "RATE_LIMIT_EXCEEDED"
}
```

### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` for JSON, `multipart/form-data` for form-data |
| `Authorization` | Optional* | `Bearer <token>` for JWT authentication |
| `X-API-Key` | Optional* | API key for authentication |
| `X-Request-ID` | Optional | Custom request ID for tracing (auto-generated if not provided) |

*Either `Authorization` or `X-API-Key` is required for authenticated endpoints.

### Response Headers

| Header | Description |
|--------|-------------|
| `X-Request-ID` | Unique request ID for tracing |
| `X-Content-Type-Options` | Security header: nosniff |
| `X-Frame-Options` | Security header: DENY |
| `Strict-Transport-Security` | HSTS header |
| `Content-Security-Policy` | CSP header |
| `Cache-Control` | no-store, no-cache |

---

<a name="chinese"></a>
## 中文

### API 端点列表

AI-Form 服务器提供以下 API 端点：

| 端点 | 方法 | 描述 | 认证要求 |
|------|------|------|----------|
| `/ai/chat_remark` | POST | 生成表单测试数据 | 需要 |
| `/ai/health` | GET | 健康检查端点 | 无 |
| `/auth/token` | POST | 生成JWT令牌 | 无（需要在请求体中提供API密钥） |
| `/auth/refresh` | POST | 刷新访问令牌 | 需要（刷新令牌） |
| `/auth/verify` | GET | 验证认证状态 | 需要 |

### 请求/响应格式

#### 1. 生成表单测试数据

**端点：** `POST /ai/chat_remark`

**描述：** 提交表单元数据，接收AI生成的测试数据建议。

**认证：** 需要（JWT或API密钥）

**请求体：**

```json
{
    "userInput": "表单字段描述和要求",
    "chatContext": "生成附加上下文（可选）"
}
```

或作为表单数据：
```
formMetadata: 包含表单字段元数据的JSON字符串
chatContext: 附加上下文（可选）
```

**请求示例（JSON）：**

```bash
curl -X POST "http://localhost:5001/ai/chat_remark" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userInput": "username: text, required, 3-16 chars; email: email format; password: strong password required",
    "chatContext": "电商网站注册表单测试"
  }'
```

**请求示例（API密钥）：**

```bash
curl -X POST "http://localhost:5001/ai/chat_remark" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "userInput": "username: text, required; email: email format"
  }'
```

**成功响应（200）：**

```json
{
    "success": true,
    "data": {
        "response": [
            "{\"username\": \"testUser123\", \"email\": \"user123@example.com\", \"password\": \"A1b@cD9eF\"}",
            "{\"username\": \"anotherUser\", \"email\": \"another@example.com\", \"password\": \"X9y@zW2v\"}"
        ]
    }
}
```

**错误响应（400）：**

```json
{
    "success": false,
    "error": "userInput cannot be empty",
    "code": "EMPTY_INPUT"
}
```

#### 2. 健康检查

**端点：** `GET /ai/health`

**描述：** 检查服务器健康状态和配置。

**响应：**

```json
{
    "status": "healthy",
    "timestamp": "2026-03-28T10:00:00.000000",
    "service": "ai-chat-server",
    "version": "1.0.0",
    "checks": {
        "api_configured": true,
        "model": "qwen-turbo-latest",
        "debug_mode": false
    }
}
```

#### 3. 认证端点

**生成JWT令牌：**

**端点：** `POST /auth/token`

**请求：**

```bash
curl -X POST "http://localhost:5001/auth/token" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_VALID_API_KEY"
  }'
```

**响应：**

```json
{
    "success": true,
    "data": {
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "token_type": "Bearer",
        "expires_in": 3600
    }
}
```

**刷新访问令牌：**

**端点：** `POST /auth/refresh`

**请求：**

```bash
curl -X POST "http://localhost:5001/auth/refresh" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_REFRESH_TOKEN"
```

**响应：**

```json
{
    "success": true,
    "data": {
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "token_type": "Bearer",
        "expires_in": 3600
    }
}
```

**验证认证状态：**

**端点：** `GET /auth/verify`

**请求：**

```bash
curl -X GET "http://localhost:5001/auth/verify" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**响应：**

```json
{
    "success": true,
    "data": {
        "authenticated": true,
        "method": "jwt",
        "identity": "user123"
    }
}
```

### 认证方式

API 支持两种认证方式：

#### 1. API 密钥认证

使用 `X-API-Key` 头进行直接API密钥认证：

```bash
curl -X POST "http://localhost:5001/ai/chat_remark" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userInput": "..."}'
```

**优点：**
- 简单直接
- 无需令牌管理
- 适合服务器间通信

**配置：**
在 `API_KEYS` 环境变量中设置有效的API密钥（逗号分隔）。

#### 2. JWT 认证

更安全、有时限的认证方式：

**步骤1：获取令牌**

```bash
# 使用API密钥换取JWT令牌
curl -X POST "http://localhost:5001/auth/token" \
  -H "Content-Type: application/json" \
  -d '{"api_key": "YOUR_API_KEY"}'
```

**步骤2：使用访问令牌**

```bash
# 使用访问令牌调用API
curl -X POST "http://localhost:5001/ai/chat_remark" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userInput": "..."}'
```

**步骤3：刷新令牌（过期时）**

```bash
# 使用刷新令牌获取新的访问令牌
curl -X POST "http://localhost:5001/auth/refresh" \
  -H "Authorization: Bearer REFRESH_TOKEN"
```

**令牌有效期：**
- 访问令牌：1小时（可通过 `JWT_ACCESS_TOKEN_EXPIRES` 配置）
- 刷新令牌：30天（可通过 `JWT_REFRESH_TOKEN_EXPIRES` 配置）

### 错误码说明

| 错误码 | HTTP状态码 | 描述 | 解决方案 |
|--------|------------|------|----------|
| `BAD_REQUEST` | 400 | 请求格式无效 | 检查请求体格式 |
| `VALIDATION_ERROR` | 400 | 输入验证失败 | 检查字段长度和格式 |
| `EMPTY_INPUT` | 400 | userInput为空 | 提供非空的userInput |
| `INVALID_CONTENT_TYPE` | 400 | 内容类型错误 | 使用application/json或form-data |
| `API_KEY_REQUIRED` | 400 | 请求中缺少API密钥 | 在请求体中提供api_key |
| `AUTHENTICATION_REQUIRED` | 401 | 未提供认证 | 添加X-API-Key或Authorization头 |
| `INVALID_TOKEN` | 401 | JWT令牌无效或过期 | 刷新令牌或使用有效API密钥 |
| `TOKEN_EXPIRED` | 401 | JWT令牌已过期 | 使用刷新令牌获取新访问令牌 |
| `TOKEN_REVOKED` | 401 | JWT令牌已被撤销 | 获取新令牌 |
| `TOKEN_REQUIRED` | 401 | 缺少Authorization头 | 添加Authorization: Bearer令牌 |
| `INVALID_API_KEY` | 403 | API密钥无效 | 使用API_KEYS配置中的有效密钥 |
| `NOT_FOUND` | 404 | 端点不存在 | 检查端点URL |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求过多 | 等待后重试 |
| `AI_SERVICE_ERROR` | 500 | AI服务错误 | 检查AI服务配置 |
| `INTERNAL_ERROR` | 500 | 内部服务器错误 | 检查服务器日志 |
| `UNEXPECTED_ERROR` | 500 | 发生意外错误 | 联系支持 |

### 速率限制

API 强制执行速率限制以确保公平使用：

| 端点 | 速率限制 |
|------|----------|
| 默认（所有端点） | 100次请求/小时 |
| `/ai/chat_remark` | 30次请求/分钟 |
| `/auth/token` | 10次请求/分钟 |
| `/auth/refresh` | 20次请求/分钟 |

超过速率限制时，响应为：

```json
{
    "success": false,
    "error": "Rate limit exceeded. Please try again later.",
    "code": "RATE_LIMIT_EXCEEDED"
}
```

### 请求头

| 头 | 必需 | 描述 |
|-----|------|------|
| `Content-Type` | 是 | JSON用`application/json`，表单数据用`multipart/form-data` |
| `Authorization` | 可选* | JWT认证用`Bearer <token>` |
| `X-API-Key` | 可选* | API密钥认证 |
| `X-Request-ID` | 可选 | 自定义请求ID用于追踪（未提供时自动生成） |

*认证端点需要 `Authorization` 或 `X-API-Key` 之一。

### 响应头

| 头 | 描述 |
|-----|------|
| `X-Request-ID` | 用于追踪的唯一请求ID |
| `X-Content-Type-Options` | 安全头：nosniff |
| `X-Frame-Options` | 安全头：DENY |
| `Strict-Transport-Security` | HSTS头 |
| `Content-Security-Policy` | CSP头 |
| `Cache-Control` | no-store, no-cache |

---

## Code Examples / 代码示例

### JavaScript (Fetch API)

```javascript
// Using API Key
async function generateTestData(formData) {
    const response = await fetch('http://localhost:5001/ai/chat_remark', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'YOUR_API_KEY'
        },
        body: JSON.stringify({
            userInput: formData,
            chatContext: 'Test data generation'
        })
    });
    return response.json();
}

// Using JWT Token
async function generateTestDataWithJWT(formData, token) {
    const response = await fetch('http://localhost:5001/ai/chat_remark', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            userInput: formData
        })
    });
    return response.json();
}
```

### Python

```python
import requests

# Using API Key
def generate_test_data(form_data):
    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': 'YOUR_API_KEY'
    }
    data = {
        'userInput': form_data,
        'chatContext': 'Test data generation'
    }
    response = requests.post(
        'http://localhost:5001/ai/chat_remark',
        headers=headers,
        json=data
    )
    return response.json()

# Get JWT Token
def get_jwt_token(api_key):
    response = requests.post(
        'http://localhost:5001/auth/token',
        json={'api_key': api_key}
    )
    return response.json()['data']['access_token']
```