# AI-Form 智能前端表单测试工具

![](https://img.shields.io/badge/-JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![](https://img.shields.io/badge/-Python-3776AB?style=flat-square&logo=python&logoColor=white)
![](https://img.shields.io/badge/-MIT_License-000000?style=flat-square&logo=open-source-initiative&logoColor=white)
![](https://img.shields.io/badge/-tampermonkey-61DAFB?style=flat-square&logo=tampermonkey&logoColor=white)

## 项目简介

AI-Form 是一个专为前端开发者设计的智能表单测试工具，利用人工智能技术自动化前端表单的测试流程。它能够模拟用户交互，验证表单行为，并提供详细的测试报告，大幅提升前端表单的质量保障效率。

## 技术栈

### 前端框架支持
![](https://img.shields.io/badge/-tampermonkey-61DAFB?style=flat-square&logo=tampermonkey&logoColor=white)

### 后端支持
![](https://img.shields.io/badge/-Flask-000000?style=flat-square&logo=flask&logoColor=white)
![](https://img.shields.io/badge/-FastApi-a?style=flat-square&logo=thanos&logoColor=white)

## 功能特性

### 🚀 前端表单自动化测试
- 跨浏览器兼容性测试
- 响应式设计验证
- 表单验证逻辑测试
- 表单提交流程模拟

### 🧠 AI 增强能力
- 智能识别表单字段类型和结构
- 自动生成有效的测试数据
- 模拟真实用户交互模式
- 检测UI/UX问题和可访问性缺陷

## 项目架构

### 模块化架构

后端服务器采用现代化的 Python 模块化架构设计：

```
server/python-simple-server/
├── src/ai_form_server/          # 主包
│   ├── app.py                   # Flask 应用工厂
│   ├── config.py                # 配置管理
│   ├── auth/                    # 认证模块
│   │   ├── jwt_handler.py       # JWT 令牌管理
│   │   └── decorators.py        # 认证装饰器
│   ├── services/                # 业务逻辑
│   │   ├── chat.py              # AI 聊天服务
│   │   └── roles.py             # AI 角色定义
│   ├── validators/              # 输入验证模块
│   │   ├── prompt.py            # Prompt 注入检测
│   │   └── input.py             # 输入验证工具
│   └── routes/                  # API 路由
│       └── chat.py              # 聊天 API 端点
└── tests/                       # 测试套件
```

### Validators 模块

`validators` 模块提供输入验证和安全防护功能：

**PromptValidator - Prompt 注入检测**

```python
from ai_form_server.validators import PromptValidator

validator = PromptValidator()

# 检测潜在的 prompt 注入攻击
result = validator.detect("ignore all previous instructions")
if not result.is_safe:
    print(f"检测到注入模式: {result.detected_patterns}")

# 清理用户输入
sanitized = validator.sanitize(user_input, max_length=5000)
```

**InputValidator - 输入验证**

```python
from ai_form_server.validators import InputValidator

# 验证输入长度
result = InputValidator.validate_length(
    input_str=user_input,
    max_length=5000,
    field_name="userInput"
)

# 安全地处理错误信息
safe_message = InputValidator.sanitize_error_message(exception)
```


## 示例
> 搜索建议
> 
![img](img%2Fai-form-search-usage.png)

> 注册测试
> 
![img](img%2Fai-form-register-usage.png)

> 注入测试
> 
> ![img](img%2Fai-form-inject-usage.png)

## 安装使用

### 配置客户端

> 1.将client的js文件安装到tampermonkey
> 2.tampermonkey安全允许跨域访问
> 3.配置参数
> 

```js
const SHORTCUT_KEY = { altKey: true, key: 'q' }; // Alt+A as shortcut key
const API_SERVER = 'http://192.168.3.186:5001'; // API server address
const API_ENDPOINT = '/ai/chat_remark'; // API endpoint path
```



### 配置服务器

> 1.配置ai服务器key [config.json](server%2Fpython-simple-server%2Fconfig.json)
>
> 2.启用服务器
>

```shell
cd server/python-simple-server
python -m ai_form_server
```





## 社区与支持

- [提交Issue]()
- [开发文档]()
- [贡献指南]()
- [Slack社区]()

## 许可证

MIT © cilanguser@gmail.com