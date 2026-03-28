/**
 * App.js - 应用入口文件
 * 此文件作为 Rollup 构建的入口点
 * 集成所有模块并启动应用
 */

import Config from './core/Config.js';
import State from './core/State.js';
import eventBus, { Events } from './core/EventBus.js';

// API 模块
import { ApiClient } from './api/ApiClient.js';
import { ResponseParser } from './api/ResponseParser.js';

// 创建实例
const responseParser = new ResponseParser();

// 表单处理模块
import { FormDataExtractor } from './form/FormDataExtractor.js';
import { FormFiller } from './form/FormFiller.js';

// 创建 FormDataExtractor 实例
const formDataExtractor = new FormDataExtractor();

// UI 模块
import UIManager from './ui/UIManager.js';

// 适配器注册
import { AdapterRegistry } from './form/adapters/AdapterRegistry.js';
import VueAdapter from './form/adapters/VueAdapter.js';
import ReactAdapter from './form/adapters/ReactAdapter.js';
import AngularAdapter from './form/adapters/AngularAdapter.js';
import IonicAdapter from './form/adapters/IonicAdapter.js';
import SvelteAdapter from './form/adapters/SvelteAdapter.js';
import WebComponentsAdapter from './form/adapters/WebComponentsAdapter.js';
import VanillaAdapter from './form/adapters/VanillaAdapter.js';

/**
 * 工具函数对象
 */
const Utils = {
    debounce(fn, delay) {
        let timer = null;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    sanitizeHtml(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }
};

/**
 * 应用主类
 */
class App {
    constructor() {
        this.config = Config;
        this.state = State;
        this.eventBus = eventBus;
        this.uiManager = null;
        this.formFiller = null;
        this.apiClient = null;
        this.initialized = false;
    }

    /**
     * 初始化应用
     */
    init() {
        console.log('AI Form Autofill Helper initializing...');

        // 加载配置
        this.config.load();
        this.eventBus.emit(Events.CONFIG_LOAD, this.config);

        // 注册所有适配器
        this.registerAdapters();

        // 初始化表单填充器
        this.formFiller = new FormFiller({
            parentSearchDepth: this.config.form.parentSearchDepth
        });

        // 初始化 API 客户端
        this.apiClient = new ApiClient({
            timeout: this.config.api.timeout,
            maxRetries: this.config.api.maxRetries,
            retryDelay: this.config.api.retryDelay,
            apiKey: this.config.api.apiKey,
            getApiUrl: () => this.config.getApiUrl()
        });

        // 初始化 UI 管理器
        this.uiManager = new UIManager(this.config, this.state, Utils);

        // 创建 UI 容器
        this.uiManager.createSuggestionsContainer();

        // 绑定事件
        this.bindEvents();

        // 注册 GM 命令
        this.registerGMCommands();

        // 标记为已初始化
        this.initialized = true;

        console.log('AI Form Autofill Helper initialized successfully.');
        console.log('Press Alt+Q to get suggestions on focused form fields.');
        console.log('Press Ctrl+Shift+F for alternative trigger.');

        // 触发初始化完成事件
        this.eventBus.emit('app:init:complete', {
            config: this.config,
            adapters: AdapterRegistry.getAdapters()
        });
    }

    /**
     * 注册所有框架适配器
     */
    registerAdapters() {
        // 清空现有适配器
        AdapterRegistry.clear();

        // 按优先级注册适配器（高优先级的先注册）
        AdapterRegistry.register(new VueAdapter());
        AdapterRegistry.register(new ReactAdapter());
        AdapterRegistry.register(new AngularAdapter());
        AdapterRegistry.register(new IonicAdapter());
        AdapterRegistry.register(new SvelteAdapter());
        AdapterRegistry.register(new WebComponentsAdapter());
        // Vanilla 作为默认 fallback
        AdapterRegistry.register(new VanillaAdapter());
        AdapterRegistry.setDefaultAdapter(new VanillaAdapter());

        // 检测当前页面的框架
        const frameworks = AdapterRegistry.detectFrameworks();
        console.log('Detected frameworks:', frameworks);
    }

    /**
     * 绑定事件监听
     */
    bindEvents() {
        // 监听鼠标移动（用于 UI 定位）
        document.addEventListener('mousemove', (e) => {
            this.state.mouseX = e.clientX;
            this.state.mouseY = e.clientY;
            this.eventBus.emit(Events.STATE_MOUSE_MOVE, {
                x: e.clientX,
                y: e.clientY
            });
        });

        // 主快捷键绑定 (Alt+Q)
        document.addEventListener('keydown', (e) => {
            if (e.altKey === this.config.shortcut.altKey &&
                e.key.toLowerCase() === this.config.shortcut.key) {
                e.preventDefault();
                this.handleFormFillRequest();
            }

            // 备用快捷键 (Ctrl+Shift+F)
            if (e.ctrlKey && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                this.handleFormFillRequest();
            }
        });

        // 监听 UI 事件
        this.eventBus.on(Events.UI_SUGGESTION_SELECT, (suggestion) => {
            this.handleSuggestionSelect(suggestion);
        });

        // 监听配置变更
        this.eventBus.on(Events.CONFIG_CHANGE, (changes) => {
            this.handleConfigChange(changes);
        });
    }

    /**
     * 注册油猴菜单命令
     */
    registerGMCommands() {
        if (typeof GM_registerMenuCommand !== 'undefined') {
            GM_registerMenuCommand('AI Form Settings', () => {
                this.showSettings();
            });

            GM_registerMenuCommand('AI Form - Fill Current Form', () => {
                this.handleFormFillRequest();
            });

            GM_registerMenuCommand('AI Form - Clear Cache', () => {
                this.clearCache();
            });
        }
    }

    /**
     * 处理表单填充请求
     */
    async handleFormFillRequest() {
        // 获取当前焦点元素
        const currentElement = document.activeElement;

        if (!currentElement || !this.isFormElement(currentElement)) {
            console.log('No valid form element focused');
            this.showTooltip('Please focus on a form field first');
            return;
        }

        // 记录元素位置用于 UI 定位
        const rect = currentElement.getBoundingClientRect();
        this.state.hisX = rect.bottom;
        this.state.hisY = rect.left;

        // 查找父表单
        const parentForm = this.formFiller.findParentForm(currentElement);

        // 提取表单元数据
        const metadata = formDataExtractor.extractFieldMetadata(parentForm || currentElement);

        if (!metadata || metadata.fields.length === 0) {
            this.showTooltip('No form fields detected');
            return;
        }

        // 添加聊天上下文
        if (this.state.chatContext) {
            metadata.chatContext = this.state.chatContext;
        }

        // 显示加载状态
        const container = this.uiManager.getSuggestionContainer();
        if (container) {
            this.uiManager.showLoading(container);
        }
        this.eventBus.emit(Events.API_REQUEST_START, { metadata });

        // 发送请求
        try {
            const formData = formDataExtractor.toFormData(metadata);
            const result = await this.apiClient.request(formData);

            if (result && result.data && result.data.response) {
                const responseData = result.data.response[0];
                const suggestions = responseParser.parse(responseData);

                this.eventBus.emit(Events.API_REQUEST_SUCCESS, { suggestions });
                this.displaySuggestions(suggestions);
            } else {
                this.eventBus.emit(Events.API_REQUEST_ERROR, { error: 'Invalid response format' });
                this.showError('No suggestions available');
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            this.eventBus.emit(Events.API_REQUEST_ERROR, { error: error.message });
            this.showError(`Error: ${error.message}`, () => {
                this.handleFormFillRequest(); // Retry callback
            });
        }
    }

    /**
     * 显示建议列表
     * @param {Array} suggestions - 建议列表
     */
    displaySuggestions(suggestions) {
        const container = this.uiManager.getSuggestionContainer() ||
                          this.uiManager.createSuggestionsContainer();

        // 使用表单填充回调
        const formFillerCallback = (suggestion) => {
            this.handleSuggestionSelect(suggestion);
        };

        this.uiManager.displaySuggestions(suggestions, formFillerCallback);
    }

    /**
     * 处理建议选择
     * @param {Object} suggestion - 选中的建议
     */
    handleSuggestionSelect(suggestion) {
        if (!suggestion) return;

        this.eventBus.emit(Events.FORM_FILL_START, { suggestion });

        // 使用表单填充器填充
        const result = this.formFiller.fillFormFields(suggestion);

        this.eventBus.emit(Events.FORM_FILL_COMPLETE, { result, suggestion });

        // 显示结果提示
        if (result.filled > 0) {
            this.showTooltip(`Filled ${result.filled} fields`);
        } else {
            this.showTooltip('No matching fields found');
        }

        // 复制到剪贴板
        const summaryText = Object.entries(suggestion)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');

        try {
            navigator.clipboard.writeText(summaryText);
        } catch (err) {
            console.warn('Failed to copy to clipboard:', err);
        }

        // 隐藏建议容器
        this.hideSuggestions();
    }

    /**
     * 显示提示框
     * @param {string} message - 提示消息
     */
    showTooltip(message) {
        if (this.uiManager) {
            this.uiManager.showTooltip(message);
        }
    }

    /**
     * 显示错误
     * @param {string} message - 错误消息
     * @param {Function} retryCallback - 重试回调
     */
    showError(message, retryCallback) {
        const container = this.uiManager.getSuggestionContainer();
        if (container && this.uiManager) {
            this.uiManager.showError(container, message, retryCallback);
        }
    }

    /**
     * 隐藏建议容器
     */
    hideSuggestions() {
        const container = this.uiManager.getSuggestionContainer();
        if (container && this.uiManager) {
            this.uiManager.hideContainer(container);
        }
    }

    /**
     * 处理配置变更
     * @param {Object} changes - 变更内容
     */
    handleConfigChange(changes) {
        // 更新配置
        Object.assign(this.config, changes);

        // 保存配置
        this.config.save();

        // 更新相关模块
        if (changes.form) {
            this.formFiller?.updateConfig(changes.form);
        }

        console.log('Config updated:', changes);
    }

    /**
     * 显示设置面板
     */
    showSettings() {
        this.config.ui.showSuggestionsContainer = true;
        this.uiManager.createSettingsMenu();
        this.uiManager.toggleSettings();
    }

    /**
     * 清除缓存
     */
    clearCache() {
        localStorage.removeItem('aiAssistant_chatContext');
        this.state.chatContext = '';
        this.showTooltip('Cache cleared');
    }

    /**
     * 检查元素是否为表单元素
     * @param {HTMLElement} element - 要检查的元素
     * @returns {boolean}
     */
    isFormElement(element) {
        const formTags = ['INPUT', 'TEXTAREA', 'SELECT'];
        return formTags.includes(element.tagName);
    }

    /**
     * 获取应用信息
     * @returns {Object}
     */
    getInfo() {
        return {
            initialized: this.initialized,
            config: this.config,
            adapters: AdapterRegistry.getAdapters().map(a => a.getInfo ? a.getInfo() : { name: a.name }),
            version: '0.2'
        };
    }
}

// 创建应用实例
const app = new App();

// 根据文档状态启动应用
if (document.readyState === 'complete') {
    app.init();
} else {
    window.addEventListener('load', () => app.init());
}

// 导出应用实例和模块
export default App;
export { app, Config, State, eventBus, Events, AdapterRegistry, Utils };