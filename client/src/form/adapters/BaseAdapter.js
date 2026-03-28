/**
 * Base Adapter - 适配器基类
 * 所有框架适配器必须继承此基类
 */

export class BaseAdapter {
    /**
     * 适配器名称
     * @returns {string}
     */
    get name() {
        throw new Error('Adapter must implement name property');
    }

    /**
     * 适配器优先级（数值越高优先级越高）
     * @returns {number}
     */
    get priority() {
        throw new Error('Adapter must implement priority property');
    }

    /**
     * 检测当前环境是否适用此适配器
     * @param {HTMLElement} element - 要检测的元素（可选）
     * @returns {boolean}
     */
    detect(element) {
        throw new Error('Adapter must implement detect() method');
    }

    /**
     * 设置元素值
     * @param {HTMLElement} element - 输入元素
     * @param {string} value - 要设置的值
     * @returns {boolean} - 是否成功设置
     */
    setValue(element, value) {
        throw new Error('Adapter must implement setValue() method');
    }

    /**
     * 触发事件
     * @param {HTMLElement} element - 目标元素
     * @param {string|string[]} events - 要触发的事件列表
     */
    triggerEvents(element, events = ['input', 'change', 'blur']) {
        const eventList = Array.isArray(events) ? events : [events];

        for (const eventType of eventList) {
            let event;

            if (eventType === 'input') {
                event = new InputEvent('input', {
                    bubbles: true,
                    cancelable: true,
                    inputType: 'insertText',
                    data: element.value
                });
            } else {
                event = new Event(eventType, { bubbles: true });
            }

            element.dispatchEvent(event);
        }
    }

    /**
     * 填充表单（通用实现）
     * @param {Array<HTMLElement>} inputs - 输入元素数组
     * @param {Map<string, string>} fieldsMap - 字段映射（小写键名）
     * @returns {Object} - 填充结果统计
     */
    fillForm(inputs, fieldsMap) {
        const result = {
            filled: 0,
            skipped: 0,
            total: inputs.length,
            details: []
        };

        for (const input of inputs) {
            // 获取字段名称
            const fieldName = (input.name || input.id || input.placeholder || '').toLowerCase();
            if (!fieldName) {
                result.skipped++;
                continue;
            }

            // 查找匹配的值
            const value = fieldsMap.get(fieldName);
            if (!value) {
                result.skipped++;
                continue;
            }

            // 设置值
            const success = this.setValue(input, value);

            if (success) {
                result.filled++;
                result.details.push({
                    field: fieldName,
                    value: value,
                    element: input.tagName.toLowerCase()
                });
                console.log(`Filled field "${fieldName}" with value "${value}"`);
            } else {
                result.skipped++;
            }
        }

        return result;
    }

    /**
     * 获取原生 value setter
     * @param {HTMLElement} element - 元素
     * @returns {Function|null}
     */
    getNativeValueSetter(element) {
        let prototype;
        if (element.tagName === 'TEXTAREA') {
            prototype = window.HTMLTextAreaElement.prototype;
        } else if (element.tagName === 'SELECT') {
            prototype = window.HTMLSelectElement.prototype;
        } else {
            prototype = window.HTMLInputElement.prototype;
        }

        const nativeDescriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
        return nativeDescriptor?.set || null;
    }

    /**
     * 使用原生 setter 设置值
     * @param {HTMLElement} element - 元素
     * @param {string} value - 值
     */
    setNativeValue(element, value) {
        const nativeSetter = this.getNativeValueSetter(element);
        if (nativeSetter) {
            nativeSetter.call(element, value);
        } else {
            element.value = value;
        }
    }
}

export default BaseAdapter;