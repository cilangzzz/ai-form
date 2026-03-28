/**
 * Form Filler - 表单填充协调器
 * 协调各个适配器完成表单填充任务
 */

import { BaseAdapter } from './adapters/BaseAdapter.js';
import AdapterRegistry from './adapters/AdapterRegistry.js';
import { VanillaAdapter } from './adapters/VanillaAdapter.js';
import { VueAdapter } from './adapters/VueAdapter.js';
import { ReactAdapter } from './adapters/ReactAdapter.js';

export class FormFiller {
    constructor(config = {}) {
        this.config = {
            parentSearchDepth: config.parentSearchDepth || 4,
            ...config
        };

        // 使用全局单例适配器注册中心
        this.registry = AdapterRegistry;

        // 注册默认适配器（如果尚未注册）
        if (this.registry.getCount() === 0) {
            this.registry.register(new VanillaAdapter());
            this.registry.register(new VueAdapter());
            this.registry.register(new ReactAdapter());
        }
    }

    /**
     * 查找父表单
     * @param {HTMLElement} element - 起始元素
     * @returns {HTMLElement|null} - 父表单元素
     */
    findParentForm(element) {
        let current = element;
        let steps = 0;

        while (current && steps < this.config.parentSearchDepth) {
            current = current.parentElement;
            if (!current) break;
            if (current.tagName.toLowerCase() === 'form') {
                return current;
            }
            steps++;
        }

        return current;
    }

    /**
     * 查找表单输入元素
     * @param {HTMLElement} container - 容器元素
     * @returns {Array<HTMLElement>}
     */
    findFormInputs(container) {
        const activeElement = container || document.activeElement;
        if (!activeElement) return [];

        // 如果是表单，查找其内部所有输入元素
        if (activeElement.tagName.toLowerCase() === 'form') {
            return Array.from(activeElement.querySelectorAll('input, textarea, select'));
        }

        // 否则查找父容器中的输入元素
        const parentForm = this.findParentForm(activeElement);
        if (parentForm) {
            return Array.from(parentForm.querySelectorAll('input, textarea, select'));
        }

        // 最后尝试查找最近的容器内的输入元素
        return Array.from(activeElement.querySelectorAll('input, textarea, select'));
    }

    /**
     * 填充表单字段
     * @param {Object} suggestion - 建议数据
     * @param {HTMLElement} container - 容器元素（可选）
     * @returns {Object} - 填充结果统计
     */
    fillFormFields(suggestion, container = null) {
        const inputs = this.findFormInputs(container);

        if (inputs.length === 0) {
            console.log('No input fields found to fill');
            return { filled: 0, skipped: 0, total: 0 };
        }

        // 获取最佳适配器
        const adapter = this.registry.getBestAdapter();

        console.log('Using adapter:', adapter.name);

        // 将建议转换为字段映射
        const fieldsMap = this.suggestionToFieldsMap(suggestion);

        // 使用适配器填充表单
        const result = adapter.fillForm(inputs, fieldsMap);

        return result;
    }

    /**
     * 将建议转换为字段映射（不区分大小写）
     * @param {Object} suggestion - 建议对象
     * @returns {Map<string, string>}
     */
    suggestionToFieldsMap(suggestion) {
        const fieldsMap = new Map();

        if (!suggestion || typeof suggestion !== 'object') {
            return fieldsMap;
        }

        for (const [key, value] of Object.entries(suggestion)) {
            if (value) {
                // 存储小写键名以便匹配
                fieldsMap.set(key.toLowerCase(), value);
            }
        }

        return fieldsMap;
    }

    /**
     * 查找字段名称的最佳匹配
     * @param {HTMLElement} input - 输入元素
     * @param {Map<string, string>} fieldsMap - 字段映射
     * @returns {string|null} - 匹配的值
     */
    findMatchingValue(input, fieldsMap) {
        const fieldName = (input.name || input.id || input.placeholder || '').toLowerCase();
        if (!fieldName) return null;

        return fieldsMap.get(fieldName);
    }

    /**
     * 注册自定义适配器
     * @param {BaseAdapter} adapter - 适配器实例
     */
    registerAdapter(adapter) {
        this.registry.register(adapter);
    }

    /**
     * 更新配置
     * @param {Object} newConfig - 新配置项
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
}

/**
 * 创建默认的表单填充器实例
 * @param {Object} config - 配置项
 * @returns {FormFiller}
 */
export function createFormFiller(config) {
    return new FormFiller(config);
}

export default FormFiller;