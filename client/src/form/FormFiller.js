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
            return this.findAllInputs(activeElement);
        }

        // 如果是输入元素本身，需要扩展查找范围
        if (this.isInputElement(activeElement)) {
            // 尝试查找父容器中的所有输入元素
            const parentContainer = this.findParentContainer(activeElement);
            if (parentContainer) {
                return this.findAllInputs(parentContainer);
            }
            // 如果找不到父容器，返回当前元素
            return [activeElement];
        }

        // Vue/UI 框架组件穿透查找：从 wrapper 穿透到内部 input
        const innerInput = this.findInnerInput(activeElement);
        if (innerInput) {
            // 找到内部 input 后，查找其父容器中的所有输入
            const parentContainer = this.findParentContainer(innerInput);
            if (parentContainer) {
                return this.findAllInputs(parentContainer);
            }
            return [innerInput];
        }

        // 否则查找父表单中的输入元素
        const parentForm = this.findParentForm(activeElement);
        if (parentForm) {
            return this.findAllInputs(parentForm);
        }

        // 最后尝试查找最近容器内的输入元素
        const nearestContainer = this.findParentContainer(activeElement);
        if (nearestContainer) {
            return this.findAllInputs(nearestContainer);
        }

        // 最终 fallback: 查找整个文档中的可见输入元素
        return this.findVisibleInputsInDocument();
    }

    /**
     * 检查元素是否为输入元素
     * @param {HTMLElement} element - 元素
     * @returns {boolean}
     */
    isInputElement(element) {
        const inputTags = ['input', 'textarea', 'select'];
        return inputTags.includes(element.tagName.toLowerCase());
    }

    /**
     * 从 Vue/UI 框架组件 wrapper 穿透查找内部 input
     * 支持 Element UI、Vuetify、Ant Design Vue 等常见框架
     * @param {HTMLElement} wrapper - wrapper 元素
     * @returns {HTMLElement|null}
     */
    findInnerInput(wrapper) {
        if (!wrapper || this.isInputElement(wrapper)) return null;

        // 直接查找内部 input/textarea/select
        const innerInput = wrapper.querySelector('input, textarea, select');
        if (innerInput) return innerInput;

        // Vue 组件常见类名穿透查找
        const vueComponentClasses = [
            '.el-input__inner',      // Element UI
            '.el-textarea__inner',   // Element UI textarea
            '.v-input__input',       // Vuetify
            '.v-text-field__input',  // Vuetify text field
            '.ant-input',            // Ant Design Vue
            '.a-input__inner',       // Ant Design Vue
            '[data-v-] input',       // Vue scoped style
            '.input__inner',         // Generic pattern
            '.form-control',         // Bootstrap/vue-bootstrap
        ];

        for (const selector of vueComponentClasses) {
            const found = wrapper.querySelector(selector);
            if (found && this.isInputElement(found)) {
                return found;
            }
        }

        return null;
    }

    /**
     * 查找父容器（扩展版，不限于 form）
     * @param {HTMLElement} element - 起始元素
     * @returns {HTMLElement|null}
     */
    findParentContainer(element) {
        let current = element;
        let steps = 0;

        while (current && steps < this.config.parentSearchDepth) {
            current = current.parentElement;
            if (!current) break;

            // 检查是否为表单
            if (current.tagName.toLowerCase() === 'form') {
                return current;
            }

            // 检查是否为 Vue 应用容器或表单容器
            const containerIndicators = [
                'form', 'el-form', 'v-form', 'ant-form', 'a-form',
                'form-container', 'input-group', 'form-group',
                'v-card', 'el-dialog', 'el-drawer', 'ant-modal'
            ];

            const classList = current.classList ? Array.from(current.classList) : [];
            const hasContainerClass = containerIndicators.some(indicator =>
                classList.some(cls => cls.includes(indicator))
            );

            if (hasContainerClass) {
                return current;
            }

            // 检查 Vue 应用根容器
            if (current.getAttribute('data-v-app') ||
                current.__vue_app__ ||
                current.__vue__ ||
                current.hasAttribute('data-v-')) {
                // 检查是否包含多个输入元素
                const inputs = this.findAllInputs(current);
                if (inputs.length > 1) {
                    return current;
                }
            }

            steps++;
        }

        // 如果遍历到 body/body 之前的容器，检查是否包含多个输入
        if (current && (current.tagName.toLowerCase() === 'body' || current.tagName.toLowerCase() === 'html')) {
            return null; // 不返回 body，让后续 fallback 处理
        }

        return current;
    }

    /**
     * 查找容器内的所有输入元素
     * @param {HTMLElement} container - 容器元素
     * @returns {Array<HTMLElement>}
     */
    findAllInputs(container) {
        if (!container) return [];

        const inputs = Array.from(container.querySelectorAll('input, textarea, select'));

        // 过滤掉隐藏和不可见的元素
        return inputs.filter(input => {
            const type = input.type?.toLowerCase();
            // 排除 hidden 类型
            if (type === 'hidden') return false;
            // 排除不可见元素（display:none 或 visibility:hidden）
            const style = window.getComputedStyle(input);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            return true;
        });
    }

    /**
     * 查找文档中的可见输入元素（fallback）
     * 优先查找当前焦点附近的输入
     * @returns {Array<HTMLElement>}
     */
    findVisibleInputsInDocument() {
        // 尝试查找 Vue 应用容器
        const vueAppContainer = this.findVueAppContainer();
        if (vueAppContainer) {
            const inputs = this.findAllInputs(vueAppContainer);
            if (inputs.length > 0) return inputs;
        }

        // 最终 fallback: 查找所有可见输入（限制数量避免性能问题）
        const allInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
        const visibleInputs = allInputs.filter(input => {
            const style = window.getComputedStyle(input);
            return style.display !== 'none' && style.visibility !== 'hidden';
        });

        // 限制返回数量，避免填充过多无关字段
        return visibleInputs.slice(0, 50);
    }

    /**
     * 查找 Vue 应用容器
     * @returns {HTMLElement|null}
     */
    findVueAppContainer() {
        // Vue 3 应用容器特征
        const vue3Selectors = ['#app', '[data-v-app]', '[data-v-]', '.vue-app'];
        for (const selector of vue3Selectors) {
            const container = document.querySelector(selector);
            if (container) return container;
        }

        // Vue 2 应用容器特征
        const elements = document.querySelectorAll('[__vue__], [__vueApp__]');
        if (elements.length > 0) return elements[0];

        // 检查元素属性
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
            if (el.__vue_app__ || el.__vue__) {
                return el;
            }
        }

        return null;
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