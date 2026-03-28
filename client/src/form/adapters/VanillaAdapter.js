/**
 * Vanilla Adapter - 原生 DOM 适配器
 * 用于普通网页的表单填充（最低优先级）
 */

import { BaseAdapter } from './BaseAdapter.js';

export class VanillaAdapter extends BaseAdapter {
    /**
     * 适配器名称
     * @returns {string}
     */
    get name() {
        return 'Vanilla';
    }

    /**
     * 适配器优先级（最低优先级，作为默认适配器）
     * @returns {number}
     */
    get priority() {
        return 0;
    }

    /**
     * 检测当前环境是否适用此适配器
     * Vanilla 适配器始终返回 true（作为默认适配器）
     * @param {HTMLElement} element - 要检测的元素（可选）
     * @returns {boolean}
     */
    detect(element) {
        // Vanilla 适配器作为默认适配器，始终可用
        return true;
    }

    /**
     * 设置元素值
     * @param {HTMLElement} element - 输入元素
     * @param {string} value - 要设置的值
     * @returns {boolean} - 是否成功设置
     */
    setValue(element, value) {
        try {
            // 使用原生 setter 设置值
            this.setNativeValue(element, value);

            // 触发事件
            this.triggerEvents(element, ['input', 'change', 'blur']);

            return true;
        } catch (e) {
            console.error('VanillaAdapter setValue error:', e);
            return false;
        }
    }

    /**
     * 处理 select 元素
     * @param {HTMLSelectElement} element - select 元素
     * @param {string} value - 要设置的值
     * @returns {boolean}
     */
    setSelectValue(element, value) {
        // 查找匹配的选项
        const options = element.querySelectorAll('option');
        for (const option of options) {
            if (option.value === value || option.textContent.trim() === value) {
                this.setNativeValue(element, option.value);
                this.triggerEvents(element, ['change', 'blur']);
                return true;
            }
        }

        // 未找到匹配选项
        console.warn(`No matching option found for value "${value}"`);
        return false;
    }

    /**
     * 处理 checkbox/radio 元素
     * @param {HTMLInputElement} element - checkbox/radio 元素
     * @param {string} value - 要设置的值
     * @returns {boolean}
     */
    setCheckboxValue(element, value) {
        const shouldCheck = ['true', '1', 'yes', 'on', 'checked'].includes(value.toLowerCase());
        element.checked = shouldCheck;
        this.triggerEvents(element, ['change', 'blur']);
        return true;
    }

    /**
     * 扩展 fillForm 方法以处理特殊类型
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

            let success = false;

            // 根据元素类型选择不同的设置方法
            if (input.tagName === 'SELECT') {
                success = this.setSelectValue(input, value);
            } else if (input.type === 'checkbox' || input.type === 'radio') {
                success = this.setCheckboxValue(input, value);
            } else {
                success = this.setValue(input, value);
            }

            if (success) {
                result.filled++;
                result.details.push({
                    field: fieldName,
                    value: value,
                    element: input.tagName.toLowerCase(),
                    type: input.type || 'text'
                });
            } else {
                result.skipped++;
            }
        }

        return result;
    }
}

export default VanillaAdapter;