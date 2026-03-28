/**
 * API Client - API请求封装
 * 提供请求重试机制、超时处理和GM_xmlhttpRequest封装
 */

import RequestBuilder, { ValidationError } from './RequestBuilder.js';

export class ApiClient {
    constructor(config = {}) {
        this.requestBuilder = new RequestBuilder();
        this.config = {
            timeout: config.timeout || 30000,
            maxRetries: config.maxRetries || 3,
            retryDelay: config.retryDelay || 1000,
            getApiUrl: config.getApiUrl || (() => ''),
            apiKey: config.apiKey || 'mykey123',
            ...config
        };
        this.state = {
            isRequestPending: false,
            currentRetryCount: 0
        };
    }

    /**
     * 发送请求（带重试机制）
     * @param {FormData|Object} formData - 要发送的表单数据或JSON对象
     * @param {number} retryCount - 当前重试次数
     * @returns {Promise<Object>} - 返回响应数据
     */
    async request(formData, retryCount = 0) {
        if (this.state.isRequestPending) {
            console.log('Request already pending, skipping...');
            return null;
        }

        this.state.isRequestPending = true;
        const timeout = this.config.timeout;
        const maxRetries = this.config.maxRetries;

        // 检测请求类型
        const isJsonData = typeof formData === 'object' && !(formData instanceof FormData);

        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.state.isRequestPending = false;
                reject(new Error(`Request timeout after ${timeout}ms`));
            }, timeout);

            // 构建请求选项
            const requestHeaders = {
                'Accept': 'application/json',
                'X-API-Key': this.config.apiKey
            };

            let requestData;
            if (isJsonData) {
                requestHeaders['Content-Type'] = 'application/json';
                requestData = JSON.stringify(formData);
            } else {
                requestData = formData;
            }

            // 使用 GM_xmlhttpRequest 发送请求
            if (typeof GM_xmlhttpRequest !== 'undefined') {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: this.config.getApiUrl(),
                    data: requestData,
                    headers: requestHeaders,
                    responseType: 'json',
                    timeout: timeout,
                    onload: (response) => {
                        clearTimeout(timeoutId);
                        this.state.isRequestPending = false;
                        this.state.currentRetryCount = 0;

                        try {
                            const result = response.response;
                            if (result && result.success && result.data && result.data.response) {
                                resolve(result);
                            } else {
                                reject(new Error('Invalid response format'));
                            }
                        } catch (e) {
                            reject(new Error(`Response parsing error: ${e.message}`));
                        }
                    },
                    onerror: (error) => {
                        clearTimeout(timeoutId);
                        this.state.isRequestPending = false;

                        if (retryCount < maxRetries - 1) {
                            console.log(`Request failed, retrying... (${retryCount + 1}/${maxRetries})`);
                            this.delay(this.config.retryDelay).then(() => {
                                this.request(formData, retryCount + 1)
                                    .then(resolve)
                                    .catch(reject);
                            });
                        } else {
                            this.state.currentRetryCount = 0;
                            reject(new Error(`Request failed after ${maxRetries} retries`));
                        }
                    },
                    ontimeout: () => {
                        clearTimeout(timeoutId);
                        this.state.isRequestPending = false;

                        if (retryCount < maxRetries - 1) {
                            console.log(`Request timeout, retrying... (${retryCount + 1}/${maxRetries})`);
                            this.delay(this.config.retryDelay).then(() => {
                                this.request(formData, retryCount + 1)
                                    .then(resolve)
                                    .catch(reject);
                            });
                        } else {
                            this.state.currentRetryCount = 0;
                            reject(new Error(`Request timeout after ${maxRetries} retries`));
                        }
                    }
                });
            } else {
                // 降级使用 fetch API
                clearTimeout(timeoutId);
                this.state.isRequestPending = false;
                reject(new Error('GM_xmlhttpRequest is not available'));
            }
        });
    }

    /**
     * 发送带验证的请求
     * @param {Object} params - 请求参数对象
     * @param {boolean} useJson - 是否使用 JSON 格式（默认 FormData）
     * @returns {Promise<Object>} 响应结果
     */
    async requestWithValidation(params, useJson = false) {
        try {
            // 构建请求数据
            const requestData = useJson
                ? this.requestBuilder.buildJson(params)
                : this.requestBuilder.buildFormData(params);

            // 发送请求
            return await this.request(requestData);
        } catch (error) {
            if (error instanceof ValidationError) {
                // 验证错误，直接返回错误信息
                console.error('Validation error:', error.errors);
                return {
                    success: false,
                    error: error.errors,
                    code: 'VALIDATION_ERROR'
                };
            }
            throw error;
        }
    }

    /**
     * 获取可用角色类型列表
     * @returns {string[]}
     */
    getAvailableRoleTypes() {
        return this.requestBuilder.getAvailableRoleTypes();
    }

    /**
     * 取消当前请求
     */
    cancel() {
        this.state.isRequestPending = false;
        this.state.currentRetryCount = 0;
    }

    /**
     * 延迟函数
     * @param {number} ms - 延迟毫秒数
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 更新配置
     * @param {Object} newConfig - 新配置项
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * 获取当前状态
     * @returns {Object}
     */
    getState() {
        return { ...this.state };
    }
}

/**
 * 创建默认的 API Client 实例
 * @param {Object} config - 配置项
 * @returns {ApiClient}
 */
export function createApiClient(config) {
    return new ApiClient(config);
}

export default ApiClient;