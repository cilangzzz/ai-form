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
                if (el.__vue__ || el._vnode || el.__vueApp__) {
                    info.detected = true;
                    info.hasVue2 = el.__vue__ || el._vnode;
                    info.hasVue3 = el.__vueApp__;
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
            // 先使用原生 setter 设置值
            this.setNativeValue(element, value);

            // 触发事件
            this.triggerEvents(element, ['input', 'change', 'blur']);

            // Vue 2 特殊处理
            if (this.vueInfo.hasVue2) {
                this.handleVue2(element, value);
            }

            // Vue 3 特殊处理
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
     * Vue 2 特殊处理
     * @param {HTMLElement} element - 元素
     * @param {string} value - 值
     */
    handleVue2(element, value) {
        const vueInstance = element.__vue__;
        if (vueInstance && vueInstance.$set) {
            const propName = element.name || element.id;
            if (propName && vueInstance.$data) {
                try {
                    vueInstance.$set(vueInstance.$data, propName, value);
                } catch (e) {
                    // Vue 2 的 $set 可能因属性不存在而失败
                    console.debug('Vue 2 $set failed:', e);
                }
            }
        }
    }

    /**
     * Vue 3 特殊处理
     * Vue 3 使用 Proxy，原生 setter 通常已经触发更新
     * @param {HTMLElement} element - 元素
     * @param {string} value - 值
     */
    handleVue3(element, value) {
        const app = element.__vueApp__;
        if (app) {
            // Vue 3 的响应式系统基于 Proxy
            // 原生 setter 应该已经触发更新
            // 这里可以添加额外的处理如果需要
        }
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