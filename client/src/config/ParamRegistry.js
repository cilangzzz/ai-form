/**
 * ParamRegistry.js - 参数注册和验证模块
 * 采用 Skill 输入参数规范模式
 */

// 内置 Schema 定义（无需加载外部 YAML）
const PARAM_SCHEMA = {
    userInput: {
        type: 'string',
        required: true,
        maxLength: 10000,
        description: '用户输入的表单描述或需求'
    },
    chatContext: {
        type: 'string',
        required: false,
        default: '',
        maxLength: 50000,
        description: '对话上下文信息'
    },
    formMetadata: {
        type: 'object',
        required: false,
        description: '表单元数据结构',
        properties: {
            fields: { type: 'array' },
            formId: { type: 'string' },
            formName: { type: 'string' }
        }
    },
    generationOptions: {
        type: 'object',
        required: false,
        default: { count: 1, mode: 'standard', locale: 'zh-CN', validateRules: true },
        description: '数据生成选项',
        properties: {
            count: { type: 'integer', min: 1, max: 10, default: 1 },
            mode: { type: 'string', enum: ['quick', 'standard', 'detailed'], default: 'standard' },
            locale: { type: 'string', enum: ['zh-CN', 'en-US', 'ja-JP'], default: 'zh-CN' },
            validateRules: { type: 'boolean', default: true }
        }
    },
    aiOptions: {
        type: 'object',
        required: false,
        description: 'AI 服务选项',
        properties: {
            model: { type: 'string', default: 'qwen-turbo-latest' },
            temperature: { type: 'float', min: 0.0, max: 2.0, default: 0.7 },
            roleType: { type: 'string', enum: ['default_form', 'coder', 'md_generate', 'worker_logger', 'prompt_generation'], default: 'default_form' }
        }
    }
};

/**
 * 参数验证注册表
 */
export class ParamRegistry {
    static schema = PARAM_SCHEMA;

    /**
     * 验证单个参数
     * @param {string} paramName - 参数名称
     * @param {*} value - 参数值
     * @returns {{valid: boolean, error?: string}}
     */
    static validate(paramName, value) {
        const fieldSchema = this.schema[paramName];
        if (!fieldSchema) {
            return { valid: true }; // 未知参数，跳过验证
        }

        // 检查必填
        if (fieldSchema.required && (value === undefined || value === null || value === '')) {
            return { valid: false, error: `Required field '${paramName}' is missing` };
        }

        // 如果值未提供且非必填，则有效
        if (value === undefined || value === null) {
            return { valid: true };
        }

        // 类型检查
        const typeError = this._checkType(paramName, value, fieldSchema.type);
        if (typeError) {
            return { valid: false, error: typeError };
        }

        // 字符串长度检查
        if (fieldSchema.type === 'string' && typeof value === 'string') {
            if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
                return { valid: false, error: `Field '${paramName}' exceeds max length of ${fieldSchema.maxLength}` };
            }
            if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
                return { valid: false, error: `Field '${paramName}' value '${value}' not in allowed values: ${fieldSchema.enum}` };
            }
        }

        // 整数范围检查
        if (fieldSchema.type === 'integer' && typeof value === 'number') {
            if (fieldSchema.min !== undefined && value < fieldSchema.min) {
                return { valid: false, error: `Field '${paramName}' value ${value} is below minimum ${fieldSchema.min}` };
            }
            if (fieldSchema.max !== undefined && value > fieldSchema.max) {
                return { valid: false, error: `Field '${paramName}' value ${value} exceeds maximum ${fieldSchema.max}` };
            }
        }

        // 浮点数范围检查
        if (fieldSchema.type === 'float' && typeof value === 'number') {
            if (fieldSchema.min !== undefined && value < fieldSchema.min) {
                return { valid: false, error: `Field '${paramName}' value ${value} is below minimum ${fieldSchema.min}` };
            }
            if (fieldSchema.max !== undefined && value > fieldSchema.max) {
                return { valid: false, error: `Field '${paramName}' value ${value} exceeds maximum ${fieldSchema.max}` };
            }
        }

        // 嵌套对象验证
        if (fieldSchema.type === 'object' && typeof value === 'object' && fieldSchema.properties) {
            for (const [propName, propValue] of Object.entries(value)) {
                if (fieldSchema.properties[propName]) {
                    const propSchema = fieldSchema.properties[propName];
                    const propError = this._checkType(`${paramName}.${propName}`, propValue, propSchema.type);
                    if (propError) {
                        return { valid: false, error: propError };
                    }
                    // 检查枚举
                    if (propSchema.enum && !propSchema.enum.includes(propValue)) {
                        return { valid: false, error: `Field '${paramName}.${propName}' value '${propValue}' not in allowed values: ${propSchema.enum}` };
                    }
                    // 检查范围
                    if ((propSchema.type === 'integer' || propSchema.type === 'float') && typeof propValue === 'number') {
                        if (propSchema.min !== undefined && propValue < propSchema.min) {
                            return { valid: false, error: `Field '${paramName}.${propName}' value ${propValue} is below minimum ${propSchema.min}` };
                        }
                        if (propSchema.max !== undefined && propValue > propSchema.max) {
                            return { valid: false, error: `Field '${paramName}.${propName}' value ${propValue} exceeds maximum ${propSchema.max}` };
                        }
                    }
                }
            }
        }

        return { valid: true };
    }

    /**
     * 检查类型匹配
     * @private
     */
    static _checkType(fieldName, value, expectedType) {
        const typeMap = {
            'string': 'string',
            'integer': 'number',
            'float': 'number',
            'boolean': 'boolean',
            'array': Array.isArray,
            'object': 'object'
        };

        const check = typeMap[expectedType];
        if (!check) return null; // 未知类型，跳过

        if (typeof check === 'string') {
            if (typeof value !== check) {
                return `Field '${fieldName}' has invalid type. Expected ${expectedType}, got ${typeof value}`;
            }
        } else if (typeof check === 'function') {
            if (!check(value)) {
                return `Field '${fieldName}' has invalid type. Expected ${expectedType}`;
            }
        }

        // 整数额外检查
        if (expectedType === 'integer' && !Number.isInteger(value)) {
            return `Field '${fieldName}' must be an integer`;
        }

        return null;
    }

    /**
     * 验证所有参数
     * @param {Object} params - 参数对象
     * @returns {{valid: boolean, errors: string[], warnings: string[]}}
     */
    static validateAll(params) {
        const errors = [];
        const warnings = [];

        // 检查必填字段
        for (const [fieldName, fieldSchema] of Object.entries(this.schema)) {
            if (fieldSchema.required && (params[fieldName] === undefined || params[fieldName] === null || params[fieldName] === '')) {
                errors.push(`Required field '${fieldName}' is missing`);
            }
        }

        // 验证提供的字段
        for (const [fieldName, value] of Object.entries(params)) {
            if (!this.schema[fieldName]) {
                warnings.push(`Unknown field '${fieldName}' will be ignored`);
                continue;
            }
            const result = this.validate(fieldName, value);
            if (!result.valid) {
                errors.push(result.error);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 应用默认值
     * @param {Object} params - 参数对象
     * @returns {Object} 带默认值的参数对象
     */
    static applyDefaults(params) {
        const result = { ...params };

        // 应用顶层默认值
        for (const [fieldName, fieldSchema] of Object.entries(this.schema)) {
            if (result[fieldName] === undefined && fieldSchema.default !== undefined) {
                result[fieldName] = typeof fieldSchema.default === 'object'
                    ? { ...fieldSchema.default }
                    : fieldSchema.default;
            }

            // 应用嵌套对象默认值
            if (fieldSchema.type === 'object' && result[fieldName] !== undefined && fieldSchema.properties) {
                const obj = result[fieldName];
                for (const [propName, propSchema] of Object.entries(fieldSchema.properties)) {
                    if (obj[propName] === undefined && propSchema.default !== undefined) {
                        obj[propName] = propSchema.default;
                    }
                }
            }
        }

        return result;
    }

    /**
     * 获取枚举值列表
     * @param {string} fieldPath - 字段路径，如 'aiOptions.roleType'
     * @returns {string[]}
     */
    static getEnumValues(fieldPath) {
        const parts = fieldPath.split('.');

        if (parts.length === 1) {
            const fieldSchema = this.schema[parts[0]];
            return fieldSchema?.enum || [];
        }

        if (parts.length === 2) {
            const parentSchema = this.schema[parts[0]];
            if (parentSchema?.properties) {
                const propSchema = parentSchema.properties[parts[1]];
                return propSchema?.enum || [];
            }
        }

        return [];
    }

    /**
     * 获取字段信息
     * @param {string} fieldPath - 字段路径
     * @returns {Object}
     */
    static getFieldInfo(fieldPath) {
        const parts = fieldPath.split('.');

        if (parts.length === 1) {
            return this.schema[parts[0]] || {};
        }

        if (parts.length === 2) {
            const parentSchema = this.schema[parts[0]];
            if (parentSchema?.properties) {
                return parentSchema.properties[parts[1]] || {};
            }
        }

        return {};
    }

    /**
     * 获取所有可用角色类型
     * @returns {string[]}
     */
    static getAvailableRoleTypes() {
        return this.getEnumValues('aiOptions.roleType');
    }
}

export default ParamRegistry;