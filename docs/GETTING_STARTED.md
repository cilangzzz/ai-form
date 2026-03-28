# Getting Started / 快速开始

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## English

### Project Introduction

AI-Form is an intelligent front-end form testing tool designed for front-end developers. It uses artificial intelligence technology to automate the front-end form testing process, simulating user interactions, validating form behaviors, and providing detailed test reports to significantly improve front-end form quality assurance efficiency.

#### Key Features

- **Smart Form Field Recognition**: Automatically identifies form field types and structures
- **Test Data Generation**: AI generates valid test data based on field requirements
- **Cross-Framework Support**: Compatible with Vue, React, and native HTML forms
- **User Interaction Simulation**: Mimics real user input patterns
- **Security Protection**: Built-in prompt injection detection and input sanitization

### Installation Steps

#### 1. Install the Tampermonkey Script (Client)

**Prerequisites:**
- Install [Tampermonkey](https://www.tampermonkey.com/) browser extension
- Supported browsers: Chrome, Firefox, Edge, Safari

**Installation:**

1. Open Tampermonkey extension in your browser
2. Click "Create a new script" or "Add a new script"
3. Copy the content from `client/ai表单-0.1.user.js` file
4. Paste into the script editor
5. Save the script

**Enable Cross-Origin Access:**

In Tampermonkey settings, allow cross-origin requests:
1. Go to Tampermonkey Settings
2. Navigate to "Security" tab
3. Enable "Allow cross-origin requests"

#### 2. Deploy the Backend Server

**Prerequisites:**
- Python 3.8+ installed
- pip package manager

**Step-by-step:**

```bash
# Navigate to server directory
cd server/python-simple-server

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env file and configure your API keys
# See CONFIGURATION.md for detailed configuration guide

# Start the server
python AiServer.py
```

Or use the package installation method:

```bash
# Install as a package
pip install -e .

# Run as module
python -m ai_form_server
```

### Quick Start Guide

#### Basic Usage

1. **Open any webpage with forms** - The script automatically activates on all pages
2. **Focus on a form input field** - Click on any input, textarea, or select element
3. **Press the shortcut key** - Default: `Alt+Q`
4. **View AI suggestions** - A suggestion panel will appear near the focused field
5. **Click to apply** - Click on a suggestion to auto-fill the form

#### Changing Settings

Access settings through:
1. **Tampermonkey menu** - Click Tampermonkey icon, select "AI Form Settings"
2. **Settings icon** - Click the gear icon in the suggestion panel

#### Configuration Example

```javascript
// Client configuration (in the script)
const Config = {
    shortcut: { altKey: true, key: 'q' },  // Alt+Q shortcut
    api: {
        server: 'http://192.168.3.186:5001',  // API server address
        endpoint: '/ai/chat_remark',
        timeout: 30000
    }
};
```

### Basic Configuration

#### Client Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `shortcut` | Keyboard shortcut configuration | `{ altKey: true, key: 'q' }` |
| `api.server` | Backend API server URL | `http://192.168.3.186:5001` |
| `api.timeout` | Request timeout in milliseconds | `30000` (30 seconds) |
| `form.parentSearchDepth` | Depth to search for parent form | `4` |
| `form.singleInputMode` | Process single input only | `false` |

#### Server Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `AI_API_KEY` | AI service API key | Required |
| `AI_BASE_URL` | AI service endpoint | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `AI_MODEL_NAME` | Model name | `qwen-turbo-latest` |
| `JWT_SECRET_KEY` | JWT signing secret | Required for auth |
| `API_KEYS` | Valid API keys for authentication | Optional |

See [CONFIGURATION.md](./CONFIGURATION.md) for complete configuration details.

---

<a name="chinese"></a>
## 中文

### 项目简介

AI-Form 是一个专为前端开发者设计的智能表单测试工具，利用人工智能技术自动化前端表单的测试流程。它能够模拟用户交互，验证表单行为，并提供详细的测试报告，大幅提升前端表单的质量保障效率。

#### 主要功能

- **智能表单字段识别**：自动识别表单字段类型和结构
- **测试数据生成**：AI根据字段要求生成有效的测试数据
- **跨框架支持**：兼容Vue、React和原生HTML表单
- **用户交互模拟**：模拟真实用户输入模式
- **安全防护**：内置提示注入检测和输入清理机制

### 安装步骤

#### 1. 安装油猴脚本（客户端）

**前置条件：**
- 安装 [Tampermonkey](https://www.tampermonkey.com/) 浏览器扩展
- 支持浏览器：Chrome、Firefox、Edge、Safari

**安装方法：**

1. 在浏览器中打开 Tampermonkey 扩展
2. 点击"创建新脚本"或"添加新脚本"
3. 复制 `client/ai表单-0.1.user.js` 文件内容
4. 粘贴到脚本编辑器中
5. 保存脚本

**允许跨域访问：**

在 Tampermonkey 设置中允许跨域请求：
1. 进入 Tampermonkey 设置
2. 选择"安全"标签
3. 启用"允许跨域请求"

#### 2. 部署后端服务器

**前置条件：**
- 已安装 Python 3.8+
- pip 包管理器

**安装步骤：**

```bash
# 进入服务器目录
cd server/python-simple-server

# 安装依赖
pip install -r requirements.txt

# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，配置您的 API 密钥
# 详细配置说明请参阅 CONFIGURATION.md

# 启动服务器
python AiServer.py
```

或使用包安装方式：

```bash
# 安装为包
pip install -e .

# 以模块方式运行
python -m ai_form_server
```

### 快速开始指南

#### 基本使用

1. **打开任意包含表单的网页** - 脚本在所有页面自动激活
2. **聚焦表单输入字段** - 点击任意input、textarea或select元素
3. **按下快捷键** - 默认：`Alt+Q`
4. **查看AI建议** - 建议面板会出现在聚焦字段附近
5. **点击应用** - 点击建议即可自动填充表单

#### 更改设置

可通过以下方式访问设置：
1. **油猴菜单** - 点击油猴图标，选择"AI Form Settings"
2. **设置图标** - 点击建议面板中的齿轮图标

#### 配置示例

```javascript
// 客户端配置（在脚本中）
const Config = {
    shortcut: { altKey: true, key: 'q' },  // Alt+Q 快捷键
    api: {
        server: 'http://192.168.3.186:5001',  // API服务器地址
        endpoint: '/ai/chat_remark',
        timeout: 30000
    }
};
```

### 基本配置

#### 客户端设置

| 设置项 | 说明 | 默认值 |
|--------|------|--------|
| `shortcut` | 快捷键配置 | `{ altKey: true, key: 'q' }` |
| `api.server` | 后端API服务器URL | `http://192.168.3.186:5001` |
| `api.timeout` | 请求超时时间（毫秒） | `30000`（30秒） |
| `form.parentSearchDepth` | 搜索父表单的深度 | `4` |
| `form.singleInputMode` | 仅处理单个输入 | `false` |

#### 服务器设置

| 设置项 | 说明 | 默认值 |
|--------|------|--------|
| `AI_API_KEY` | AI服务API密钥 | 必需 |
| `AI_BASE_URL` | AI服务端点 | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `AI_MODEL_NAME` | 模型名称 | `qwen-turbo-latest` |
| `JWT_SECRET_KEY` | JWT签名密钥 | 认证必需 |
| `API_KEYS` | 用于认证的有效API密钥 | 可选 |

完整配置详情请参阅 [CONFIGURATION.md](./CONFIGURATION.md)。

---

## Next Steps / 下一步

- Read [API_REFERENCE.md](./API_REFERENCE.md) for API details
- Read [ADAPTERS.md](./ADAPTERS.md) for framework compatibility
- Read [CONFIGURATION.md](./CONFIGURATION.md) for advanced configuration
- Read [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues