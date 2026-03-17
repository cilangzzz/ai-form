// ==UserScript==
// @name         ai表单
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Use keyboard shortcut to fetch and display AI suggestions for form fields
// @author       You
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @connect      *
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // ============================================================
    // 配置对象 - 集中管理所有配置项
    // ============================================================
    const Config = {
        // 快捷键配置
        shortcut: {
            altKey: true,
            key: 'q'
        },

        // API 配置 - 可通过 GM_setValue/GM_getValue 动态配置
        api: {
            server: GM_getValue('apiServer', 'http://192.168.3.186:5001'),
            endpoint: '/ai/chat_remark',
            timeout: GM_getValue('apiTimeout', 30000), // 30秒超时
            maxRetries: GM_getValue('maxRetries', 3),
            retryDelay: GM_getValue('retryDelay', 1000)
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

        // 从 localStorage 加载设置
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

        // 保存设置到 localStorage
        save() {
            localStorage.setItem('formParentSearchDepth', String(this.form.parentSearchDepth));
            localStorage.setItem('singleInputMode', JSON.stringify(this.form.singleInputMode));
            localStorage.setItem('settingsPosition', JSON.stringify(this.ui.position));
            localStorage.setItem('showSuggestionsContainer', JSON.stringify(this.ui.showSuggestionsContainer));
        },

        // 获取完整 API URL
        getApiUrl() {
            return this.api.server + this.api.endpoint;
        }
    };

    // ============================================================
    // 状态管理对象
    // ============================================================
    const State = {
        mouseX: 0,
        mouseY: 0,
        hisX: 0,
        hisY: 0,
        chatContext: localStorage.getItem('aiAssistant_chatContext') || '',
        currentRetryCount: 0,
        isRequestPending: false,
        abortController: null
    };

    // ============================================================
    // 样式对象 - 提取内联样式，减少重绘
    // ============================================================
    const Styles = {
        // 建议容器样式
        container: {
            base: `
                position: fixed;
                right: 20px;
                top: 20px;
                background: rgba(255, 255, 255, 0.4);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                border: 1px solid rgba(200, 200, 200, 0.5);
                border-radius: 10px;
                padding: 10px;
                max-width: 300px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                z-index: 2147483647;
                display: none;
                font-family: sans-serif;
                will-change: opacity, transform;
            `,
            visible: 'display: block; opacity: 1; transform: scale(1);',
            hidden: 'display: none; opacity: 0; transform: scale(0.95);'
        },

        // 列表项样式
        listItem: `
            padding: 8px;
            margin: 5px 0;
            color: rgba(0, 0, 0, 0.9);
            background-color: rgba(255, 255, 255, 0.4);
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            border-radius: 3px;
            border: 1px solid rgba(255, 255, 255, 0.5);
            cursor: pointer;
            opacity: 0;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2), inset 0 0 15px rgba(255, 255, 255, 0.3);
            transform: translateY(40px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `,

        // 提示框样式
        tooltip: `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0,0,0,0.7);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 14px;
            z-index: 2147483647;
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
        `,

        // 加载状态样式
        loading: `
            padding: 5px;
            color: #333;
            font-style: italic;
        `,

        // 错误状态样式
        error: `
            padding: 5px;
            color: #d32f2f;
            background-color: rgba(211, 47, 47, 0.1);
            border-radius: 4px;
        `,

        // 生成设置菜单样式
        getSettingsStyles() {
            return `
                #ai-settings-container {
                    position: fixed;
                    background-color: rgba(255, 255, 255, 0.35);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    border-radius: 16px;
                    padding: 15px 18px;
                    max-width: 300px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1),
                                inset 0 0 0 1px rgba(255, 255, 255, 0.2);
                    z-index: 2147483647;
                    color: rgba(0, 0, 0, 0.8);
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    transition: all 0.3s ease;
                    overflow: hidden;
                    will-change: transform, opacity;
                }

                #ai-settings-toggle {
                    background: rgba(52, 152, 219, 0.65);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 10px;
                    padding: 10px 14px;
                    cursor: pointer;
                    font-weight: 600;
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    transition: all 0.3s ease;
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
                }

                #ai-settings-toggle:hover {
                    background: rgba(52, 152, 219, 0.85);
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
                }

                #ai-settings-toggle:focus {
                    outline: 2px solid rgba(52, 152, 219, 0.5);
                    outline-offset: 2px;
                }

                #ai-settings-panel {
                    margin-top: 15px;
                    padding-top: 12px;
                    border-top: 1px solid rgba(255, 255, 255, 0.3);
                }

                .settings-row {
                    display: flex;
                    align-items: center;
                    margin-bottom: 12px;
                    padding: 8px 5px;
                    border-radius: 12px;
                    background-color: rgba(255, 255, 255, 0.3);
                    backdrop-filter: blur(5px);
                    -webkit-backdrop-filter: blur(5px);
                    transition: all 0.2s ease;
                }

                .settings-row:hover,
                .settings-row:focus-within {
                    background-color: rgba(255, 255, 255, 0.4);
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
                }

                .settings-label {
                    flex-grow: 1;
                    font-size: 14px;
                    color: rgba(0, 0, 0, 0.7);
                    font-weight: 500;
                    padding-left: 8px;
                }

                .custom-checkbox {
                    position: relative;
                    display: inline-block;
                    width: 46px;
                    height: 24px;
                    margin-right: 8px;
                }

                .custom-checkbox input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                    position: absolute;
                }

                .custom-checkbox input:focus + .checkmark {
                    outline: 2px solid rgba(52, 152, 219, 0.5);
                    outline-offset: 2px;
                }

                .checkmark {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(200, 200, 200, 0.5);
                    border-radius: 20px;
                    transition: .3s;
                    backdrop-filter: blur(3px);
                    -webkit-backdrop-filter: blur(3px);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.1);
                }

                .checkmark:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 2px;
                    bottom: 2px;
                    background-color: rgba(255, 255, 255, 0.95);
                    border-radius: 50%;
                    transition: .3s;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                }

                .custom-checkbox input:checked + .checkmark {
                    background-color: rgba(33, 150, 243, 0.7);
                    box-shadow: inset 0 0 10px rgba(0, 120, 255, 0.2);
                }

                .custom-checkbox input:checked + .checkmark:before {
                    transform: translateX(22px);
                }

                .custom-number {
                    width: 60px;
                    text-align: center;
                    background-color: rgba(255, 255, 255, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.6);
                    border-radius: 8px;
                    padding: 6px 8px;
                    font-size: 14px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                    backdrop-filter: blur(5px);
                    -webkit-backdrop-filter: blur(5px);
                    color: rgba(0, 0, 0, 0.7);
                    transition: all 0.2s ease;
                    margin-right: 8px;
                }

                .custom-number:focus {
                    outline: none;
                    background-color: rgba(255, 255, 255, 0.7);
                    border-color: rgba(52, 152, 219, 0.8);
                    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.15);
                }

                .custom-text {
                    width: calc(100% - 16px);
                    background-color: rgba(255, 255, 255, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.6);
                    border-radius: 8px;
                    padding: 6px 8px;
                    font-size: 14px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                    backdrop-filter: blur(5px);
                    -webkit-backdrop-filter: blur(5px);
                    color: rgba(0, 0, 0, 0.7);
                    transition: all 0.2s ease;
                    margin-top: 5px;
                    resize: vertical;
                    min-height: 60px;
                }

                .custom-text:focus {
                    outline: none;
                    background-color: rgba(255, 255, 255, 0.7);
                    border-color: rgba(52, 152, 219, 0.8);
                    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.15);
                }

                .status-indicator {
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    background-color: rgba(46, 125, 50, 0.15);
                    color: rgba(46, 125, 50, 0.9);
                    backdrop-filter: blur(5px);
                    -webkit-backdrop-filter: blur(5px);
                    display: inline-block;
                    margin-top: 10px;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
                    text-align: center;
                    width: 85%;
                    margin-left: auto;
                    margin-right: auto;
                    transform: translateY(0);
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }

                .status-indicator.error {
                    background-color: rgba(211, 47, 47, 0.15);
                    color: rgba(211, 47, 47, 0.9);
                }

                .api-config-row {
                    flex-direction: column;
                    align-items: flex-start;
                }

                .api-config-row .settings-label {
                    margin-bottom: 5px;
                }
            `;
        }
    };

    // ============================================================
    // 工具函数
    // ============================================================
    const Utils = {
        // 防抖函数
        debounce(fn, delay) {
            let timer = null;
            return function(...args) {
                clearTimeout(timer);
                timer = setTimeout(() => fn.apply(this, args), delay);
            };
        },

        // 安全的 JSON 解析
        safeJsonParse(str, defaultValue = null) {
            try {
                return JSON.parse(str);
            } catch {
                return defaultValue;
            }
        },

        // 清理 HTML 内容，防止 XSS
        sanitizeHtml(html) {
            const div = document.createElement('div');
            div.textContent = html;
            return div.innerHTML;
        },

        // 延迟函数
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        // 使用 requestAnimationFrame 进行动画
        animate(element, properties, duration = 300) {
            return new Promise(resolve => {
                const start = performance.now();

                const initialStyles = {};
                for (const prop in properties) {
                    initialStyles[prop] = parseFloat(getComputedStyle(element)[prop]) || 0;
                }

                const step = (timestamp) => {
                    const elapsed = timestamp - start;
                    const progress = Math.min(elapsed / duration, 1);

                    for (const prop in properties) {
                        const target = properties[prop];
                        const initial = initialStyles[prop];
                        const current = initial + (target - initial) * progress;
                        element.style[prop] = String(current);
                    }

                    if (progress < 1) {
                        requestAnimationFrame(step);
                    } else {
                        resolve();
                    }
                };

                requestAnimationFrame(step);
            });
        },

        // 批量更新样式以减少重绘
        setStyles(element, styles) {
            if (!element) return;
            const styleStrings = [];
            for (const [key, value] of Object.entries(styles)) {
                styleStrings.push(`${key}: ${value}`);
            }
            element.style.cssText = styleStrings.join('; ');
        }
    };

    // ============================================================
    // API 请求管理 - 带重试和超时机制
    // ============================================================
    const ApiClient = {
        // 发送请求（带重试机制）
        async request(formData, retryCount = 0) {
            if (State.isRequestPending) {
                console.log('Request already pending, skipping...');
                return null;
            }

            State.isRequestPending = true;
            const timeout = Config.api.timeout;
            const maxRetries = Config.api.maxRetries;

            return new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    State.isRequestPending = false;
                    reject(new Error(`Request timeout after ${timeout}ms`));
                }, timeout);

                GM_xmlhttpRequest({
                    method: 'POST',
                    url: Config.getApiUrl(),
                    data: formData,
                    headers: {
                        'Accept': 'application/json'
                    },
                    responseType: 'json',
                    timeout: timeout,
                    onload: function(response) {
                        clearTimeout(timeoutId);
                        State.isRequestPending = false;
                        State.currentRetryCount = 0;

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
                    onerror: function(error) {
                        clearTimeout(timeoutId);
                        State.isRequestPending = false;

                        if (retryCount < maxRetries - 1) {
                            console.log(`Request failed, retrying... (${retryCount + 1}/${maxRetries})`);
                            Utils.delay(Config.api.retryDelay).then(() => {
                                ApiClient.request(formData, retryCount + 1)
                                    .then(resolve)
                                    .catch(reject);
                            });
                        } else {
                            State.currentRetryCount = 0;
                            reject(new Error(`Request failed after ${maxRetries} retries`));
                        }
                    },
                    ontimeout: function() {
                        clearTimeout(timeoutId);
                        State.isRequestPending = false;

                        if (retryCount < maxRetries - 1) {
                            console.log(`Request timeout, retrying... (${retryCount + 1}/${maxRetries})`);
                            Utils.delay(Config.api.retryDelay).then(() => {
                                ApiClient.request(formData, retryCount + 1)
                                    .then(resolve)
                                    .catch(reject);
                            });
                        } else {
                            State.currentRetryCount = 0;
                            reject(new Error(`Request timeout after ${maxRetries} retries`));
                        }
                    }
                });
            });
        },

        // 取消当前请求
        cancel() {
            State.isRequestPending = false;
            State.currentRetryCount = 0;
        }
    };

    // ============================================================
    // 表单数据处理 - 只提取元数据，不发送完整 HTML
    // ============================================================
    const FormDataExtractor = {
        // 从表单元素提取元数据（安全处理）
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
        },

        // 清理并提取单个字段信息
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
        },

        // 查找关联的 label
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
        },

        // 提取 select 的选项
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
        },

        // 序列化元数据为 FormData
        toFormData(metadata) {
            const formData = new FormData();
            formData.append('formMetadata', JSON.stringify(metadata));
            formData.append('chatContext', State.chatContext || '');
            return formData;
        }
    };

    // ============================================================
    // 响应解析器 - 更健壮的解析
    // ============================================================
    const ResponseParser = {
        // 解析响应数据
        parse(responseStr) {
            if (!responseStr || typeof responseStr !== 'string') {
                console.warn('Invalid response string:', responseStr);
                return [];
            }

            // 尝试直接解析 JSON
            try {
                const directParse = JSON.parse(responseStr);
                if (Array.isArray(directParse)) {
                    return this.normalizeArray(directParse);
                }
                if (typeof directParse === 'object' && directParse !== null) {
                    return [directParse];
                }
            } catch {
                // 不是有效 JSON，继续其他解析方式
            }

            // 清理并尝试解析
            return this.parseCleaned(responseStr);
        },

        // 解析清理后的字符串
        parseCleaned(responseStr) {
            try {
                // 清理响应字符串
                let cleanedStr = responseStr
                    .replace(/'/g, '"')
                    .replace(/，/g, ',')
                    .replace(/：/g, ':')
                    .replace(/\\"/g, '"')  // 处理转义引号
                    .trim();

                // 移除可能的前后缀
                if (cleanedStr.startsWith('```json')) {
                    cleanedStr = cleanedStr.slice(7);
                }
                if (cleanedStr.startsWith('```')) {
                    cleanedStr = cleanedStr.slice(3);
                }
                if (cleanedStr.endsWith('```')) {
                    cleanedStr = cleanedStr.slice(0, -3);
                }
                cleanedStr = cleanedStr.trim();

                // 添加花括号（如果缺失）
                if (!cleanedStr.startsWith('{') && !cleanedStr.startsWith('[')) {
                    cleanedStr = '{' + cleanedStr + '}';
                }

                // 尝试匹配键值对
                const entries = this.extractKeyValuePairs(cleanedStr);

                if (entries.length === 0) {
                    return [];
                }

                // 分组并构建结果
                return this.groupEntries(entries);
            } catch (e) {
                console.error('Error parsing AI response:', e);
                return [];
            }
        },

        // 提取键值对
        extractKeyValuePairs(str) {
            const entries = [];
            // 匹配 "key": "value" 格式
            const regex = /"([^"]+)"\s*:\s*"([^"]*)"/g;
            let match;

            while ((match = regex.exec(str)) !== null) {
                entries.push({
                    key: match[1].trim(),
                    value: match[2].trim()
                });
            }

            return entries;
        },

        // 分组条目
        groupEntries(entries) {
            const groups = {};
            const result = [];

            entries.forEach(entry => {
                if (!groups[entry.key]) {
                    groups[entry.key] = [];
                }
                groups[entry.key].push(entry.value);
            });

            // 创建建议对象
            Object.keys(groups).forEach(key => {
                groups[key].forEach((value, i) => {
                    if (!result[i]) result[i] = {};
                    result[i][key] = value;
                });
            });

            return result;
        },

        // 标准化数组
        normalizeArray(arr) {
            return arr.map(item => {
                if (typeof item === 'object' && item !== null) {
                    return item;
                }
                if (typeof item === 'string') {
                    return this.parseCleaned(item);
                }
                return null;
            }).filter(Boolean);
        }
    };

    // ============================================================
    // UI 管理器
    // ============================================================
    const UIManager = {
        suggestionContainer: null,
        settingsContainer: null,
        currentFocusIndex: -1,

        // 创建建议容器
        createSuggestionsContainer() {
            if (this.suggestionContainer) {
                return this.suggestionContainer;
            }

            const container = document.createElement('div');
            container.id = 'ai-suggestions-container';
            container.setAttribute('role', 'dialog');
            container.setAttribute('aria-label', 'AI Suggestions');
            container.style.cssText = Styles.container.base;

            const title = this.createTitle(container);
            container.appendChild(title);

            const suggestionsList = document.createElement('ul');
            suggestionsList.id = 'ai-suggestions-list';
            suggestionsList.setAttribute('role', 'listbox');
            suggestionsList.style.cssText = 'list-style: none; padding: 0; margin: 0;';
            container.appendChild(suggestionsList);

            document.body.appendChild(container);
            this.suggestionContainer = container;

            // 添加键盘导航
            this.setupKeyboardNavigation(container);

            return container;
        },

        // 创建标题栏
        createTitle(container) {
            const title = document.createElement('div');
            title.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-weight: bold;
                margin-bottom: 10px;
                padding-bottom: 5px;
                border-bottom: 1px solid rgba(200, 200, 200, 0.5);
            `;

            const titleLeft = document.createElement('div');
            titleLeft.style.cssText = 'display: flex; align-items: center;';

            const logo = document.createElement('span');
            logo.textContent = 'AI';
            logo.style.cssText = 'font-size: 16px; margin-right: 5px; font-weight: bold; color: #2196F3;';
            logo.setAttribute('aria-hidden', 'true');

            const titleText = document.createElement('span');
            titleText.textContent = 'Suggestions';
            titleText.style.color = 'black';

            titleLeft.appendChild(logo);
            titleLeft.appendChild(titleText);

            const titleRight = document.createElement('div');
            titleRight.style.cssText = 'display: flex; align-items: center; gap: 8px;';

            const settingBtn = this.createButton('Settings', () => {
                Config.ui.showSuggestionsContainer = !Config.ui.showSuggestionsContainer;
                this.toggleSettings();
                Config.save();
            });
            settingBtn.textContent = '\u2699\uFE0F';
            settingBtn.setAttribute('aria-label', 'Settings');
            settingBtn.style.cssText = 'cursor: pointer; font-size: 18px; background: none; border: none; padding: 4px;';

            const closeBtn = this.createButton('Close', () => {
                this.hideContainer(container);
            });
            closeBtn.textContent = '\u2716';
            closeBtn.setAttribute('aria-label', 'Close');
            closeBtn.style.cssText = 'cursor: pointer; font-size: 16px; background: none; border: none; padding: 4px; color: #666;';

            titleRight.appendChild(settingBtn);
            titleRight.appendChild(closeBtn);

            title.appendChild(titleLeft);
            title.appendChild(titleRight);

            return title;
        },

        // 创建按钮
        createButton(label, onClick) {
            const btn = document.createElement('button');
            btn.setAttribute('aria-label', label);
            btn.addEventListener('click', onClick);
            return btn;
        },

        // 显示容器
        showContainer(container) {
            container.style.display = 'block';
            container.style.opacity = '0';
            container.style.transform = 'scale(0.98)';

            requestAnimationFrame(() => {
                container.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                container.style.opacity = '1';
                container.style.transform = 'scale(1)';
            });
        },

        // 隐藏容器
        hideContainer(container) {
            container.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            container.style.opacity = '0';
            container.style.transform = 'scale(0.98)';

            setTimeout(() => {
                container.style.display = 'none';
            }, Config.ui.animationDuration);
        },

        // 设置键盘导航
        setupKeyboardNavigation(container) {
            container.addEventListener('keydown', (e) => {
                const items = container.querySelectorAll('[role="option"]');

                switch(e.key) {
                    case 'ArrowDown':
                        e.preventDefault();
                        this.currentFocusIndex = Math.min(this.currentFocusIndex + 1, items.length - 1);
                        this.focusItem(items);
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        this.currentFocusIndex = Math.max(this.currentFocusIndex - 1, 0);
                        this.focusItem(items);
                        break;
                    case 'Enter':
                        e.preventDefault();
                        if (this.currentFocusIndex >= 0 && items[this.currentFocusIndex]) {
                            items[this.currentFocusIndex].click();
                        }
                        break;
                    case 'Escape':
                        e.preventDefault();
                        this.hideContainer(container);
                        break;
                }
            });
        },

        // 聚焦项目
        focusItem(items) {
            items.forEach((item, index) => {
                if (index === this.currentFocusIndex) {
                    item.setAttribute('aria-selected', 'true');
                    item.style.backgroundColor = 'rgba(52, 152, 219, 0.2)';
                    item.focus();
                } else {
                    item.setAttribute('aria-selected', 'false');
                    item.style.backgroundColor = '';
                }
            });
        },

        // 显示加载状态
        showLoading(container) {
            const list = document.getElementById('ai-suggestions-list');
            if (!list) return;

            list.innerHTML = '';
            const loadingItem = document.createElement('li');
            loadingItem.id = 'loading-item';
            loadingItem.setAttribute('role', 'status');
            loadingItem.setAttribute('aria-live', 'polite');
            loadingItem.style.cssText = Styles.loading;
            loadingItem.textContent = 'Loading suggestions';

            list.appendChild(loadingItem);
            this.showContainer(container);

            // 动态加载动画
            let dotCount = 0;
            const maxDots = 3;
            const loadingInterval = setInterval(() => {
                dotCount = (dotCount % maxDots) + 1;
                const dots = '.'.repeat(dotCount);
                loadingItem.textContent = `Thinking${dots}`;
            }, 400);

            // 存储定时器 ID 以便清除
            container.dataset.loadingInterval = String(setInterval(() => {
                dotCount = (dotCount % maxDots) + 1;
                loadingItem.textContent = `Thinking${'.'.repeat(dotCount)}`;
            }, 400));

            // 清除之前的定时器
            clearInterval(loadingInterval);
        },

        // 显示错误状态
        showError(container, message, retryCallback) {
            const list = document.getElementById('ai-suggestions-list');
            if (!list) return;

            this.clearLoadingInterval(container);
            list.innerHTML = '';

            const errorItem = document.createElement('li');
            errorItem.setAttribute('role', 'alert');
            errorItem.style.cssText = Styles.error;
            errorItem.innerHTML = `<span>${Utils.sanitizeHtml(message)}</span>`;

            if (retryCallback) {
                const retryBtn = document.createElement('button');
                retryBtn.textContent = 'Retry';
                retryBtn.style.cssText = `
                    margin-left: 10px;
                    padding: 4px 8px;
                    background: rgba(52, 152, 219, 0.8);
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                `;
                retryBtn.addEventListener('click', retryCallback);
                errorItem.appendChild(retryBtn);
            }

            list.appendChild(errorItem);
            this.showContainer(container);
        },

        // 清除加载定时器
        clearLoadingInterval(container) {
            const intervalId = container.dataset.loadingInterval;
            if (intervalId) {
                clearInterval(parseInt(intervalId, 10));
                delete container.dataset.loadingInterval;
            }
        },

        // 显示建议列表
        displaySuggestions(suggestions) {
            const container = this.suggestionContainer || this.createSuggestionsContainer();
            const list = document.getElementById('ai-suggestions-list');

            this.clearLoadingInterval(container);
            list.innerHTML = '';
            this.currentFocusIndex = -1;

            if (suggestions.length === 0) {
                const noSuggestions = document.createElement('li');
                noSuggestions.textContent = 'No suggestions available';
                noSuggestions.style.padding = '5px';
                noSuggestions.setAttribute('role', 'status');
                list.appendChild(noSuggestions);
            } else {
                suggestions.forEach((suggestion, index) => {
                    const item = document.createElement('li');
                    item.setAttribute('role', 'option');
                    item.setAttribute('tabindex', '0');
                    item.style.cssText = Styles.listItem;

                    const summaryText = Object.entries(suggestion)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(', ');

                    item.textContent = `Suggestion ${index + 1}: ${summaryText}`;

                    // 鼠标事件
                    item.addEventListener('mouseenter', () => {
                        item.style.backdropFilter = 'blur(25px)';
                        item.style.webkitBackdropFilter = 'blur(25px)';
                        item.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.5)';
                        item.style.transform = 'translateY(0) scale(1.02)';
                        item.style.borderColor = 'rgba(255, 255, 255, 0.7)';
                    });

                    item.addEventListener('mouseleave', () => {
                        item.style.backdropFilter = 'blur(15px)';
                        item.style.webkitBackdropFilter = 'blur(15px)';
                        item.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2), inset 0 0 15px rgba(255, 255, 255, 0.3)';
                        item.style.transform = 'translateY(0)';
                        item.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                    });

                    // 点击和键盘事件
                    const handleSelect = async () => {
                        FormFiller.fillFormFields(suggestion);
                        try {
                            await navigator.clipboard.writeText(summaryText);
                            this.showTooltip('Copied to clipboard');
                        } catch (err) {
                            console.warn('Failed to copy to clipboard:', err);
                        }
                        this.hideContainer(container);
                    };

                    item.addEventListener('click', handleSelect);
                    item.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelect();
                        }
                    });

                    list.appendChild(item);

                    // 延迟显示动画
                    setTimeout(() => {
                        item.style.opacity = '1';
                        item.style.transform = 'translateY(0)';
                    }, index * 80);
                });
            }

            this.showContainer(container);

            // 设置位置
            container.style.top = `${State.hisX + window.scrollY + 10}px`;
            container.style.left = `${State.hisY + window.scrollX}px`;

            // 聚焦第一个项目以支持键盘导航
            const firstItem = list.querySelector('[role="option"]');
            if (firstItem) {
                firstItem.focus();
                this.currentFocusIndex = 0;
                this.focusItem(list.querySelectorAll('[role="option"]'));
            }
        },

        // 显示提示框
        showTooltip(message) {
            const tooltip = document.createElement('div');
            tooltip.setAttribute('role', 'status');
            tooltip.setAttribute('aria-live', 'polite');
            tooltip.style.cssText = Styles.tooltip;
            tooltip.textContent = message;
            document.body.appendChild(tooltip);

            requestAnimationFrame(() => {
                tooltip.style.opacity = '1';
            });

            setTimeout(() => {
                tooltip.style.opacity = '0';
                tooltip.addEventListener('transitionend', () => tooltip.remove());
            }, 1500);
        },

        // 切换设置面板
        toggleSettings() {
            if (!this.settingsContainer) {
                this.createSettingsMenu();
            }

            if (Config.ui.showSuggestionsContainer) {
                this.settingsContainer.style.display = 'block';
                this.settingsContainer.style.opacity = '1';
            } else {
                this.settingsContainer.style.display = 'none';
            }
        },

        // 创建设置菜单
        createSettingsMenu() {
            if (this.settingsContainer) {
                return this.settingsContainer;
            }

            // 添加样式
            const style = document.createElement('style');
            style.textContent = Styles.getSettingsStyles();
            document.head.appendChild(style);

            // 创建容器
            const container = document.createElement('div');
            container.id = 'ai-settings-container';
            container.setAttribute('role', 'dialog');
            container.setAttribute('aria-label', 'AI Form Settings');

            // 创建切换按钮
            const toggleButton = document.createElement('button');
            toggleButton.id = 'ai-settings-toggle';
            toggleButton.innerHTML = '<span>Auto-fill Assistant Settings</span><span aria-hidden="true">\u2699\uFE0F</span>';

            // 创建设置面板
            const settingsPanel = document.createElement('div');
            settingsPanel.id = 'ai-settings-panel';
            settingsPanel.style.display = 'none';

            // 单输入框模式
            const singleInputRow = this.createSettingsRow(
                'Single Input Mode',
                'single-input-mode',
                'checkbox',
                Config.form.singleInputMode
            );

            // 表单搜索深度
            const stepsRow = this.createSettingsRow(
                'Form Search Depth',
                'form-steps',
                'number',
                Config.form.parentSearchDepth,
                { min: 1, max: 10 }
            );

            // API 服务器配置
            const apiServerRow = this.createSettingsRow(
                'API Server',
                'api-server',
                'text',
                Config.api.server
            );
            apiServerRow.classList.add('api-config-row');

            // 请求超时配置
            const timeoutRow = this.createSettingsRow(
                'Timeout (ms)',
                'api-timeout',
                'number',
                Config.api.timeout,
                { min: 5000, max: 60000 }
            );

            // 聊天上下文
            const chatContextRow = document.createElement('div');
            chatContextRow.className = 'settings-row';
            chatContextRow.style.flexDirection = 'column';
            chatContextRow.style.alignItems = 'flex-start';

            const chatContextLabel = document.createElement('label');
            chatContextLabel.className = 'settings-label';
            chatContextLabel.textContent = 'Chat Context';
            chatContextLabel.htmlFor = 'chat-context';
            chatContextLabel.style.marginBottom = '5px';

            const chatContextInput = document.createElement('textarea');
            chatContextInput.className = 'custom-text';
            chatContextInput.id = 'chat-context';
            chatContextInput.rows = 3;
            chatContextInput.value = State.chatContext || '';
            chatContextInput.placeholder = 'Enter chat context...';

            chatContextRow.appendChild(chatContextLabel);
            chatContextRow.appendChild(chatContextInput);

            // 状态指示器
            const statusIndicator = document.createElement('div');
            statusIndicator.className = 'status-indicator';
            statusIndicator.textContent = 'Settings saved';
            statusIndicator.style.display = 'none';

            // 添加所有元素
            settingsPanel.appendChild(singleInputRow);
            settingsPanel.appendChild(stepsRow);
            settingsPanel.appendChild(apiServerRow);
            settingsPanel.appendChild(timeoutRow);
            settingsPanel.appendChild(chatContextRow);
            settingsPanel.appendChild(statusIndicator);

            container.appendChild(toggleButton);
            container.appendChild(settingsPanel);
            document.body.appendChild(container);

            // 设置位置
            const containerWidth = container.offsetWidth || 300;
            const containerHeight = container.offsetHeight || 200;
            const posX = Math.max(10, Math.min(State.mouseX, window.innerWidth - containerWidth - 10));
            const posY = Math.max(10, Math.min(State.mouseY, window.innerHeight - containerHeight - 10));

            container.style.left = `${posX - 50}px`;
            container.style.top = `${posY - 40}px`;
            container.style.opacity = '1';
            container.style.visibility = 'visible';

            // 事件监听
            let settingsChanged = false;

            toggleButton.addEventListener('click', () => {
                const isVisible = settingsPanel.style.display !== 'none';
                settingsPanel.style.display = isVisible ? 'none' : 'block';

                if (isVisible && settingsChanged) {
                    this.showStatusIndicator(statusIndicator, 'Settings saved');
                    settingsChanged = false;
                }
            });

            // 单输入框模式
            const singleInputCheckbox = singleInputRow.querySelector('input');
            singleInputCheckbox.addEventListener('change', () => {
                Config.form.singleInputMode = singleInputCheckbox.checked;
                Config.save();
                settingsChanged = true;
                this.showStatusIndicator(statusIndicator, 'Settings saved');
            });

            // 表单搜索深度
            const stepsInput = stepsRow.querySelector('input');
            stepsInput.addEventListener('input', Utils.debounce(() => {
                Config.form.parentSearchDepth = parseInt(stepsInput.value, 10) || 4;
                Config.save();
                settingsChanged = true;
                this.showStatusIndicator(statusIndicator, 'Settings saved');
            }, Config.ui.debounceDelay));

            // API 服务器
            const apiServerInput = apiServerRow.querySelector('input');
            apiServerInput.addEventListener('input', Utils.debounce(() => {
                const value = apiServerInput.value.trim();
                if (value) {
                    Config.api.server = value;
                    GM_setValue('apiServer', value);
                    settingsChanged = true;
                    this.showStatusIndicator(statusIndicator, 'Settings saved');
                }
            }, Config.ui.debounceDelay));

            // 超时设置
            const timeoutInput = timeoutRow.querySelector('input');
            timeoutInput.addEventListener('input', Utils.debounce(() => {
                Config.api.timeout = parseInt(timeoutInput.value, 10) || 30000;
                GM_setValue('apiTimeout', Config.api.timeout);
                settingsChanged = true;
                this.showStatusIndicator(statusIndicator, 'Settings saved');
            }, Config.ui.debounceDelay));

            // 聊天上下文
            chatContextInput.addEventListener('input', Utils.debounce(() => {
                State.chatContext = chatContextInput.value;
                localStorage.setItem('aiAssistant_chatContext', chatContextInput.value);
                settingsChanged = true;
                this.showStatusIndicator(statusIndicator, 'Settings saved');
            }, Config.ui.debounceDelay));

            // 拖拽功能
            this.makeDraggable(container);

            // 自动隐藏
            let hideTimer = null;
            let isMouseInSettings = false;

            container.addEventListener('mouseenter', () => {
                clearTimeout(hideTimer);
                isMouseInSettings = true;
            });

            container.addEventListener('mouseleave', (e) => {
                if (!e.relatedTarget || !container.contains(e.relatedTarget)) {
                    isMouseInSettings = false;
                    hideTimer = setTimeout(() => {
                        if (!isMouseInSettings && settingsPanel.style.display !== 'none') {
                            container.style.opacity = '0';
                            setTimeout(() => {
                                container.style.display = 'none';
                            }, 300);
                        }
                    }, 500);
                }
            });

            this.settingsContainer = container;
            return container;
        },

        // 创建设置行
        createSettingsRow(label, inputId, type, value, options = {}) {
            const row = document.createElement('div');
            row.className = 'settings-row';

            const labelEl = document.createElement('label');
            labelEl.className = 'settings-label';
            labelEl.textContent = label;
            labelEl.htmlFor = inputId;

            let input;

            if (type === 'checkbox') {
                const checkboxWrapper = document.createElement('label');
                checkboxWrapper.className = 'custom-checkbox';

                input = document.createElement('input');
                input.type = 'checkbox';
                input.id = inputId;
                input.checked = value;

                const checkmark = document.createElement('span');
                checkmark.className = 'checkmark';

                checkboxWrapper.appendChild(input);
                checkboxWrapper.appendChild(checkmark);
                row.appendChild(labelEl);
                row.appendChild(checkboxWrapper);
            } else if (type === 'number') {
                input = document.createElement('input');
                input.type = 'number';
                input.className = 'custom-number';
                input.id = inputId;
                input.value = value;
                if (options.min !== undefined) input.min = options.min;
                if (options.max !== undefined) input.max = options.max;

                row.appendChild(labelEl);
                row.appendChild(input);
            } else {
                input = document.createElement('input');
                input.type = 'text';
                input.className = 'custom-text';
                input.id = inputId;
                input.value = value;

                row.appendChild(labelEl);
                row.appendChild(input);
            }

            return row;
        },

        // 显示状态指示器
        showStatusIndicator(indicator, message, isError = false) {
            indicator.textContent = message;
            indicator.style.display = 'inline-block';

            if (isError) {
                indicator.classList.add('error');
            } else {
                indicator.classList.remove('error');
            }

            setTimeout(() => {
                indicator.style.display = 'none';
            }, 2000);
        },

        // 拖拽功能
        makeDraggable(element) {
            let isDragging = false;
            let offsetX = 0;
            let offsetY = 0;

            element.addEventListener('mousedown', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') {
                    return;
                }
                isDragging = true;
                offsetX = e.clientX - element.offsetLeft;
                offsetY = e.clientY - element.offsetTop;
                element.style.cursor = 'move';
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                element.style.left = `${e.clientX - offsetX}px`;
                element.style.top = `${e.clientY - offsetY}px`;
                element.style.right = 'auto';
                element.style.bottom = 'auto';
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    element.style.cursor = 'default';
                    Config.ui.position = {
                        top: element.offsetTop,
                        right: window.innerWidth - element.offsetLeft - element.offsetWidth
                    };
                    Config.save();
                }
            });
        }
    };

    // ============================================================
    // 表单填充器
    // ============================================================
    const FormFiller = {
        // 查找表单输入元素
        findFormInputs() {
            const currentElement = document.activeElement;
            return Array.from(currentElement.querySelectorAll('input, textarea, select'));
        },

        // 填充表单字段
        fillFormFields(suggestion) {
            const inputs = this.findFormInputs();

            if (inputs.length === 0) {
                console.log('No input fields found to fill');
                return;
            }

            inputs.forEach(input => {
                const fieldName = input.name || input.id || input.placeholder;
                if (!fieldName) return;

                // 查找最佳匹配（不区分大小写）
                const matchedKey = Object.keys(suggestion).find(key =>
                    key.toLowerCase() === fieldName.toLowerCase()
                );

                if (matchedKey && suggestion[matchedKey]) {
                    // 设置值
                    input.value = suggestion[matchedKey];

                    // 触发事件
                    ['input', 'change', 'blur'].forEach(eventType => {
                        const event = new Event(eventType, { bubbles: true });
                        input.dispatchEvent(event);
                    });
                }
            });
        }
    };

    // ============================================================
    // 核心逻辑
    // ============================================================

    // 获取当前输入元素信息
    const getCurrentInputInfo = () => {
        const currentElement = document.activeElement;

        if (!currentElement || !['INPUT', 'TEXTAREA', 'SELECT'].includes(currentElement.tagName)) {
            console.log('No valid input element focused');
            return null;
        }

        const rect = currentElement.getBoundingClientRect();
        State.hisX = rect.bottom;
        State.hisY = rect.left;

        return currentElement;
    };

    // 查找父表单
    const findParentForm = (element) => {
        let current = element;
        let steps = 0;

        while (current && steps < Config.form.parentSearchDepth) {
            current = current.parentElement;
            if (!current) break;
            if (current.tagName.toLowerCase() === 'form') {
                return current;
            }
            steps++;
        }

        return current;
    };

    // 获取建议
    const fetchSuggestions = async () => {
        const currentElement = getCurrentInputInfo();
        if (!currentElement) {
            console.log('No valid input element focused. Cannot fetch suggestions.');
            return;
        }

        console.log('Fetching suggestions for element:', currentElement);

        // 提取表单元数据（不发送完整 HTML）
        const parentForm = findParentForm(currentElement);
        const metadata = FormDataExtractor.extractFieldMetadata(parentForm || currentElement);

        if (!metadata || metadata.fields.length === 0) {
            UIManager.showTooltip('No form fields detected');
            return;
        }

        // 创建表单数据
        const formData = FormDataExtractor.toFormData(metadata);

        // 显示加载状态
        const container = UIManager.suggestionContainer || UIManager.createSuggestionsContainer();
        UIManager.showLoading(container);

        // 定位
        if (currentElement) {
            const rect = currentElement.getBoundingClientRect();
            container.style.top = `${rect.bottom + window.scrollY + 10}px`;
            container.style.left = `${rect.left + window.scrollX}px`;
        }

        // 发送请求
        try {
            const result = await ApiClient.request(formData);

            if (result && result.data && result.data.response) {
                const responseData = result.data.response[0];
                const suggestions = ResponseParser.parse(responseData);
                UIManager.displaySuggestions(suggestions);
            } else {
                UIManager.displaySuggestions([]);
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            UIManager.showError(
                container,
                `Error: ${error.message}`,
                () => fetchSuggestions() // 重试回调
            );
        }
    };

    // ============================================================
    // 初始化
    // ============================================================
    const init = () => {
        console.log('AI Form Autofill Helper initialized. Press Alt+Q to get suggestions.');

        // 加载配置
        Config.load();

        // 监听鼠标移动
        document.addEventListener('mousemove', (e) => {
            State.mouseX = e.clientX;
            State.mouseY = e.clientY;
        });

        // 添加键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.altKey === Config.shortcut.altKey && e.key.toLowerCase() === Config.shortcut.key) {
                e.preventDefault();
                console.log('Shortcut pressed, current element:', document.activeElement);
                fetchSuggestions();
            }
        });

        // 创建 UI 容器
        UIManager.createSuggestionsContainer();

        // 注册油猴菜单命令
        if (typeof GM_registerMenuCommand !== 'undefined') {
            GM_registerMenuCommand('AI Form Settings', () => {
                Config.ui.showSuggestionsContainer = true;
                UIManager.createSettingsMenu();
            });
        }
    };

    // 运行初始化
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})();