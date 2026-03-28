/**
 * RequestBuilder.js - 请求构建器
 * 集成 ParamRegistry 验证，构建标准化请求
 */

import ParamRegistry from '../config/ParamRegistry.js';

/**
 * 验证错误类
 */
export class ValidationError extends Error {
    constructor(errors) {
        super(`Validation failed: ${errors.join(', ')}`);
        this.name = 'ValidationError';
        this.errors = errors;
    }
}

/**
 * 请求构建器
 */
export class RequestBuilder {
    /**
     * @param {ParamRegistry} registry - 参数注册表实例
     */
    constructor(registry = ParamRegistry) {
        this.registry = registry;
    }

    /**
     * 构建请求数据（带验证和默认值）
     * @param {Object} params - 原始参数
     * @returns {FormData} 构建后的 FormData
     * @throws {ValidationError} 验证失败时抛出
     */
    buildFormData(params) {
        // 1. 验证参数
        const validation = this.registry.validateAll(params);
        if (!validation.valid) {
            throw new ValidationError(validation.errors);
        }

        // 2. 应用默认值
        const merged = this.registry.applyDefaults(params);

        // 3. 构建 FormData
        const formData = new FormData();

        // 必填字段
        formData.append('userInput', merged.userInput || '');

        // 可选字段
        if (merged.chatContext) {
            formData.append('chatContext', merged.chatContext);
        }

        // 对象字段转为 JSON 字符串
        if (merged.formMetadata) {
            formData.append('formMetadata', JSON.stringify(merged.formMetadata));
        }

        if (merged.generationOptions) {
            formData.append('generationOptions', JSON.stringify(merged.generationOptions));
        }

        if (merged.aiOptions) {
            formData.append('aiOptions', JSON.stringify(merged.aiOptions));
        }

        return formData;
    }

    /**
     * 构建 JSON 请求体（带验证和默认值）
     * @param {Object} params - 原始参数
     * @returns {Object} 构建后的 JSON 对象
     * @throws {ValidationError} 验证失败时抛出
     */
    buildJson(params) {
        // 1. 验证参数
        const validation = this.registry.validateAll(params);
        if (!validation.valid) {
            throw new ValidationError(validation.errors);
        }

        // 2. 应用默认值
        const merged = this.registry.applyDefaults(params);

        // 3. 返回 JSON 对象
        return merged;
    }

    /**
     * 仅验证参数（不构建请求）
     * @param {Object} params - 参数对象
     * @returns {{valid: boolean, errors: string[], warnings: string[]}}
     */
    validate(params) {
        return this.registry.validateAll(params);
    }

    /**
     * 获取角色类型列表
     * @returns {string[]}
     */
    getAvailableRoleTypes() {
        return this.registry.getAvailableRoleTypes();
    }
}

export default RequestBuilder;