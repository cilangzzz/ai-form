# Adapters / 适配器文档

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## English

### Adapter Architecture Overview

The AI-Form client script includes an intelligent framework detection and form filling system that automatically adapts to different JavaScript frameworks. This ensures proper data binding when filling form fields, maintaining compatibility with reactive frameworks like Vue and React.

#### Architecture Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     FormFiller Module                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Framework   │  │ Native      │  │ Framework-Specific      │  │
│  │ Detection   │──▶ Value       │──▶ Value Setters           │  │
│  │             │  │ Setter      │  │ (Vue/React handlers)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 Event Dispatch System                     │   │
│  │  InputEvent → ChangeEvent → BlurEvent                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Framework Detection Priority

The script detects the current framework using the following priority:

1. **Vue 2 Detection** - Checks for `__vue__` property on elements
2. **Vue 3 Detection** - Checks for `__vueApp__` property and `data-v-` attributes
3. **React Detection** - Checks for `_reactRootContainer` and `_reactInternals`
4. **Global Vue Object** - Checks for `window.Vue` presence
5. **Global React Object** - Checks for `window.React` presence
6. **HTML Attributes** - Looks for framework-specific attributes

```javascript
// Detection logic
const frameworks = {
    vue: false,
    vueVersion: null,
    react: false
};

// Check Vue instance on element
if (el.__vue__ || el._vnode || el.__vueApp__) {
    frameworks.vue = true;
}

// Check React internals
if (el._reactRootContainer || el._reactInternals) {
    frameworks.react = true;
}
```

### Framework-Specific Adapters

#### Vue Adapter

**Vue 2 Adapter:**

```javascript
setVueValue(element, value) {
    // Use native setter first
    this.setNativeValue(element, value);

    // Vue 2 special handling
    if (frameworks.vueVersion?.startsWith('2')) {
        const vueInstance = element.__vue__;
        if (vueInstance && vueInstance.$set) {
            const propName = element.name || element.id;
            if (propName && vueInstance.$data) {
                vueInstance.$set(vueInstance.$data, propName, value);
            }
        }
    }
}
```

**Vue 3 Adapter:**

Vue 3 uses Proxy-based reactivity, so the native setter approach triggers the reactive system automatically:

```javascript
// Vue 3 uses Proxy, native setter should trigger update
// No special handling needed beyond setNativeValue
```

#### React Adapter

React uses synthetic events, requiring proper event dispatching:

```javascript
setReactValue(element, value) {
    // Set the value using native setter
    this.setNativeValue(element, value);

    // React 16+ special handling
    const tracker = element._valueTracker || element._dispatchListeners;
    if (tracker) {
        // Trigger React's onChange
        const changeEvent = new Event('change', { bubbles: true });
        element.dispatchEvent(changeEvent);
    }
}
```

#### Native HTML Adapter

For plain HTML forms without frameworks:

```javascript
setNativeValue(element, value) {
    // Get correct prototype
    let prototype;
    if (element.tagName === 'TEXTAREA') {
        prototype = window.HTMLTextAreaElement.prototype;
    } else if (element.tagName === 'SELECT') {
        prototype = window.HTMLSelectElement.prototype;
    } else {
        prototype = window.HTMLInputElement.prototype;
    }

    // Get native value setter
    const nativeDescriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    if (nativeDescriptor && nativeDescriptor.set) {
        nativeDescriptor.set.call(element, value);
    }

    // Dispatch events
    element.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: value
    }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
}
```

### Usage Guide

#### Basic Usage (Auto-Detection)

The script automatically detects the framework and applies the appropriate filling strategy:

```javascript
// When filling a form, the smartSetValue method handles everything
FormFiller.smartSetValue(inputElement, value);
```

#### Manual Framework Override

If you need to override the auto-detection:

```javascript
// Force specific framework handling
FormFiller.setVueValue(inputElement, value);  // Force Vue handling
FormFiller.setReactValue(inputElement, value); // Force React handling
FormFiller.setNativeValue(inputElement, value); // Force native handling
```

#### Supported Input Types

| Type | Support | Notes |
|------|---------|-------|
| `text` | Full | All frameworks |
| `email` | Full | All frameworks |
| `password` | Full | All frameworks (data extracted securely) |
| `number` | Full | All frameworks |
| `tel` | Full | All frameworks |
| `url` | Full | All frameworks |
| `textarea` | Full | All frameworks |
| `select` (single) | Full | All frameworks |
| `select` (multiple) | Full | Array values supported |
| `checkbox` | Partial | Boolean values |
| `radio` | Partial | Select by value |
| `date` | Full | ISO format values |
| `datetime-local` | Full | ISO format values |

### Custom Adapter Development

To create a custom adapter for a specific framework or use case:

#### Step 1: Define the Adapter

```javascript
const CustomAdapter = {
    name: 'custom-framework',

    detect() {
        // Return true if this framework is detected
        return document.querySelector('[data-custom-framework]') !== null;
    },

    setValue(element, value) {
        // Custom value setting logic
        element.value = value;

        // Dispatch framework-specific events
        element.dispatchEvent(new CustomEvent('framework:change', {
            bubbles: true,
            detail: { value }
        }));
    },

    fillForm(formElement, data) {
        // Custom form filling logic
        const inputs = formElement.querySelectorAll('input');
        inputs.forEach(input => {
            const fieldName = input.name || input.id;
            if (data[fieldName]) {
                this.setValue(input, data[fieldName]);
            }
        });
    }
};
```

#### Step 2: Register the Adapter

```javascript
// Add to FormFiller module
FormFiller.customAdapters = {
    'custom-framework': CustomAdapter
};

// Extend detection
FormFiller.detectFramework = function() {
    const frameworks = this._detectFramework();

    // Check custom adapters
    for (const [name, adapter] of Object.entries(this.customAdapters)) {
        if (adapter.detect()) {
            frameworks.custom = name;
            break;
        }
    }

    return frameworks;
};
```

#### Step 3: Use the Adapter

```javascript
// The adapter will be used automatically after registration
FormFiller.smartSetValue(element, value);
```

### Detection Priority Explanation

The detection follows a specific priority to ensure the correct adapter is used:

1. **Element Instance Check** - Most reliable, checks actual framework instances
2. **Global Object Check** - Less reliable, framework may be loaded but not used on page
3. **Attribute Check** - Fallback detection method

**Why this priority?**

- Vue and React can coexist on the same page
- Element-level detection is more accurate than global checks
- Some pages may load framework libraries but not use them

### Best Practices

1. **Let Auto-Detection Work** - The built-in detection is reliable for most cases
2. **Test on Multiple Frameworks** - Verify your custom adapters work across Vue 2, Vue 3, and React
3. **Dispatch All Events** - Ensure `input`, `change`, and `blur` events are dispatched
4. **Use Native Setter** - Always use prototype setter for reactive compatibility
5. **Handle Edge Cases** - Consider disabled inputs, readonly fields, and validation states

---

<a name="chinese"></a>
## 中文

### 适配器架构概述

AI-Form客户端脚本包含智能框架检测和表单填充系统，可自动适配不同的JavaScript框架。这确保了在填充表单字段时能够正确进行数据绑定，保持与Vue、React等响应式框架的兼容性。

#### 架构组件

```
┌─────────────────────────────────────────────────────────────────┐
│                     FormFiller 模块                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ 框架检测    │  │ 原生值      │  │ 框架专用值设置器        │  │
│  │             │──▶ 设置器      │──▶ (Vue/React处理器)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 事件分发系统                              │   │
│  │  InputEvent → ChangeEvent → BlurEvent                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 检测优先级说明

脚本使用以下优先级检测当前框架：

1. **Vue 2 检测** - 检查元素上的 `__vue__` 属性
2. **Vue 3 检测** - 检查 `__vueApp__` 属性和 `data-v-` 属性
3. **React 检测** - 检查 `_reactRootContainer` 和 `_reactInternals`
4. **全局Vue对象** - 检查 `window.Vue` 是否存在
5. **全局React对象** - 检查 `window.React` 是否存在
6. **HTML属性** - 查找框架特定属性

```javascript
// 检测逻辑
const frameworks = {
    vue: false,
    vueVersion: null,
    react: false
};

// 检查元素上的Vue实例
if (el.__vue__ || el._vnode || el.__vueApp__) {
    frameworks.vue = true;
}

// 检查React内部属性
if (el._reactRootContainer || el._reactInternals) {
    frameworks.react = true;
}
```

### 各框架适配器使用指南

#### Vue 适配器

**Vue 2 适配器：**

```javascript
setVueValue(element, value) {
    // 首先使用原生设置器
    this.setNativeValue(element, value);

    // Vue 2 特殊处理
    if (frameworks.vueVersion?.startsWith('2')) {
        const vueInstance = element.__vue__;
        if (vueInstance && vueInstance.$set) {
            const propName = element.name || element.id;
            if (propName && vueInstance.$data) {
                vueInstance.$set(vueInstance.$data, propName, value);
            }
        }
    }
}
```

**Vue 3 适配器：**

Vue 3使用Proxy响应式系统，原生设置器方法会自动触发响应式更新：

```javascript
// Vue 3使用Proxy，原生设置器会触发更新
// 除了setNativeValue外无需特殊处理
```

#### React 适配器

React使用合成事件系统，需要正确的事件分发：

```javascript
setReactValue(element, value) {
    // 使用原生设置器设置值
    this.setNativeValue(element, value);

    // React 16+ 特殊处理
    const tracker = element._valueTracker || element._dispatchListeners;
    if (tracker) {
        // 触发React的onChange
        const changeEvent = new Event('change', { bubbles: true });
        element.dispatchEvent(changeEvent);
    }
}
```

#### 原生 HTML 适配器

对于没有使用框架的普通HTML表单：

```javascript
setNativeValue(element, value) {
    // 获取正确的原型
    let prototype;
    if (element.tagName === 'TEXTAREA') {
        prototype = window.HTMLTextAreaElement.prototype;
    } else if (element.tagName === 'SELECT') {
        prototype = window.HTMLSelectElement.prototype;
    } else {
        prototype = window.HTMLInputElement.prototype;
    }

    // 获取原生值设置器
    const nativeDescriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    if (nativeDescriptor && nativeDescriptor.set) {
        nativeDescriptor.set.call(element, value);
    }

    // 分发事件
    element.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: value
    }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
}
```

### 使用指南

#### 基本使用（自动检测）

脚本自动检测框架并应用适当的填充策略：

```javascript
// 填充表单时，smartSetValue方法处理一切
FormFiller.smartSetValue(inputElement, value);
```

#### 手动框架覆盖

如果需要覆盖自动检测：

```javascript
// 强制使用特定框架处理
FormFiller.setVueValue(inputElement, value);  // 强制Vue处理
FormFiller.setReactValue(inputElement, value); // 强制React处理
FormFiller.setNativeValue(inputElement, value); // 强制原生处理
```

#### 支持的输入类型

| 类型 | 支持程度 | 说明 |
|------|----------|------|
| `text` | 完全 | 所有框架 |
| `email` | 完全 | 所有框架 |
| `password` | 完全 | 所有框架（安全提取数据） |
| `number` | 完全 | 所有框架 |
| `tel` | 完全 | 所有框架 |
| `url` | 完全 | 所有框架 |
| `textarea` | 完全 | 所有框架 |
| `select`（单选） | 完全 | 所有框架 |
| `select`（多选） | 完全 | 支持数组值 |
| `checkbox` | 部分 | 布尔值 |
| `radio` | 部分 | 按值选择 |
| `date` | 完全 | ISO格式值 |
| `datetime-local` | 完全 | ISO格式值 |

### 自定义适配器开发

为特定框架或用例创建自定义适配器：

#### 步骤1：定义适配器

```javascript
const CustomAdapter = {
    name: 'custom-framework',

    detect() {
        // 如果检测到该框架则返回true
        return document.querySelector('[data-custom-framework]') !== null;
    },

    setValue(element, value) {
        // 自定义值设置逻辑
        element.value = value;

        // 分发框架特定事件
        element.dispatchEvent(new CustomEvent('framework:change', {
            bubbles: true,
            detail: { value }
        }));
    },

    fillForm(formElement, data) {
        // 自定义表单填充逻辑
        const inputs = formElement.querySelectorAll('input');
        inputs.forEach(input => {
            const fieldName = input.name || input.id;
            if (data[fieldName]) {
                this.setValue(input, data[fieldName]);
            }
        });
    }
};
```

#### 步骤2：注册适配器

```javascript
// 添加到FormFiller模块
FormFiller.customAdapters = {
    'custom-framework': CustomAdapter
};

// 扩展检测
FormFiller.detectFramework = function() {
    const frameworks = this._detectFramework();

    // 检查自定义适配器
    for (const [name, adapter] of Object.entries(this.customAdapters)) {
        if (adapter.detect()) {
            frameworks.custom = name;
            break;
        }
    }

    return frameworks;
};
```

#### 步骤3：使用适配器

```javascript
// 注册后适配器会自动使用
FormFiller.smartSetValue(element, value);
```

### 检测优先级详细说明

检测遵循特定优先级以确保使用正确的适配器：

1. **元素实例检查** - 最可靠，检查实际框架实例
2. **全局对象检查** - 较不可靠，框架可能已加载但未在页面使用
3. **属性检查** - 回退检测方法

**为什么使用此优先级？**

- Vue和React可以在同一页面共存
- 元素级检测比全局检查更准确
- 某些页面可能加载框架库但不使用它们

### 最佳实践

1. **让自动检测工作** - 内置检测对大多数情况可靠
2. **跨框架测试** - 验证自定义适配器在Vue 2、Vue 3和React上都能工作
3. **分发所有事件** - 确保`input`、`change`和`blur`事件都被分发
4. **使用原生设置器** - 始终使用原型设置器以保持响应式兼容性
5. **处理边界情况** - 考虑禁用输入、只读字段和验证状态

---

## Common Issues / 常见问题

### Vue 2/3 Detection Not Working

**Symptom:** Form values are set but Vue component state doesn't update.

**Solution:**
```javascript
// Check if Vue instance is accessible
console.log(element.__vue__); // Vue 2
console.log(element.__vueApp__); // Vue 3

// If not accessible, ensure the element is within Vue's scope
```

### React onChange Not Triggering

**Symptom:** Value appears in input but React state remains unchanged.

**Solution:**
```javascript
// Ensure proper event dispatching
element.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    inputType: 'insertText'
}));
```

### Framework Coexistence

**Symptom:** Page has both Vue and React components.

**Solution:** The detection system handles this by checking element-level properties. Each element is processed with its detected framework.