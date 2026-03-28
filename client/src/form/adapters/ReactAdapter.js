/**
 * React Adapter - React 框架适配器
 * 用于 React 应用中的表单填充
 * 支持 React 16+ 的合成事件系统和值追踪器
 */

import { BaseAdapter } from './BaseAdapter.js';

export class ReactAdapter extends BaseAdapter {
    /**
     * 适配器名称
     * @returns {string}
     */
    get name() {
        return 'React';
    }

    /**
     * 适配器优先级（低于 Vue，高于原生）
     * @returns {number}
     */
    get priority() {
        return 35;
    }

    /**
     * React 检测结果
     * @type {Object|null}
     */
    reactInfo = null;

    /**
     * React 版本
     * @type {string|null}
     */
    reactVersion = null;

    /**
     * 检测当前环境是否适用此适配器
     * @param {HTMLElement} element - 要检测的元素（可选）
     * @returns {boolean}
     */
    detect(element) {
        this.reactInfo = this.detectReact();
        return this.reactInfo.detected;
    }

    /**
     * 检测 React 环境
     * @returns {Object}
     */
    detectReact() {
        const info = {
            detected: false,
            version: null,
            hasReactRoot: false,
            hasFiber: false
        };

        // 检测全局 React 对象
        if (window.React) {
            info.detected = true;
            info.version = window.React.version || 'unknown';
            this.reactVersion = info.version;
        }

        // 检测 ReactDOM
        if (window.ReactDOM) {
            info.detected = true;
            info.version = info.version || '16+';
        }

        // 检测 React 特征属性 (React 16-17)
        if (document.querySelector('[data-reactroot]')) {
            info.detected = true;
            info.hasReactRoot = true;
            info.version = info.version || '16-17';
        }

        // 检测 React 18+ 的 createRoot 模式
        const rootContainer = document.getElementById('root');
        if (rootContainer && this.hasReactInternals(rootContainer)) {
            info.detected = true;
            info.hasFiber = true;
            info.version = info.version || '18+';
        }

        // 检测元素上的 React 实例
        if (!info.detected) {
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
                if (this.hasReactInternals(el)) {
                    info.detected = true;
                    info.hasFiber = true;
                    break;
                }
            }
        }

        this.reactVersion = info.version;
        return info;
    }

    /**
     * 检查元素是否有 React 内部属性
     * @param {HTMLElement} element - 元素
     * @returns {boolean}
     */
    hasReactInternals(element) {
        // React 16+ fiber keys
        const fiberKeys = [
            '_reactRootContainer',
            '_reactInternals',
            '__reactInternalInstance$',
            '__reactFiber$',
            '__reactProps$',
            '__reactEventHandlers$'
        ];

        for (const key of fiberKeys) {
            // 检查带版本号的 key (如 __reactFiber$xxxxx)
            const versionedKey = Object.keys(element).find(
                k => k.startsWith(key.replace('$', '$')) || k === key
            );
            if (versionedKey && element[versionedKey]) {
                return true;
            }
        }

        return false;
    }

    /**
     * 匹配元素到此适配器
     * @param {HTMLElement} element - 目标元素
     * @returns {boolean} 是否匹配
     */
    match(element) {
        if (!this.reactInfo) {
            this.detect(element);
        }

        if (!this.reactInfo?.detected) return false;

        // 检查元素是否在 React 应用中
        return this.isReactElement(element);
    }

    /**
     * 检查元素是否属于 React 应用
     * @param {HTMLElement} element - 元素
     * @returns {boolean}
     */
    isReactElement(element) {
        // 直接检查元素的 React 属性
        if (this.hasReactInternals(element)) {
            return true;
        }

        // 向上遍历查找 React root
        let current = element;
        const maxDepth = 15;

        for (let i = 0; i < maxDepth && current; i++) {
            if (this.hasReactInternals(current)) {
                return true;
            }

            // 检查 React root marker
            if (current.hasAttribute('data-reactroot')) {
                return true;
            }

            current = current.parentElement;
        }

        return false;
    }

    /**
     * 设置元素值（React 特殊处理）
     * 使用 InputEvent 触发合成事件，正确设置 tracked 值
     * @param {HTMLElement} element - 输入元素
     * @param {string} value - 要设置的值
     * @returns {boolean}
     */
    setValue(element, value) {
        try {
            // Step 1: 先清除现有的值追踪器
            // React 的值追踪器会阻止非用户输入的值变更
            this.clearValueTracker(element);

            // Step 2: 使用原生 setter 设置值
            this.setNativeValue(element, value);

            // Step 3: 更新 React 的值追踪器
            this.updateValueTracker(element, value);

            // Step 4: 触发 InputEvent（React 16+ 合成事件）
            this.triggerInputEvent(element, value);

            // Step 5: 触发 change 和 blur 事件
            this.triggerChangeEvent(element);
            this.triggerBlurEvent(element);

            return true;
        } catch (e) {
            console.error('ReactAdapter setValue error:', e);
            // 回退方案
            return this.setValueFallback(element, value);
        }
    }

    /**
     * 清除值追踪器
     * React 使用追踪器来区分用户输入和程序设置
     * @param {HTMLElement} element - 元素
     */
    clearValueTracker(element) {
        // 设置追踪器值为不同值，强制触发更新
        if (element._valueTracker) {
            element._valueTracker.setValue('');
        }

        // React 18+ fiber 节点的追踪器
        const trackerKey = Object.keys(element).find(
            k => k.startsWith('__reactValueTracker$')
        );
        if (trackerKey && element[trackerKey]) {
            element[trackerKey].setValue('');
        }
    }

    /**
     * 更新值追踪器
     * 确保 React 认为值已变更
     * @param {HTMLElement} element - 元素
     * @param {string} value - 新值
     */
    updateValueTracker(element, value) {
        // 设置追踪器的当前值
        if (element._valueTracker) {
            element._valueTracker.setValue(value);
        }

        // React 18+ 的追踪器
        const trackerKey = Object.keys(element).find(
            k => k.startsWith('__reactValueTracker$')
        );
        if (trackerKey && element[trackerKey]) {
            element[trackerKey].setValue(value);
        }
    }

    /**
     * 触发 InputEvent（React 合成事件）
     * React 对 InputEvent 有特殊处理
     * @param {HTMLElement} element - 元素
     * @param {string} value - 值
     */
    triggerInputEvent(element, value) {
        // 创建 InputEvent - React 会将其转换为合成事件
        const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: value
        });
        element.dispatchEvent(inputEvent);
    }

    /**
     * 触发 change 事件
     * @param {HTMLElement} element - 元素
     */
    triggerChangeEvent(element) {
        const changeEvent = new Event('change', { bubbles: true });
        element.dispatchEvent(changeEvent);
    }

    /**
     * 触发 blur 事件（触发验证）
     * @param {HTMLElement} element - 元素
     */
    triggerBlurEvent(element) {
        const blurEvent = new FocusEvent('blur', {
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(blurEvent);
    }

    /**
     * 回退方案：简单的值设置
     * @param {HTMLElement} element - 元素
     * @param {string} value - 值
     * @returns {boolean}
     */
    setValueFallback(element, value) {
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    }

    /**
     * 获取 React Fiber 节点
     * @param {HTMLElement} element - 元素
     * @returns {Object|null}
     */
    getReactFiber(element) {
        const fiberKeys = [
            '__reactInternalInstance$',
            '__reactFiber$',
            '_reactInternals'
        ];

        for (const baseKey of fiberKeys) {
            // 检查带版本号的 key
            const versionedKey = Object.keys(element).find(
                k => k.startsWith(baseKey.replace('$', '$')) || k === baseKey
            );
            if (versionedKey && element[versionedKey]) {
                return element[versionedKey];
            }
        }

        return null;
    }

    /**
     * 获取 React props
     * @param {HTMLElement} element - 元素
     * @returns {Object|null}
     */
    getReactProps(element) {
        const fiber = this.getReactFiber(element);
        if (fiber && fiber.pendingProps) {
            return fiber.pendingProps;
        }

        // 直接检查 props 属性
        const propsKey = Object.keys(element).find(
            k => k.startsWith('__reactProps$')
        );
        if (propsKey) {
            return element[propsKey];
        }

        return null;
    }

    /**
     * 填充表单（React 扩展处理）
     * @param {Array<HTMLElement>} inputs - 输入元素数组
     * @param {Map<string, string>} fieldsMap - 字段映射
     * @returns {Object}
     */
    fillForm(inputs, fieldsMap) {
        // React 通常需要特殊的事件触发顺序
        // 先收集所有要填充的值
        const fillPlan = [];

        for (const input of inputs) {
            const fieldName = (input.name || input.id || input.placeholder || '').toLowerCase();
            if (!fieldName) continue;

            const value = fieldsMap.get(fieldName);
            if (value) {
                fillPlan.push({ input, fieldName, value });
            }
        }

        // 执行填充
        const result = {
            filled: 0,
            skipped: inputs.length - fillPlan.length,
            total: inputs.length,
            details: []
        };

        for (const plan of fillPlan) {
            const success = this.setValue(plan.input, plan.value);

            if (success) {
                result.filled++;
                result.details.push({
                    field: plan.fieldName,
                    value: plan.value,
                    element: plan.input.tagName.toLowerCase()
                });
            } else {
                result.skipped++;
            }
        }

        return result;
    }

    /**
     * 获取适配器信息
     * @returns {Object}
     */
    getInfo() {
        return {
            name: this.name,
            priority: this.priority,
            reactVersion: this.reactVersion,
            reactInfo: this.reactInfo
        };
    }
}

export default ReactAdapter;