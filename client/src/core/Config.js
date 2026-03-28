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
    }
};

export default Config;