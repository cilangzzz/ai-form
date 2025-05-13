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
python AiServer.py
```





## 社区与支持

- [提交Issue]()
- [开发文档]()
- [贡献指南]()
- [Slack社区]()

## 许可证

MIT © cilanguser@gmail.com