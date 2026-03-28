# AI智能表单测试工具 - 重构方案

## 一、背景与目的

### 项目现状
这是一个AI智能表单测试工具，采用**客户端-服务器架构**：
- **客户端**: Tampermonkey油猴脚本（约2000行代码）
- **服务端**: Python Flask后端（应用工厂模式）

### 重构目标
1. 统一后端代码结构（保留Python简单架构）
2. 模块化拆分油猴脚本
3. 支持多种前端框架（Vue、React、Angular、Svelte等）的表单渲染

---

## 二、项目结构分析

### 2.1 目录结构
```
ai-form-main/
├── client/
│   └── ai表单-0.1.user.js       # 油猴脚本（核心前端）
├── server/
│   └── python-simple-server/
│       ├── src/ai_form_server/  # 模块化代码（新版）
│       │   ├── app.py           # Flask应用工厂
│       │   ├── config.py        # 配置管理
│       │   ├── auth/            # 认证模块
│       │   ├── routes/          # API路由
│       │   └── services/        # AI服务
│       ├── tests/               # 测试套件
│       ├── AiServer.py          # 遗留代码（待删除）
│       ├── Chat.py              # 遗留代码（待删除）
│       ├── auth.py              # 遗留代码（待删除）
│       └── Roles.py             # 遆留代码（待删除）
│       └── config.json          # AI配置
└── img/                         # 使用示例
```

### 2.2 核心问题识别

| 问题 | 描述 | 影响 |
|------|------|------|
| 代码重复 | 根目录遗留文件与src/模块功能重复约90% | 维护困难 |
| 脚本臃肿 | 油猴脚本约2000行，UIManager占43% | 难以扩展 |
| 框架支持不全 | 仅支持Vue/React，缺少Angular等 | 功能受限 |
| 响应解析复杂 | ResponseParser多层策略，逻辑分散 | 维护困难 |
| 配置分散 | 配置在多个位置，不统一 | 易出错 |

---

## 三、潜在需求整理

| 类别 | 需求 | 优先级 | 说明 |
|------|------|--------|------|
| **架构改进** | 后端代码统一 | 高 | 删除遗留文件，保持模块化结构 |
| **架构改进** | 油猴脚本模块化拆分 | 高 | 使用Rollup打包，单一职责 |
| **功能扩展** | Angular框架支持 | 高 | 企业应用常见框架 |
| **功能扩展** | Ionic/Capacitor支持 | 高 | 移动端跨平台框架 |
| **功能扩展** | Vue/React优化 | 高 | 响应式更新优化 |
| **功能扩展** | Svelte框架支持 | 中 | 新兴轻量框架 |
| **功能扩展** | Web Components支持 | 中 | 浏览器标准组件模型 |
| **安全增强** | Prompt注入防护统一 | 中 | 提取到独立模块 |
| **可维护性** | 统一错误处理机制 | 高 | 集中管理异常 |
| **用户体验** | 表单填充进度反馈 | 中 | 可视化操作状态 |
| **测试覆盖** | 前端适配器单元测试 | 中 | 确保框架兼容性 |

---

## 四、技术选型（用户确认）

| 组件 | 选择 | 理由 |
|------|------|------|
| 构建工具 | **Rollup** | 体积更小，更适合油猴脚本IIFE输出 |
| 数据存储 | **内存存储** | 保持简单，适合小规模个人使用 |
| 框架支持 | 全框架 | Vue、React、Angular、Ionic、Svelte、Web Components |

---

## 四、后端重构方案

### 4.1 目标结构（保留Python简单架构）
```
server/python-simple-server/
├── src/ai_form_server/
│   ├── __init__.py
│   ├── __main__.py          # 统一入口
│   ├── app.py               # 应用工厂（保留）
│   ├── config.py            # 配置管理（保留）
│   ├── auth/
│   │   ├── decorators.py    # 认证装饰器（保留）
│   │   └── jwt_handler.py   # JWT处理（保留）
│   ├── routes/
│   │   └── chat.py          # Chat路由（更新）
│   ├── services/
│   │   ├── chat.py          # AI服务（保留）
│   │   └ roles.py           # AI角色（保留）
│   └── validators/          # 新增模块
│       ├── prompt.py        # Prompt注入检测
│       └── input.py         # 输入验证
├── tests/
├── pyproject.toml
└── config.json
```

### 4.2 遗留文件处理

| 文件 | 处理 |
|------|------|
| `AiServer.py` | 删除 |
| `Chat.py` | 删除 |
| `auth.py` | 删除 |
| `Roles.py` | 删除 |

### 4.3 新增验证器模块

```python
# validators/prompt.py
class PromptValidator:
    PatternsRegistry: Dict[str, List[re.Pattern]]

    def detect(self, text: str) -> ValidationResult
    def sanitize(self, text: str) -> SanitizationResult
    def get_severity_level(self, patterns: List) -> SeverityLevel
```

---

## 五、油猴脚本重构方案

### 5.1 目标架构
```
client/
├── src/
│   ├── core/
│   │   ├── Config.js         # 配置管理
│   │   ├── State.js          # 状态管理
│   │   └── EventBus.js       # 事件总线（新增）
│   │
│   ├── api/
│   │   ├── ApiClient.js      # API请求封装
│   │   └── ResponseParser.js # 响应解析（简化）
│   │
│   ├── form/
│   │   ├── FormDataExtractor.js  # 表单数据提取
│   │   ├── FormFiller.js         # 表单填充协调器
│   │   └── adapters/             # 框架适配器
│   │       ├── BaseAdapter.js    # 适配器基类
│   │       ├── VanillaAdapter.js # 原生DOM
│   │       ├── VueAdapter.js     # Vue适配器
│   │       ├── ReactAdapter.js   # React适配器
│   │       ├── AngularAdapter.js # Angular适配器
│   │       ├── SvelteAdapter.js  # Svelte适配器
│   │       ├── WebComponentsAdapter.js # Web Components适配器
│   │       ├── IonicAdapter.js   # Ionic/Capacitor适配器
│   │       └── AdapterRegistry.js# 适配器注册中心
│   │
│   ├── ui/
│   │   ├── UIManager.js      # UI协调器（精简）
│   │   ├── components/       # UI组件
│   │   │   ├── SuggestionsContainer.js
│   │   │   ├── SettingsPanel.js
│   │   │   └── LoadingIndicator.js
│   │   └── styles/
│   │   └── Styles.js     # 样式定义
│   │
│   ├── utils/
│   │   ├── Utils.js          # 工具函数
│   │   ├── DomHelpers.js     # DOM辅助（新增）
│   │   └── SecurityHelpers.js# 安全辅助（新增）
│   │
│   └── App.js                # 主应用入口
│
├── dist/
│   └── ai-form.user.js       # 打包输出
│
├── build/
│   └── rollup.config.js      # Rollup打包配置
│
└── tests/
```

### 5.2 模块职责

| 模块 | 职责 | 预估行数 |
|------|------|----------|
| `Config.js` | 配置加载/保存/验证 | ~60行 |
| `State.js` | 全局状态管理 | ~40行 |
| `EventBus.js` | 模块间通信（松耦合） | ~50行 |
| `ApiClient.js` | HTTP请求/重试/超时 | ~80行 |
| `ResponseParser.js` | JSON解析（简化版） | ~60行 |
| `FormDataExtractor.js` | 表单元数据提取 | ~100行 |
| `FormFiller.js` | 填充协调，选择适配器 | ~80行 |
| `adapters/*.js` | 各框架表单填充逻辑 | 各~60行 |
| `UIManager.js` | UI组件生命周期 | ~150行 |
| `components/*.js` | UI组件实现 | 各~100行 |

---

## 六、前端框架适配器设计

### 6.1 适配器基类
```javascript
class BaseAdapter {
    constructor() {
        this.name = 'base';
        this.priority = 0;  // 检测优先级
    }

    detect() { throw new Error('必须实现'); }
    setValue(element, value) { throw new Error('必须实现'); }
    triggerEvents(element, events) { ... }
    fillForm(fieldsMap) { ... }
}
```

### 6.2 适配器注册中心
```javascript
class AdapterRegistry {
    register(adapter) { ... }
    detectFramework() {
        // 按优先级检测，缓存结果
    }
}
```

### 6.3 各框架适配策略

| 框架 | 检测方法 | 值设置策略 | 优先级 |
|------|----------|------------|--------|
| **Vue 2** | `__vue__`属性 | 原生setter + $set | 40 |
| **Vue 3** | `__vueApp__` | 原生setter（Proxy响应） | 40 |
| **React** | `_reactInternals` | 原生setter + 合成事件 | 35 |
| **Angular** | `[ng-version]`属性 | FormControl.setValue() | 30 |
| **Ionic** | `[ng-version]`或ionic类名 | Angular/React策略 | 28 |
| **Svelte** | `__svelte_meta` | 原生setter + 自定义事件 | 25 |
| **Web Components** | 自定义元素检测 | 原生setter + 事件 | 20 |
| **Vanilla** | 默认 | 原生value setter | 0 |

### 6.4 Ionic/Capacitor适配器说明

Ionic框架基于Angular或React，适配策略：
- **Ionic Angular**: 使用Angular适配器 + Ionic组件特殊处理（ion-input等）
- **Ionic React**: 使用React适配器 + Ionic组件特殊处理

```javascript
class IonicAdapter extends BaseAdapter {
    detect() {
        return document.querySelector('ion-app') ||
               document.querySelector('[class*="ionic"]') ||
               window.Ionic;
    }

    setValue(element, value) {
        // Ionic特殊组件处理
        if (element.tagName.startsWith('ION-')) {
            element.value = value;
            element.dispatchEvent(new CustomEvent('ionChange', { detail: { value } }));
        } else {
            // 使用底层框架适配器
            this.delegateToFrameworkAdapter(element, value);
        }
    }
}
```

---

## 七、响应解析器简化

### 当前问题
多层解析策略导致逻辑分散，错误处理复杂。

### 简化方案
```javascript
class ResponseParser {
    parse(responseStr) {
        // 1. 直接JSON解析
        const direct = this.tryDirectParse(responseStr);
        if (direct) return direct;

        // 2. 清理后解析
        const cleaned = this.tryCleanedParse(responseStr);
        if (cleaned) return cleaned;

        // 3. 请求AI修复格式
        return this.requestFix(responseStr);
    }
}
```

---

## 八、重构步骤与优先级

### Phase 1: 后端统一（高优先级）
| 步骤 | 任务 | 验收标准 |
|------|------|----------|
| 1 | 创建validators模块 | 单元测试通过 |
| 2 | 更新routes/chat.py | API测试通过 |
| 3 | 删除遗留文件 | 功能正常 |
| 4 | 更新文档 | 描述准确 |

### Phase 2: 油猴脚本模块拆分（高优先级）
| 步骤 | 任务 | 验收标准 |
|------|------|----------|
| 1 | 创建构建配置 | 成功打包 |
| 2 | 拆分核心模块 | 模块可加载 |
| 3 | 创建EventBus | 通信正常 |
| 4 | 拆分UI组件 | 渲染正常 |
| 5 | 创建适配器架构 | Vue/React正常 |

### Phase 3: 框架适配器扩展（中优先级）
| 步骤 | 任务 | 验收标准 |
|------|------|----------|
| 1 | Angular适配器 | 表单填充测试通过 |
| 2 | Ionic/Capacitor适配器 | ion-input等组件测试通过 |
| 3 | Svelte适配器 | 表单填充测试通过 |
| 4 | Web Components适配器 | 自定义元素测试通过 |
| 5 | Vue/React适配器优化 | 响应式更新准确 |
| 6 | 适配器优先级调优 | 检测准确率>90% |

### Phase 4: 测试与文档（中优先级）
| 步骤 | 任务 | 验收标准 |
|------|------|----------|
| 1 | 后端单元测试 | 覆盖率>80% |
| 2 | 前端适配器测试 | 覆盖率>70% |
| 3 | API集成测试 | E2E通过 |
| 4 | 用户文档 | 完整可用 |

---

## 九、关键文件清单

| 文件 | 操作 | 路径 |
|------|------|------|
| 油猴脚本（原） | 拆分重构 | `client/ai表单-0.1.user.js` |
| Flask应用工厂 | 保留 | `server/src/ai_form_server/app.py` |
| Chat路由 | 更新验证依赖 | `server/src/ai_form_server/routes/chat.py` |
| 遗留服务器 | 删除 | `server/AiServer.py` |
| 配置管理 | 保留 | `server/src/ai_form_server/config.py` |

---

## 十、验证方式

### 后端验证
1. 运行pytest测试套件
2. 启动服务器，测试API端点
3. 检查安全头和限流配置

### 前端验证
1. 安装油猴脚本到浏览器
2. 在Vue/React/Angular示例页面测试表单填充
3. 测试快捷键响应和UI交互
4. 检查敏感字段过滤是否正常

### 集成测试
1. 完整流程：表单提取 → AI请求 → 响应解析 → 表单填充
2. 各框架的表单响应式更新是否正确触发