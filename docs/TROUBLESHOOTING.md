# Troubleshooting / 故障排除

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## English

### Frequently Asked Questions (FAQ)

#### Q1: The script doesn't work on certain websites

**Possible Causes:**
- Website uses Content Security Policy (CSP) that blocks inline scripts
- Website has strict Cross-Origin Resource Sharing (CORS) policy
- Script is blocked by other browser extensions

**Solutions:**
1. Check Tampermonkey settings to ensure cross-origin requests are allowed
2. Add the website to Tampermonkey's allowed list
3. Disable other extensions temporarily to check for conflicts
4. Check browser console for CSP errors

#### Q2: The suggestion panel doesn't appear when pressing the shortcut

**Possible Causes:**
- Server is not running or unreachable
- API endpoint is incorrect
- Authentication failed
- No form fields detected

**Solutions:**
1. Check server status: `curl http://your-server:5001/ai/health`
2. Verify API server URL in settings matches your server
3. Check if API key is configured correctly
4. Ensure you're focused on a form input element

#### Q3: Form values are set but the application doesn't recognize them

**Possible Causes:**
- Framework-specific event handling not triggered
- React/Vue synthetic event system not activated

**Solutions:**
1. For React: Ensure events are dispatched properly
2. For Vue: Check if v-model binding is working
3. Try clicking outside the field after auto-fill to trigger change events
4. Check browser console for framework-specific errors

#### Q4: Authentication errors when calling the API

**Possible Causes:**
- API key is incorrect or not configured
- JWT token has expired
- Invalid token format

**Solutions:**
1. Verify API key is in the `API_KEYS` environment variable
2. For JWT: Refresh the token using `/auth/refresh`
3. Check token format: `Authorization: Bearer <token>`
4. Ensure `JWT_SECRET_KEY` is consistent across restarts

#### Q5: Rate limit exceeded errors

**Possible Causes:**
- Too many requests in a short time
- Rate limit configuration too restrictive

**Solutions:**
1. Wait before making more requests
2. Adjust rate limits in environment variables:
   ```bash
   RATE_LIMIT_CHAT=60 per minute
   ```
3. Implement request queuing on the client side

### Debugging Tips

#### Enable Debug Logging

**Server-side:**

```bash
# Set log level to DEBUG
LOG_LEVEL=DEBUG
```

**Client-side:**

Open browser developer console (F12) and check for:
- Network requests to the API
- JavaScript errors in the console
- Response data in the Network tab

#### Check Server Health

```bash
# Health check
curl http://localhost:5001/ai/health

# Expected response
{
  "status": "healthy",
  "checks": {
    "api_configured": true,
    "model": "qwen-turbo-latest"
  }
}
```

#### Verify Configuration

```bash
# Check environment variables are loaded
python -c "from dotenv import load_dotenv; import os; load_dotenv(); print(os.getenv('AI_API_KEY'))"

# Verify JWT configuration
python -c "from dotenv import load_dotenv; import os; load_dotenv(); print('JWT_SECRET_KEY:', os.getenv('JWT_SECRET_KEY', 'NOT SET'))"
```

#### Test API Directly

```bash
# Test with API key
curl -X POST http://localhost:5001/ai/chat_remark \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"userInput": "test: text input"}'

# Test authentication
curl -X POST http://localhost:5001/auth/token \
  -H "Content-Type: application/json" \
  -d '{"api_key": "your-api-key"}'
```

### Error Troubleshooting Guide

#### Error: "Connection refused" / "Network error"

**Diagnosis:**
- Server is not running
- Wrong host/port configuration
- Firewall blocking the connection

**Steps:**
1. Start the server: `python AiServer.py`
2. Verify host and port in `.env`
3. Check firewall rules
4. Test local connectivity: `curl http://127.0.0.1:5001/ai/health`

#### Error: "Authentication required" (401)

**Diagnosis:**
- Missing authentication header
- Invalid API key or token

**Steps:**
1. Add `X-API-Key` header to request
2. Or add `Authorization: Bearer <token>` header
3. Verify API key is in `API_KEYS` environment variable
4. For JWT: Ensure token hasn't expired

#### Error: "Invalid API key" (403)

**Diagnosis:**
- API key not in allowed list

**Steps:**
1. Check `API_KEYS` in `.env` file
2. Restart server after changing API keys
3. Ensure no trailing spaces in API key

#### Error: "Rate limit exceeded" (429)

**Diagnosis:**
- Too many requests in time window

**Steps:**
1. Wait and retry
2. Check rate limit headers in response
3. Increase rate limits if needed:
   ```bash
   RATE_LIMIT_CHAT=60 per minute
   ```

#### Error: "AI service error" (500)

**Diagnosis:**
- AI service unreachable or misconfigured
- Invalid API key for AI service
- Model not available

**Steps:**
1. Verify `AI_API_KEY` is valid
2. Check `AI_BASE_URL` is correct
3. Verify `AI_MODEL_NAME` is available
4. Check server logs for detailed error
5. Test AI service connectivity

#### Error: "Request timeout"

**Diagnosis:**
- AI service taking too long to respond
- Network latency issues

**Steps:**
1. Increase timeout in client configuration:
   ```javascript
   api: { timeout: 60000 }  // 60 seconds
   ```
2. Check proxy configuration if using one
3. Verify AI service status

#### Error: Form not detected

**Diagnosis:**
- Form structure not recognized
- Input elements not properly identified

**Steps:**
1. Increase `parentSearchDepth`:
   ```javascript
   form: { parentSearchDepth: 6 }
   ```
2. Check if inputs are within an iframe (not supported)
3. Verify inputs have `name` or `id` attributes

### Debug Mode

#### Enable Server Debug Mode

```bash
# In .env
FLASK_DEBUG=true
LOG_LEVEL=DEBUG
```

#### Client Debug Console

Open browser console and run:

```javascript
// Check detected frameworks
FormFiller.detectFramework();

// Check current configuration
console.log(Config);

// Check state
console.log(State);

// Manually trigger suggestion fetch
fetchSuggestions();
```

### Log Analysis

#### Server Logs

Look for these patterns in server logs:

```
# Successful request
[INFO] Request ID: xxx - Successfully processed AI request

# Authentication failure
[WARNING] Invalid API key attempt

# Rate limit
[WARNING] Rate limit exceeded for IP: xxx

# AI service error
[ERROR] Error processing AI request: AuthenticationError
```

#### Client Logs

Check browser console for:

```javascript
// Script loaded
"AI Form Autofill Helper initialized. Press Alt+Q to get suggestions."

// Framework detection
"Detected frameworks: {vue: true, react: false}"

// API errors
"Error fetching suggestions: ..."
```

### Common Configuration Mistakes

| Mistake | Symptom | Solution |
|---------|---------|----------|
| Wrong API server URL | Connection errors | Check URL in client settings |
| Missing API key | 401/403 errors | Configure API_KEYS env var |
| Expired JWT token | 401 errors | Refresh token |
| Wrong AI model name | AI service errors | Check available models |
| Missing proxy config | Connection timeout | Configure AI_PROXY |
| CORS issues | Blocked requests | Configure CORS_ORIGINS |
| CSP blocking | Script not working | Relax CSP or use extension |

---

<a name="chinese"></a>
## 中文

### 常见问题 FAQ

#### Q1: 脚本在某些网站上不工作

**可能原因：**
- 网站使用内容安全策略(CSP)阻止内联脚本
- 网站有严格的跨域资源共享(CORS)策略
- 脚本被其他浏览器扩展阻止

**解决方案：**
1. 检查油猴设置，确保允许跨域请求
2. 将网站添加到油猴的允许列表
3. 暂时禁用其他扩展检查冲突
4. 检查浏览器控制台的CSP错误

#### Q2: 按下快捷键后建议面板不出现

**可能原因：**
- 服务器未运行或无法访问
- API端点配置错误
- 认证失败
- 未检测到表单字段

**解决方案：**
1. 检查服务器状态：`curl http://your-server:5001/ai/health`
2. 确认设置中的API服务器URL与您的服务器匹配
3. 检查API密钥是否正确配置
4. 确保焦点在表单输入元素上

#### Q3: 表单值已设置但应用无法识别

**可能原因：**
- 框架特定事件处理未触发
- React/Vue合成事件系统未激活

**解决方案：**
1. 对于React：确保事件正确分发
2. 对于Vue：检查v-model绑定是否工作
3. 自动填充后尝试点击字段外部以触发change事件
4. 检查浏览器控制台的框架特定错误

#### Q4: 调用API时出现认证错误

**可能原因：**
- API密钥不正确或未配置
- JWT令牌已过期
- 令牌格式无效

**解决方案：**
1. 验证API密钥在 `API_KEYS` 环境变量中
2. 对于JWT：使用 `/auth/refresh` 刷新令牌
3. 检查令牌格式：`Authorization: Bearer <token>`
4. 确保 `JWT_SECRET_KEY` 在重启后保持一致

#### Q5: 速率限制超出错误

**可能原因：**
- 短时间内请求过多
- 速率限制配置过于严格

**解决方案：**
1. 等待后再发出更多请求
2. 在环境变量中调整速率限制：
   ```bash
   RATE_LIMIT_CHAT=60 per minute
   ```
3. 在客户端实现请求队列

### 调试技巧

#### 启用调试日志

**服务器端：**

```bash
# 设置日志级别为DEBUG
LOG_LEVEL=DEBUG
```

**客户端：**

打开浏览器开发者工具(F12)并检查：
- 发送到API的网络请求
- 控制台中的JavaScript错误
- 网络选项卡中的响应数据

#### 检查服务器健康状态

```bash
# 健康检查
curl http://localhost:5001/ai/health

# 预期响应
{
  "status": "healthy",
  "checks": {
    "api_configured": true,
    "model": "qwen-turbo-latest"
  }
}
```

#### 验证配置

```bash
# 检查环境变量是否加载
python -c "from dotenv import load_dotenv; import os; load_dotenv(); print(os.getenv('AI_API_KEY'))"

# 验证JWT配置
python -c "from dotenv import load_dotenv; import os; load_dotenv(); print('JWT_SECRET_KEY:', os.getenv('JWT_SECRET_KEY', 'NOT SET'))"
```

#### 直接测试API

```bash
# 使用API密钥测试
curl -X POST http://localhost:5001/ai/chat_remark \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"userInput": "test: text input"}'

# 测试认证
curl -X POST http://localhost:5001/auth/token \
  -H "Content-Type: application/json" \
  -d '{"api_key": "your-api-key"}'
```

### 错误排查指南

#### 错误："Connection refused" / "Network error"

**诊断：**
- 服务器未运行
- 主机/端口配置错误
- 防火墙阻止连接

**步骤：**
1. 启动服务器：`python AiServer.py`
2. 验证 `.env` 中的主机和端口
3. 检查防火墙规则
4. 测试本地连接：`curl http://127.0.0.1:5001/ai/health`

#### 错误："Authentication required" (401)

**诊断：**
- 缺少认证头
- API密钥或令牌无效

**步骤：**
1. 在请求中添加 `X-API-Key` 头
2. 或添加 `Authorization: Bearer <token>` 头
3. 验证API密钥在 `API_KEYS` 环境变量中
4. 对于JWT：确保令牌未过期

#### 错误："Invalid API key" (403)

**诊断：**
- API密钥不在允许列表中

**步骤：**
1. 检查 `.env` 文件中的 `API_KEYS`
2. 更改API密钥后重启服务器
3. 确保API密钥没有尾随空格

#### 错误："Rate limit exceeded" (429)

**诊断：**
- 时间窗口内请求过多

**步骤：**
1. 等待后重试
2. 检查响应中的速率限制头
3. 如需要，增加速率限制：
   ```bash
   RATE_LIMIT_CHAT=60 per minute
   ```

#### 错误："AI service error" (500)

**诊断：**
- AI服务无法访问或配置错误
- AI服务API密钥无效
- 模型不可用

**步骤：**
1. 验证 `AI_API_KEY` 有效
2. 检查 `AI_BASE_URL` 正确
3. 验证 `AI_MODEL_NAME` 可用
4. 检查服务器日志获取详细错误
5. 测试AI服务连接

#### 错误："Request timeout"

**诊断：**
- AI服务响应时间过长
- 网络延迟问题

**步骤：**
1. 增加客户端配置中的超时：
   ```javascript
   api: { timeout: 60000 }  // 60秒
   ```
2. 如果使用代理，检查代理配置
3. 验证AI服务状态

#### 错误：表单未检测到

**诊断：**
- 表单结构未识别
- 输入元素未正确识别

**步骤：**
1. 增加 `parentSearchDepth`：
   ```javascript
   form: { parentSearchDepth: 6 }
   ```
2. 检查输入是否在iframe中（不支持）
3. 验证输入有 `name` 或 `id` 属性

### 调试模式

#### 启用服务器调试模式

```bash
# 在 .env 中
FLASK_DEBUG=true
LOG_LEVEL=DEBUG
```

#### 客户端调试控制台

打开浏览器控制台并运行：

```javascript
// 检查检测到的框架
FormFiller.detectFramework();

// 检查当前配置
console.log(Config);

// 检查状态
console.log(State);

// 手动触发建议获取
fetchSuggestions();
```

### 日志分析

#### 服务器日志

在服务器日志中查找这些模式：

```
# 成功请求
[INFO] Request ID: xxx - Successfully processed AI request

# 认证失败
[WARNING] Invalid API key attempt

# 速率限制
[WARNING] Rate limit exceeded for IP: xxx

# AI服务错误
[ERROR] Error processing AI request: AuthenticationError
```

#### 客户端日志

检查浏览器控制台：

```javascript
// 脚本已加载
"AI Form Autofill Helper initialized. Press Alt+Q to get suggestions."

// 框架检测
"Detected frameworks: {vue: true, react: false}"

// API错误
"Error fetching suggestions: ..."
```

### 常见配置错误

| 错误 | 症状 | 解决方案 |
|------|------|----------|
| API服务器URL错误 | 连接错误 | 检查客户端设置中的URL |
| 缺少API密钥 | 401/403错误 | 配置API_KEYS环境变量 |
| JWT令牌过期 | 401错误 | 刷新令牌 |
| AI模型名称错误 | AI服务错误 | 检查可用模型 |
| 缺少代理配置 | 连接超时 | 配置AI_PROXY |
| CORS问题 | 请求被阻止 | 配置CORS_ORIGINS |
| CSP阻止 | 脚本不工作 | 放宽CSP或使用扩展 |

---

## Getting Help / 获取帮助

If you encounter issues not covered in this guide:

1. **Check the logs** - Server logs often contain detailed error information
2. **Review configuration** - Ensure all required environment variables are set
3. **Test components individually** - Isolate whether the issue is client-side or server-side
4. **Open an issue** - Provide detailed information including:
   - Error messages
   - Server logs
   - Browser console output
   - Steps to reproduce

如果遇到本指南未涵盖的问题：

1. **检查日志** - 服务器日志通常包含详细的错误信息
2. **审查配置** - 确保所有必需的环境变量已设置
3. **单独测试组件** - 隔离问题是客户端还是服务器端
4. **提交问题** - 提供详细信息，包括：
   - 错误消息
   - 服务器日志
   - 浏览器控制台输出
   - 复现步骤