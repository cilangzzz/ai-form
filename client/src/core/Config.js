/**
 * Config.js - 配置管理模块
 * 集中管理所有配置项，支持 localStorage 和 GM 存储
 */

// GM API 兼容性检查
const GM = {
    getValue: typeof GM_getValue !== 'undefined' ? GM_getValue : (key, defaultValue) => defaultValue,
    setValue: typeof GM_setValue !== 'undefined' ? GM_setValue : () => {}
};

const Config = {
    // 快捷键配置
    shortcut: {
        altKey: true,
        key: 'q'
    },

    // API 配置 - 可通过 GM_setValue/GM_getValue 动态配置
    api: {
        server: GM.getValue('apiServer', 'http://192.168.3.186:5001'),
        endpoint: '/ai/chat_remark',
        apiKey: GM.getValue('apiKey', 'mykey123'), // API Key for authentication
        timeout: GM.getValue('apiTimeout', 30000), // 30秒超时
        maxRetries: GM.getValue('maxRetries', 3),
        retryDelay: GM.getValue('retryDelay', 1000)
    },

    // 表单搜索配置
    form: {
        parentSearchDepth: 4,
        singleInputMode: false
    },

    // UI 配置
    ui: {
        position: { top: 50, right: 20 },
        showSuggestionsContainer: false,
        animationDuration: 300,
        debounceDelay: 100
    },

    // 请求参数配置
    request: {
        validateOnSend: true,
        sanitizeInput: true,
        defaults: {
            generationOptions: {
                count: 1,
                mode: 'standard',
                locale: 'zh-CN',
                validateRules: true
            },
            aiOptions: {
                model: 'qwen-turbo-latest',
                temperature: 0.7,
                roleType: 'default_form'
            }
        }
    },

    // 错误处理配置
    errorHandling: {
        retryStrategy: 'exponential',
        maxRetries: 3,
        errorActions: {
            VALIDATION_ERROR: 'show_message',
            SCHEMA_VALIDATION_ERROR: 'show_message',
            AI_SERVICE_ERROR: 'retry_fallback',
            RATE_LIMIT_ERROR: 'delay_retry',
            INVALID_ROLE_TYPE: 'show_message'
        }
    },

    /**
     * 从 localStorage 加载设置
     */
    load() {
        const storedDepth = localStorage.getItem('formParentSearchDepth');
        if (storedDepth) this.form.parentSearchDepth = parseInt(storedDepth, 10);

        const storedSingleInputMode = localStorage.getItem('singleInputMode');
        if (storedSingleInputMode !== null) this.form.singleInputMode = JSON.parse(storedSingleInputMode);

        const storedShowSuggestions = localStorage.getItem('showSuggestionsContainer');
        if (storedShowSuggestions !== null) this.ui.showSuggestionsContainer = JSON.parse(storedShowSuggestions);

        const storedPosition = localStorage.getItem('settingsPosition');
        if (storedPosition) this.ui.position = JSON.parse(storedPosition);

        // 加载生成选项
        const storedGenerationOptions = localStorage.getItem('generationOptions');
        if (storedGenerationOptions) {
            Object.assign(this.request.defaults.generationOptions, JSON.parse(storedGenerationOptions));
        }

        // 加载 AI 选项
        const storedAiOptions = localStorage.getItem('aiOptions');
        if (storedAiOptions) {
            Object.assign(this.request.defaults.aiOptions, JSON.parse(storedAiOptions));
        }
    },

    /**
     * 保存设置到 localStorage
     */
    save() {
        localStorage.setItem('formParentSearchDepth', String(this.form.parentSearchDepth));
        localStorage.setItem('singleInputMode', JSON.stringify(this.form.singleInputMode));
        localStorage.setItem('settingsPosition', JSON.stringify(this.ui.position));
        localStorage.setItem('showSuggestionsContainer', JSON.stringify(this.ui.showSuggestionsContainer));
    },

    /**
     * 获取完整 API URL
     * @returns {string} 完整的 API URL
     */
    getApiUrl() {
        return this.api.server + this.api.endpoint;
    },

    /**
     * 更新 API 服务器地址
     * @param {string} server - 新的服务器地址
     */
    setApiServer(server) {
        this.api.server = server;
        GM.setValue('apiServer', server);
    },

    /**
     * 更新 API 超时时间
     * @param {number} timeout - 超时时间（毫秒）
     */
    setApiTimeout(timeout) {
        this.api.timeout = timeout;
        GM.setValue('apiTimeout', timeout);
    },

    /**
     * 更新最大重试次数
     * @param {number} maxRetries - 最大重试次数
     */
    setMaxRetries(maxRetries) {
        this.api.maxRetries = maxRetries;
        GM.setValue('maxRetries', maxRetries);
    },

    /**
     * 更新重试延迟
     * @param {number} retryDelay - 重试延迟（毫秒）
     */
    setRetryDelay(retryDelay) {
        this.api.retryDelay = retryDelay;
        GM.setValue('retryDelay', retryDelay);
    },

    /**
     * 更新 API Key
     * @param {string} apiKey - API Key for authentication
     */
    setApiKey(apiKey) {
        this.api.apiKey = apiKey;
        GM.setValue('apiKey', apiKey);
    },

    /**
     * 获取请求默认参数
     * @returns {Object} 默认参数对象
     */
    getRequestDefaults() {
        return this.request.defaults;
    },

    /**
     * 设置生成选项
     * @param {string} key - 选项键名
     * @param {*} value - 选项值
     */
    setGenerationOption(key, value) {
        if (!this.request.defaults.generationOptions) {
            this.request.defaults.generationOptions = {};
        }
        this.request.defaults.generationOptions[key] = value;
        localStorage.setItem('generationOptions', JSON.stringify(this.request.defaults.generationOptions));
    },

    /**
     * 设置 AI 选项
     * @param {string} key - 选项键名
     * @param {*} value - 选项值
     */
    setAiOption(key, value) {
        if (!this.request.defaults.aiOptions) {
            this.request.defaults.aiOptions = {};
        }
        this.request.defaults.aiOptions[key] = value;
        localStorage.setItem('aiOptions', JSON.stringify(this.request.defaults.aiOptions));
    },

    /**
     * 设置角色类型
     * @param {string} roleType - 角色类型 (default_form, coder, md_generate, etc.)
     */
    setRoleType(roleType) {
        this.setAiOption('roleType', roleType);
    },

    /**
     * 获取当前角色类型
     * @returns {string} 当前角色类型
     */
    getRoleType() {
        const stored = localStorage.getItem('aiOptions');
        if (stored) {
            const options = JSON.parse(stored);
            return options.roleType || 'default_form';
        }
        return this.request.defaults.aiOptions?.roleType || 'default_form';
    },

    /**
     * 获取错误处理配置
     * @returns {Object} 错误处理配置
     */
    getErrorHandling() {
        return this.errorHandling;
    }
};

export default Config;