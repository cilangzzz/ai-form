/**
 * Form Data Extractor - 表单数据提取
 * 从表单元素提取元数据，不发送完整 HTML
 */

export class FormDataExtractor {
    /**
     * 从表单元素提取元数据（安全处理）
     * @param {HTMLElement} formElement - 表单元素
     * @returns {Object|null} - 表单元数据
     */
    extractFieldMetadata(formElement) {
        if (!formElement) return null;

        const inputs = formElement.querySelectorAll('input, textarea, select');
        const metadata = {
            fields: [],
            formId: formElement.id || null,
            formName: formElement.name || null,
            formAction: formElement.action || null,
            formMethod: formElement.method || null
        };

        inputs.forEach(input => {
            const fieldInfo = this.sanitizeFieldInfo(input);
            if (fieldInfo) {
                metadata.fields.push(fieldInfo);
            }
        });

        return metadata;
    }

    /**
     * 清理并提取单个字段信息
     * @param {HTMLElement} input - 输入元素
     * @returns {Object|null} - 字段信息
     */
    sanitizeFieldInfo(input) {
        // 不提取敏感字段
        const sensitiveTypes = ['password', 'hidden'];
        if (sensitiveTypes.includes(input.type)) {
            return null;
        }

        // 不提取敏感名称的字段
        const sensitiveNames = ['password', 'pwd', 'pass', 'secret', 'token', 'api_key', 'apikey', 'credit', 'card', 'cvv', 'ssn'];
        const fieldName = (input.name || input.id || '').toLowerCase();
        if (sensitiveNames.some(sensitive => fieldName.includes(sensitive))) {
            return null;
        }

        return {
            type: input.type || input.tagName.toLowerCase(),
            name: input.name || null,
            id: input.id || null,
            placeholder: input.placeholder || null,
            label: this.findLabel(input),
            required: input.required || false,
            options: input.tagName === 'SELECT' ? this.extractSelectOptions(input) : null
        };
    }

    /**
     * 查找关联的 label
     * @param {HTMLElement} input - 输入元素
     * @returns {string|null} - label 文本
     */
    findLabel(input) {
        // 通过 for 属性查找
        if (input.id) {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label) return label.textContent.trim();
        }

        // 查找父级 label
        const parentLabel = input.closest('label');
        if (parentLabel) return parentLabel.textContent.trim();

        // 查找相邻的 label 或文本
        const prevSibling = input.previousElementSibling;
        if (prevSibling && (prevSibling.tagName === 'LABEL' || prevSibling.tagName === 'SPAN')) {
            return prevSibling.textContent.trim();
        }

        return null;
    }

    /**
     * 提取 select 的选项
     * @param {HTMLElement} select - select 元素
     * @returns {Array<Object>|null} - 选项数组
     */
    extractSelectOptions(select) {
        const options = [];
        select.querySelectorAll('option').forEach(option => {
            if (option.value) {
                options.push({
                    value: option.value,
                    text: option.textContent.trim()
                });
            }
        });
        return options.length > 0 ? options : null;
    }

    /**
     * 序列化元数据为 FormData
     * @param {Object} metadata - 表单元数据
     * @param {string} chatContext - 聊天上下文
     * @returns {FormData} - FormData 对象
     */
    toFormData(metadata, chatContext = '') {
        const formData = new FormData();
        formData.append('formMetadata', JSON.stringify(metadata));
        formData.append('chatContext', chatContext || '');
        return formData;
    }

    /**
     * 从单个元素提取字段信息（用于非表单元素）
     * @param {HTMLElement} element - 单个元素
     * @returns {Object|null}
     */
    extractSingleField(element) {
        if (!element) return null;

        const tagName = element.tagName.toLowerCase();
        if (!['input', 'textarea', 'select'].includes(tagName)) {
            return null;
        }

        return this.sanitizeFieldInfo(element);
    }
}

/**
 * 创建默认的表单数据提取器实例
 * @returns {FormDataExtractor}
 */
export function createFormDataExtractor() {
    return new FormDataExtractor();
}

export default FormDataExtractor;