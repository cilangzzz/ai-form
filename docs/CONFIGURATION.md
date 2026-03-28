# Configuration / 配置文档

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## English

### Backend Configuration

The AI-Form server uses environment variables for configuration. Configuration can be provided through:

1. **Environment variables** (recommended for production)
2. **`.env` file** (for development)
3. **`config.json` file** (legacy support)

#### Environment Variables

Create a `.env` file in the `server/python-simple-server` directory by copying from `.env.example`:

```bash
cp .env.example .env
```

#### Flask Server Settings

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `FLASK_DEBUG` | Enable debug mode | `false` | `true` or `false` |
| `FLASK_HOST` | Server host address | `0.0.0.0` | `127.0.0.1` |
| `FLASK_PORT` | Server port | `5001` | `8080` |
| `TESTING` | Enable testing mode | `false` | `true` or `false` |

#### AI Service Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `AI_API_KEY` | AI service API key (REQUIRED) | - | `sk-xxxxxxxx` |
| `AI_BASE_URL` | AI service endpoint URL | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `https://api.deepseek.com` |
| `AI_MODEL_NAME` | AI model name | `qwen-turbo-latest` | `deepseek-chat`, `qwen-max` |
| `AI_PROXY` | Proxy URL (optional) | - | `http://127.0.0.1:7897` |

**Supported AI Providers:**

| Provider | Base URL | Models |
|----------|----------|--------|
| DeepSeek | `https://api.deepseek.com` | `deepseek-chat`, `deepseek-reasoner` |
| Qwen (Alibaba) | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-turbo-latest`, `qwen-plus-latest`, `qwen-max` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4`, `gpt-3.5-turbo` |

#### Security Settings

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `MAX_CONTENT_LENGTH` | Maximum request size (bytes) | `1048576` (1MB) | `2097152` (2MB) |
| `MAX_INPUT_LENGTH` | Maximum input text length | `10000` (10KB) | `50000` |
| `MAX_CONTEXT_LENGTH` | Maximum context length | `50000` (50KB) | `100000` |
| `JWT_SECRET_KEY` | JWT signing secret (REQUIRED for auth) | - | `your-secret-key-here` |
| `JWT_ALGORITHM` | JWT algorithm | `HS256` | `HS512` |
| `JWT_ACCESS_TOKEN_EXPIRES` | Access token lifetime (seconds) | `3600` (1 hour) | `7200` (2 hours) |
| `JWT_REFRESH_TOKEN_EXPIRES` | Refresh token lifetime (seconds) | `2592000` (30 days) | `86400` (1 day) |
| `API_KEYS` | Valid API keys (comma-separated) | - | `key1,key2,key3` |

**Generating Secure Keys:**

```bash
# Generate JWT secret key
python -c "import secrets; print(secrets.token_hex(32))"

# Generate API key
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

#### Rate Limiting Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `RATE_LIMIT_DEFAULT` | Default rate limit | `100 per hour` |
| `RATE_LIMIT_CHAT` | Chat endpoint rate limit | `30 per minute` |
| `API_KEY_RATE_LIMIT` | API key auth rate limit | `60 per minute` |

#### CORS Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `*` (all origins) |

**Production CORS Example:**
```
CORS_ORIGINS=https://example.com,https://api.example.com
```

#### Logging Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level | `INFO` |

**Available Levels:** `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`

### Configuration File Format

#### config.json (Legacy)

```json
{
  "qwen-3-fast": {
    "model": {
      "name": "qwen-turbo-latest"
    },
    "server": {
      "url": "https://dashscope.aliyuncs.com/compatible-mode/v1"
    },
    "key": {
      "key": "your-api-key-here"
    },
    "proxy": {
      "socket": "http://127.0.0.1:7897"
    }
  },
  "deepseek-r1": {
    "model": {
      "name": "deepseek-chat"
    },
    "server": {
      "url": "https://api.deepseek.com"
    },
    "key": {
      "key": "your-api-key-here"
    },
    "proxy": {
      "socket": "http://127.0.0.1:7897"
    }
  }
}
```

### Frontend Configuration

The client script (Tampermonkey) has configurable options in the script file:

#### Configuration Object

```javascript
const Config = {
    // Keyboard shortcut configuration
    shortcut: {
        altKey: true,      // Use Alt key
        key: 'q'           // Press Q with Alt
    },

    // API configuration
    api: {
        server: 'http://192.168.3.186:5001',  // Backend server URL
        endpoint: '/ai/chat_remark',          // API endpoint
        timeout: 30000,                        // Request timeout (ms)
        maxRetries: 3,                         // Max retry attempts
        retryDelay: 1000                       // Retry delay (ms)
    },

    // Form search configuration
    form: {
        parentSearchDepth: 4,    // Depth to search for parent form
        singleInputMode: false   // Process single input only
    },

    // UI configuration
    ui: {
        position: { top: 50, right: 20 },  // Settings panel position
        showSuggestionsContainer: false,   // Show suggestions panel
        animationDuration: 300,            // Animation duration (ms)
        debounceDelay: 100                 // Debounce delay (ms)
    }
};
```

#### Dynamic Configuration (Tampermonkey)

Settings can be dynamically changed using Tampermonkey's storage:

```javascript
// Set API server (persistent across sessions)
GM_setValue('apiServer', 'http://new-server:5001');

// Get API server (with default fallback)
const server = GM_getValue('apiServer', 'http://192.168.3.186:5001');

// Set timeout
GM_setValue('apiTimeout', 60000);
```

#### LocalStorage Settings

User preferences are stored in localStorage:

| Key | Description |
|-----|-------------|
| `formParentSearchDepth` | Form parent search depth |
| `singleInputMode` | Single input mode toggle |
| `showSuggestionsContainer` | Show suggestions container |
| `settingsPosition` | Settings panel position |
| `aiAssistant_chatContext` | Custom chat context |

### Security Headers

The server automatically applies these security headers:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME type sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-XSS-Protection` | `1; mode=block` | XSS filter for legacy browsers |
| `Strict-Transport-Security` | `max-age=31536000` | HTTPS enforcement |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer control |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | Feature restriction |
| `Content-Security-Policy` | `default-src 'self'` | XSS prevention |
| `Cache-Control` | `no-store, no-cache` | Prevent caching |

### Configuration Best Practices

#### Production Configuration

```bash
# .env for production
FLASK_DEBUG=false
FLASK_HOST=0.0.0.0
FLASK_PORT=5001

AI_API_KEY=your-production-api-key
AI_BASE_URL=https://api.deepseek.com
AI_MODEL_NAME=deepseek-chat

JWT_SECRET_KEY=your-secure-secret-key-32chars-or-more
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=86400

API_KEYS=key-prod-1,key-prod-2

CORS_ORIGINS=https://yourdomain.com

LOG_LEVEL=WARNING

MAX_CONTENT_LENGTH=1048576
MAX_INPUT_LENGTH=10000
MAX_CONTEXT_LENGTH=50000
```

#### Development Configuration

```bash
# .env for development
FLASK_DEBUG=true
FLASK_HOST=127.0.0.1
FLASK_PORT=5001

AI_API_KEY=your-dev-api-key
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_MODEL_NAME=qwen-turbo-latest

JWT_SECRET_KEY=dev-secret-key
JWT_ACCESS_TOKEN_EXPIRES=7200

API_KEYS=dev-key-1,dev-key-2

CORS_ORIGINS=*

LOG_LEVEL=DEBUG
```

---

<a name="chinese"></a>
## 中文

### 后端配置项详细说明

AI-Form服务器使用环境变量进行配置。配置可以通过以下方式提供：

1. **环境变量**（生产环境推荐）
2. **`.env` 文件**（开发环境）
3. **`config.json` 文件**（旧版支持）

#### 环境变量

在 `server/python-simple-server` 目录下创建 `.env` 文件，从 `.env.example` 复制：

```bash
cp .env.example .env
```

#### Flask 服务器设置

| 变量 | 描述 | 默认值 | 示例 |
|------|------|--------|------|
| `FLASK_DEBUG` | 启用调试模式 | `false` | `true` 或 `false` |
| `FLASK_HOST` | 服务器主机地址 | `0.0.0.0` | `127.0.0.1` |
| `FLASK_PORT` | 服务器端口 | `5001` | `8080` |
| `TESTING` | 启用测试模式 | `false` | `true` 或 `false` |

#### AI 服务配置

| 变量 | 描述 | 默认值 | 示例 |
|------|------|--------|------|
| `AI_API_KEY` | AI服务API密钥（必需） | - | `sk-xxxxxxxx` |
| `AI_BASE_URL` | AI服务端点URL | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `https://api.deepseek.com` |
| `AI_MODEL_NAME` | AI模型名称 | `qwen-turbo-latest` | `deepseek-chat`, `qwen-max` |
| `AI_PROXY` | 代理URL（可选） | - | `http://127.0.0.1:7897` |

**支持的AI提供商：**

| 提供商 | Base URL | 模型 |
|--------|----------|------|
| DeepSeek | `https://api.deepseek.com` | `deepseek-chat`, `deepseek-reasoner` |
| 通义千问（阿里） | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-turbo-latest`, `qwen-plus-latest`, `qwen-max` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4`, `gpt-3.5-turbo` |

#### 安全设置

| 变量 | 描述 | 默认值 | 示例 |
|------|------|--------|------|
| `MAX_CONTENT_LENGTH` | 最大请求大小（字节） | `1048576` (1MB) | `2097152` (2MB) |
| `MAX_INPUT_LENGTH` | 最大输入文本长度 | `10000` (10KB) | `50000` |
| `MAX_CONTEXT_LENGTH` | 最大上下文长度 | `50000` (50KB) | `100000` |
| `JWT_SECRET_KEY` | JWT签名密钥（认证必需） | - | `your-secret-key-here` |
| `JWT_ALGORITHM` | JWT算法 | `HS256` | `HS512` |
| `JWT_ACCESS_TOKEN_EXPIRES` | 访问令牌有效期（秒） | `3600` (1小时) | `7200` (2小时) |
| `JWT_REFRESH_TOKEN_EXPIRES` | 刷新令牌有效期（秒） | `2592000` (30天) | `86400` (1天) |
| `API_KEYS` | 有效API密钥（逗号分隔） | - | `key1,key2,key3` |

**生成安全密钥：**

```bash
# 生成JWT密钥
python -c "import secrets; print(secrets.token_hex(32))"

# 生成API密钥
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

#### 速率限制配置

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `RATE_LIMIT_DEFAULT` | 默认速率限制 | `100 per hour` |
| `RATE_LIMIT_CHAT` | 聊天端点速率限制 | `30 per minute` |
| `API_KEY_RATE_LIMIT` | API密钥认证速率限制 | `60 per minute` |

#### CORS 配置

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `CORS_ORIGINS` | 允许的来源（逗号分隔） | `*`（所有来源） |

**生产环境CORS示例：**
```
CORS_ORIGINS=https://example.com,https://api.example.com
```

#### 日志配置

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `LOG_LEVEL` | 日志级别 | `INFO` |

**可用级别：** `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`

### 配置文件格式

#### config.json（旧版）

```json
{
  "qwen-3-fast": {
    "model": {
      "name": "qwen-turbo-latest"
    },
    "server": {
      "url": "https://dashscope.aliyuncs.com/compatible-mode/v1"
    },
    "key": {
      "key": "your-api-key-here"
    },
    "proxy": {
      "socket": "http://127.0.0.1:7897"
    }
  },
  "deepseek-r1": {
    "model": {
      "name": "deepseek-chat"
    },
    "server": {
      "url": "https://api.deepseek.com"
    },
    "key": {
      "key": "your-api-key-here"
    },
    "proxy": {
      "socket": "http://127.0.0.1:7897"
    }
  }
}
```

### 前端配置项说明

客户端脚本（油猴）在脚本文件中有可配置选项：

#### 配置对象

```javascript
const Config = {
    // 快捷键配置
    shortcut: {
        altKey: true,      // 使用Alt键
        key: 'q'           // Alt+Q
    },

    // API 配置
    api: {
        server: 'http://192.168.3.186:5001',  // 后端服务器URL
        endpoint: '/ai/chat_remark',          // API端点
        timeout: 30000,                        // 请求超时（毫秒）
        maxRetries: 3,                         // 最大重试次数
        retryDelay: 1000                       // 重试延迟（毫秒）
    },

    // 表单搜索配置
    form: {
        parentSearchDepth: 4,    // 搜索父表单的深度
        singleInputMode: false   // 仅处理单个输入
    },

    // UI 配置
    ui: {
        position: { top: 50, right: 20 },  // 设置面板位置
        showSuggestionsContainer: false,   // 显示建议面板
        animationDuration: 300,            // 动画时长（毫秒）
        debounceDelay: 100                 // 防抖延迟（毫秒）
    }
};
```

#### 动态配置（油猴）

设置可以通过油猴存储动态更改：

```javascript
// 设置API服务器（跨会话持久化）
GM_setValue('apiServer', 'http://new-server:5001');

// 获取API服务器（带默认值回退）
const server = GM_getValue('apiServer', 'http://192.168.3.186:5001');

// 设置超时
GM_setValue('apiTimeout', 60000);
```

#### LocalStorage 设置

用户偏好存储在 localStorage：

| 键 | 描述 |
|-----|------|
| `formParentSearchDepth` | 表单父级搜索深度 |
| `singleInputMode` | 单输入模式开关 |
| `showSuggestionsContainer` | 显示建议容器 |
| `settingsPosition` | 设置面板位置 |
| `aiAssistant_chatContext` | 自定义聊天上下文 |

### 安全响应头

服务器自动应用以下安全响应头：

| 响应头 | 值 | 用途 |
|--------|-----|------|
| `X-Content-Type-Options` | `nosniff` | 防止MIME类型嗅探 |
| `X-Frame-Options` | `DENY` | 防止点击劫持 |
| `X-XSS-Protection` | `1; mode=block` | 旧浏览器XSS过滤器 |
| `Strict-Transport-Security` | `max-age=31536000` | 强制HTTPS |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | 引用来源控制 |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | 功能限制 |
| `Content-Security-Policy` | `default-src 'self'` | XSS防护 |
| `Cache-Control` | `no-store, no-cache` | 防止缓存 |

### 配置最佳实践

#### 生产环境配置

```bash
# .env for production
FLASK_DEBUG=false
FLASK_HOST=0.0.0.0
FLASK_PORT=5001

AI_API_KEY=your-production-api-key
AI_BASE_URL=https://api.deepseek.com
AI_MODEL_NAME=deepseek-chat

JWT_SECRET_KEY=your-secure-secret-key-32chars-or-more
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=86400

API_KEYS=key-prod-1,key-prod-2

CORS_ORIGINS=https://yourdomain.com

LOG_LEVEL=WARNING

MAX_CONTENT_LENGTH=1048576
MAX_INPUT_LENGTH=10000
MAX_CONTEXT_LENGTH=50000
```

#### 开发环境配置

```bash
# .env for development
FLASK_DEBUG=true
FLASK_HOST=127.0.0.1
FLASK_PORT=5001

AI_API_KEY=your-dev-api-key
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_MODEL_NAME=qwen-turbo-latest

JWT_SECRET_KEY=dev-secret-key
JWT_ACCESS_TOKEN_EXPIRES=7200

API_KEYS=dev-key-1,dev-key-2

CORS_ORIGINS=*

LOG_LEVEL=DEBUG
```

---

## Configuration Checklist / 配置检查清单

### Before Production Deployment

- [ ] Set `FLASK_DEBUG=false`
- [ ] Generate secure `JWT_SECRET_KEY` (32+ bytes)
- [ ] Configure valid `API_KEYS`
- [ ] Set specific `CORS_ORIGINS` (not `*`)
- [ ] Configure `AI_API_KEY` for production AI service
- [ ] Set appropriate rate limits
- [ ] Review `LOG_LEVEL` (use WARNING or ERROR)
- [ ] Ensure HTTPS is enabled
- [ ] Verify `MAX_CONTENT_LENGTH` is appropriate

### Before Development

- [ ] Copy `.env.example` to `.env`
- [ ] Configure your AI service API key
- [ ] Set `FLASK_DEBUG=true` for detailed logs
- [ ] Use `CORS_ORIGINS=*` for testing
- [ ] Set `LOG_LEVEL=DEBUG` for troubleshooting