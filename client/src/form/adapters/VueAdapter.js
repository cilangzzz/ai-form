/**
 * Vue Adapter - Vue 框架适配器
 * 用于 Vue 2/3 应用中的表单填充
 */

import { BaseAdapter } from './BaseAdapter.js';

export class VueAdapter extends BaseAdapter {
    /**
     * 适配器名称
     * @returns {string}
     */
    get name() {
        return 'Vue';
    }

    /**
     * 适配器优先级（高于 React，低于原生）
     * @returns {number}
     */
    get priority() {
        return 40;
    }

    /**
     * Vue 版本检测结果
     * @type {Object|null}
     */
    vueInfo = null;

    /**
     * 检测当前环境是否适用此适配器
     * @param {HTMLElement} element - 要检测的元素（可选）
     * @returns {boolean}
     */
    detect(element) {
        this.vueInfo = this.detectVueVersion();
        return this.vueInfo.detected;
    }

    /**
     * 检测 Vue 版本
     * @returns {Object}
     */
    detectVueVersion() {
        const info = {
            detected: false,
            version: null,
            hasVue2: false,
            hasVue3: false
        };

        // 检测全局 Vue 对象
        if (window.Vue) {
            info.detected = true;
            info.version = window.Vue.version || '2.x';
            info.hasVue2 = true;
        }

        // 检测 Vue 特征属性
        if (document.querySelector('[data-v-]') ||
            document.querySelector('[__vue__]') ||
            document.querySelector('[__vueApp__]')) {
            info.detected = true;
        }

        // 检测元素上的 Vue 实例
        if (!info.detected) {
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
                if (el.__vue__ || el._vnode || el.__vueApp__ || el.__vueParentComponent) {
                    info.detected = true;
                    info.hasVue2 = el.__vue__ || el._vnode;
                    info.hasVue3 = el.__vueApp__ || el.__vueParentComponent;
                    break;
                }
            }
        }

        return info;
    }

    /**
     * 设置元素值（Vue 特殊处理）
     * @param {HTMLElement} element - 输入元素
     * @param {string} value - 要设置的值
     * @returns {boolean}
     */
    setValue(element, value) {
        try {
            // Step 1: 使用原生 setter 设置 DOM 值
            this.setNativeValue(element, value);

            // Step 2: 触发标准 DOM 事件
            this.triggerEvents(element, ['input', 'change', 'blur']);

            // Step 3: Vue 框架特定处理
            if (this.vueInfo.hasVue2) {
                this.handleVue2(element, value);
            }

            if (this.vueInfo.hasVue3) {
                this.handleVue3(element, value);
            }

            return true;
        } catch (e) {
            console.error('VueAdapter setValue error:', e);
            return false;
        }
    }

    /**
     * Vue 2 特殊处理 - 改进版
     * 向上遍历查找 Vue 组件实例，并尝试多种方式触发响应式更新
     * @param {HTMLElement} element - 元素
     * @param {string} value - 值
     */
    handleVue2(element, value) {
        // 查找 Vue 2 组件实例
        const vueInstance = this.findVue2Instance(element);

        if (!vueInstance) {
            console.debug('Vue 2 instance not found for element');
            // 触发组件库事件作为 fallback
            this.triggerVueComponentEvent(element, value);
            return;
        }

        // 获取字段名称
        const fieldName = this.getFieldName(element);

        // 尝试多种方式更新 Vue 响应式数据
        this.updateVue2Data(vueInstance, fieldName, value, element);

        // 触发 Vue 组件的自定义事件（Element UI、Ant Design Vue 等）
        this.triggerVueComponentEvent(element, value);
    }

    /**
     * 向上查找 Vue 2 组件实例
     * @param {HTMLElement} element - 开始查找的元素
     * @returns {Object|null} - Vue 实例
     */
    findVue2Instance(element) {
        let current = element;
        const maxDepth = 15;

        for (let i = 0; i < maxDepth && current; i++) {
            // 检查 __vue__ 属性（Vue 2 组件实例）
            if (current.__vue__ && current.__vue__.$data) {
                return current.__vue__;
            }

            // 检查 Vue 组件自定义属性（Element UI 等）
            if (current.__vue__ && current.__vue__.$parent) {
                const parent = current.__vue__.$parent;
                if (parent && parent.$data) {
                    return parent;
                }
            }

            // 检查 _vnode 属性
            if (current._vnode && current._vnode.componentInstance) {
                const instance = current._vnode.componentInstance;
                if (instance.$data) {
                    return instance;
                }
            }

            current = current.parentElement;
        }

        // 最后尝试从全局 Vue 查找
        if (window.Vue) {
            const vueRoot = document.querySelector('[data-v-app], #app, .app');
            if (vueRoot && vueRoot.__vue__) {
                return vueRoot.__vue__;
            }
        }

        return null;
    }

    /**
     * 更新 Vue 2 响应式数据
     * @param {Object} vueInstance - Vue 实例
     * @param {string} fieldName - 字段名
     * @param {string} value - 值
     * @param {HTMLElement} element - 元素
     */
    updateVue2Data(vueInstance, fieldName, value, element) {
        if (!fieldName || !vueInstance) return;

        // 方案 1: 使用 $set（如果属性存在）
        if (vueInstance.$set && vueInstance.$data) {
            const dataKeys = Object.keys(vueInstance.$data);
            for (const key of dataKeys) {
                if (this.matchFieldName(key, fieldName)) {
                    try {
                        vueInstance.$set(vueInstance.$data, key, value);
                        console.debug(`Vue 2 $set succeeded: ${key} = ${value}`);
                        return;
                    } catch (e) {
                        console.debug('Vue 2 $set failed:', e);
                    }
                }

                // 支持嵌套对象（如 form: { username: '', email: '' }）
                const nestedData = vueInstance.$data[key];
                if (typeof nestedData === 'object' && nestedData !== null) {
                    for (const nestedKey of Object.keys(nestedData)) {
                        if (this.matchFieldName(nestedKey, fieldName)) {
                            try {
                                vueInstance.$set(nestedData, nestedKey, value);
                                console.debug(`Vue 2 nested $set succeeded: ${key}.${nestedKey} = ${value}`);
                                return;
                            } catch (e) {
                                console.debug('Vue 2 nested $set failed:', e);
                            }
                        }
                    }
                }
            }
        }

        // 方案 2: 直接修改响应式属性
        if (vueInstance[fieldName] !== undefined) {
            vueInstance[fieldName] = value;
            return;
        }

        // 方案 3: 尝试使用 v-model 绑定的属性名
        const modelProp = this.findVModelBinding(element, vueInstance);
        if (modelProp) {
            try {
                vueInstance.$set(vueInstance.$data, modelProp, value);
            } catch (e) {
                console.debug('Vue 2 v-model $set failed:', e);
            }
        }
    }

    /**
     * 查找 v-model 绑定的属性名
     * @param {HTMLElement} element - 元素
     * @param {Object} vueInstance - Vue 实例
     * @returns {string|null}
     */
    findVModelBinding(element, vueInstance) {
        // 检查元素的 Vue 组件实例
        const elVue = element.__vue__;
        if (elVue && elVue.$options) {
            // 从 props 中查找
            if (elVue.$options.props && elVue.$options.props.value) {
                return 'value';
            }
            // 从 model 选项查找
            if (elVue.$options.model) {
                return elVue.$options.model.prop || 'value';
            }
        }

        // 检查 _vnode 中的 directives
        if (element._vnode && element._vnode.data && element._vnode.data.directives) {
            const modelDirective = element._vnode.data.directives.find(d => d.name === 'model');
            if (modelDirective) {
                return modelDirective.expression;
            }
        }

        return null;
    }

    /**
     * 触发 Vue 组件的自定义事件（Element UI、Ant Design Vue 等）
     * @param {HTMLElement} element - 元素
     * @param {string} value - 值
     */
    triggerVueComponentEvent(element, value) {
        // Element UI input 组件
        if (element.classList.contains('el-input__inner')) {
            const wrapper = element.closest('.el-input');
            if (wrapper && wrapper.__vue__) {
                wrapper.__vue__.$emit('input', value);
            }
        }

        // Ant Design Vue input 组件
        if (element.classList.contains('ant-input')) {
            const wrapper = element.closest('.ant-input-affix-wrapper, .ant-input');
            if (wrapper && wrapper.__vue__) {
                wrapper.__vue__.$emit('change', { target: { value: value } });
                wrapper.__vue__.$emit('input', value);
            }
        }

        // Vuetify input 组件
        const vuetifyWrapper = element.closest('.v-input');
        if (vuetifyWrapper && vuetifyWrapper.__vue__) {
            vuetifyWrapper.__vue__.$emit('input', value);
            vuetifyWrapper.__vue__.$emit('change', value);
        }

        // iView/ViewUI input 组件
        if (element.closest('.ivu-input-wrapper')) {
            const wrapper = element.closest('.ivu-input-wrapper');
            if (wrapper && wrapper.__vue__) {
                wrapper.__vue__.$emit('on-change', value);
                wrapper.__vue__.$emit('input', value);
            }
        }
    }

    /**
     * Vue 3 特殊处理 - 改进版
     * @param {HTMLElement} element - 元素
     * @param {string} value - 值
     */
    handleVue3(element, value) {
        // 查找 Vue 3 组件实例
        const vue3Instance = this.findVue3Instance(element);

        if (!vue3Instance) {
            console.debug('Vue 3 instance not found, relying on Proxy trigger');
            return;
        }

        // 获取字段名称并更新响应式数据
        const fieldName = this.getFieldName(element);
        this.updateVue3Data(vue3Instance, fieldName, value, element);

        // 触发 Vue 3 组件更新
        this.triggerVue3Update(vue3Instance, element);
    }

    /**
     * 向上查找 Vue 3 组件实例
     * @param {HTMLElement} element - 开始查找的元素
     * @returns {Object|null}
     */
    findVue3Instance(element) {
        let current = element;
        const maxDepth = 15;

        for (let i = 0; i < maxDepth && current; i++) {
            // Vue 3 组件实例
            if (current.__vueParentComponent) {
                return current.__vueParentComponent;
            }

            // Vue 3 应用实例
            if (current.__vueApp__) {
                const app = current.__vueApp__;
                if (app._instance) {
                    return app._instance;
                }
            }

            // 检查内部属性（Vue 3 devtools 等）
            const internalKeys = Object.keys(current);
            for (const key of internalKeys) {
                if (key.startsWith('__vueInternal') || key.includes('component')) {
                    const instance = current[key];
                    if (instance && instance.proxy) {
                        return instance;
                    }
                }
            }

            current = current.parentElement;
        }

        return null;
    }

    /**
     * 更新 Vue 3 响应式数据
     * @param {Object} componentInstance - Vue 3 组件实例
     * @param {string} fieldName - 字段名
     * @param {string} value - 值
     * @param {HTMLElement} element - 元素
     */
    updateVue3Data(componentInstance, fieldName, value, element) {
        if (!componentInstance || !fieldName) return;

        // Vue 3 Proxy（Composition API）
        const proxy = componentInstance.proxy;
        if (proxy) {
            try {
                if (fieldName in proxy) {
                    proxy[fieldName] = value;
                    console.debug(`Vue 3 proxy update succeeded: ${fieldName} = ${value}`);
                    return;
                }

                // 尝试匹配 camelCase/kebab-case
                for (const key of Object.keys(proxy)) {
                    if (this.matchFieldName(key, fieldName)) {
                        proxy[key] = value;
                        console.debug(`Vue 3 proxy matched: ${key} = ${value}`);
                        return;
                    }
                }
            } catch (e) {
                console.debug('Vue 3 proxy update failed:', e);
            }
        }

        // Vue 3 Composition API: setupState
        if (componentInstance.setupState) {
            for (const [key, reactiveValue] of Object.entries(componentInstance.setupState)) {
                if (this.matchFieldName(key, fieldName)) {
                    componentInstance.setupState[key] = value;
                    console.debug(`Vue 3 setupState update: ${key} = ${value}`);
                    return;
                }

                // 支持嵌套对象
                if (typeof reactiveValue === 'object' && reactiveValue !== null) {
                    for (const nestedKey of Object.keys(reactiveValue)) {
                        if (this.matchFieldName(nestedKey, fieldName)) {
                            reactiveValue[nestedKey] = value;
                            console.debug(`Vue 3 nested setupState: ${key}.${nestedKey} = ${value}`);
                            return;
                        }
                    }
                }
            }
        }

        // Vue 3 Options API: data
        if (componentInstance.data) {
            for (const [key, reactiveValue] of Object.entries(componentInstance.data)) {
                if (this.matchFieldName(key, fieldName)) {
                    componentInstance.data[key] = value;
                    return;
                }
            }
        }

        // Vue 3 context
        if (componentInstance.ctx) {
            for (const [key, reactiveValue] of Object.entries(componentInstance.ctx)) {
                if (key !== 'attrs' && key !== 'slots' && key !== 'refs' &&
                    this.matchFieldName(key, fieldName)) {
                    componentInstance.ctx[key] = value;
                    return;
                }
            }
        }
    }

    /**
     * 触发 Vue 3 组件强制更新
     * @param {Object} componentInstance - Vue 3 组件实例
     * @param {HTMLElement} element - 元素
     */
    triggerVue3Update(componentInstance, element) {
        // 调用组件的更新函数
        if (componentInstance && componentInstance.update) {
            try {
                componentInstance.update();
            } catch (e) {
                console.debug('Vue 3 update trigger failed:', e);
            }
        }

        // 触发额外的 input 事件确保更新传播
        const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: element.value
        });
        element.dispatchEvent(inputEvent);
    }

    /**
     * 获取元素的字段名称
     * @param {HTMLElement} element - 元素
     * @returns {string|null}
     */
    getFieldName(element) {
        // 优先使用 name 属性
        if (element.name) return element.name.toLowerCase();

        // 其次使用 id 属性
        if (element.id) return element.id.toLowerCase();

        // 使用 placeholder 作为 fallback
        if (element.placeholder) return element.placeholder.toLowerCase();

        // 检查 aria-label
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel.toLowerCase();

        // 检查 v-model 相关属性
        const modelAttr = element.getAttribute('v-model') ||
                          element.getAttribute('data-v-model');
        if (modelAttr) return modelAttr.toLowerCase();

        return null;
    }

    /**
     * 字段名匹配（支持模糊匹配和嵌套属性）
     * @param {string} key - 数据中的键名
     * @param {string} targetFieldName - 目标字段名
     * @returns {boolean}
     */
    matchFieldName(key, targetFieldName) {
        const keyLower = key.toLowerCase();
        const targetLower = targetFieldName.toLowerCase();

        // 直接匹配
        if (keyLower === targetLower) return true;

        // 嵌套属性匹配（如 form.username 匹配 username）
        if (key.includes('.')) {
            const parts = key.split('.');
            const lastPart = parts[parts.length - 1].toLowerCase();
            if (lastPart === targetLower) return true;
        }

        // camelCase 和 kebab-case 转换匹配
        const camelToKebab = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        if (camelToKebab === targetLower) return true;

        const kebabToCamel = targetFieldName.replace(/-([a-z])/g, g => g[1].toUpperCase());
        if (keyLower === kebabToCamel.toLowerCase()) return true;

        // 包含匹配（宽松匹配）
        if (keyLower.includes(targetLower) || targetLower.includes(keyLower)) {
            return true;
        }

        return false;
    }

    /**
     * 填充表单（Vue 扩展处理）
     * @param {Array<HTMLElement>} inputs - 输入元素数组
     * @param {Map<string, string>} fieldsMap - 字段映射
     * @returns {Object}
     */
    fillForm(inputs, fieldsMap) {
        const result = {
            filled: 0,
            skipped: 0,
            total: inputs.length,
            details: []
        };

        for (const input of inputs) {
            const fieldName = (input.name || input.id || input.placeholder || '').toLowerCase();
            if (!fieldName) {
                result.skipped++;
                continue;
            }

            const value = fieldsMap.get(fieldName);
            if (!value) {
                result.skipped++;
                continue;
            }

            const success = this.setValue(input, value);

            if (success) {
                result.filled++;
                result.details.push({
                    field: fieldName,
                    value: value,
                    element: input.tagName.toLowerCase()
                });
            } else {
                result.skipped++;
            }
        }

        return result;
    }
}

export default VueAdapter;