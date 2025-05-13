// ==UserScript==
// @name         ai表单
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Use keyboard shortcut to fetch and display AI suggestions for form fields
// @author       You
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @connect      *
// @connect      192.168.3.186
// ==/UserScript==

(function() {
    'use strict';

    // Configuration
    const SHORTCUT_KEY = { altKey: true, key: 'q' }; // Alt+A as shortcut key
    const API_SERVER = 'http://192.168.3.186:5001'; // API server address
    const API_ENDPOINT = '/ai/chat_remark'; // API endpoint path
    // 全局配置
    let formParentSearchDepth = 4;
    let singleInputMode = false;
    let settingsPosition = { top: 50, right: 20 };  // 默认位置
    let showSuggestionsContainer = false; // 默认显示建议容器
    // 全局变量存储鼠标位置
    let mouseX = 0;
    let mouseY = 0;
    let chatContext = null;

    // 监听鼠标移动，更新坐标
    document.addEventListener('mousemove', function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    // 从 localStorage 恢复设置
    const loadSettingsFromLocalStorage = () => {
        const storedDepth = localStorage.getItem('formParentSearchDepth');
        if (storedDepth) formParentSearchDepth = parseInt(storedDepth, 10);

        const storedSingleInputMode = localStorage.getItem('singleInputMode');
        if (storedSingleInputMode !== null) singleInputMode = JSON.parse(storedSingleInputMode);

        //const storedPosition = localStorage.getItem('settingsPosition');
        //if (storedPosition) settingsPosition = JSON.parse(storedPosition);

        const storedShowSuggestions = localStorage.getItem('showSuggestionsContainer');
        if (storedShowSuggestions !== null) showSuggestionsContainer = JSON.parse(storedShowSuggestions);

        // 恢复设置到界面上
        const stepsInput = document.getElementById('form-steps');
        if (stepsInput) stepsInput.value = formParentSearchDepth;

        const singleInputCheckbox = document.getElementById('single-input-mode');
        if (singleInputCheckbox) singleInputCheckbox.checked = singleInputMode;

        const showSuggestionsCheckbox = document.getElementById('show-suggestions-toggle');
        if (showSuggestionsCheckbox) showSuggestionsCheckbox.checked = showSuggestionsContainer;
    };

    // 保存设置到 localStorage
    const saveSettingsToLocalStorage = () => {
        localStorage.setItem('formParentSearchDepth', formParentSearchDepth);
        localStorage.setItem('singleInputMode', JSON.stringify(singleInputMode));
        localStorage.setItem('settingsPosition', JSON.stringify(settingsPosition));
    };


    // Create and append suggestions container
    const createSuggestionsContainer = () => {
        const container = document.createElement('div');
        container.id = 'ai-suggestions-container';
        container.style.cssText = `
        position: fixed;
        right: 20px;
        top: 20px;
        background: rgba(255, 255, 255, 0.4);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(200, 200, 200, 0.5);
        border-radius: 10px;
        padding: 10px;
        max-width: 300px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 2147483647;
        display: none;
        font-family: sans-serif;
        transition: all 0.5s ease-in-out;
    `;

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

        // 🤖 作为 logo
        const logo = document.createElement('span');
        logo.textContent = '🤖';
        logo.style.cssText = `
        font-size: 20px;
        margin-right: 5px;
    `;

        const titleText = document.createElement('span');
        titleText.textContent = 'AI Suggestions';
        titleText.style.color = 'black';

        const closeBtn = document.createElement('span');
closeBtn.textContent = '❌';
closeBtn.style.cssText = `
    background: linear-gradient(145deg, #c0c0c0, #a0a0a0);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    text-shadow: 1px 1px 1px rgba(255,255,255,0.5), -1px -1px 1px rgba(0,0,0,0.3);
    cursor: pointer;
    font-size: 18px;
    display: inline-block;
`;
        closeBtn.onclick = () => {
            // 添加动画效果：渐隐并缩小
            container.style.transition = 'opacity 0.3s ease, transform 0.3s ease'; // 定义过渡效果
            container.style.opacity = '0'; // 渐隐
            container.style.transform = 'scale(0.95)'; // 缩小

            // 动画完成后，设置 container 的 display 为 none
            setTimeout(() => {
                container.style.display = 'none';
            }, 300); // 等待动画完成后再隐藏元素
        };
        const settingBtn = document.createElement('span');
        settingBtn.textContent = '⚙️';
        settingBtn.style.cssText = `
        cursor: pointer;
        font-size: 18px;
        font-weight: bold;
    `;
        settingBtn.onclick = () => {
            showSuggestionsContainer = !showSuggestionsContainer;  // 切换布尔值
            const suggestionsContainer = document.getElementById('ai-settings-container') || createSettingsMenu();
            if (suggestionsContainer) {
                suggestionsContainer.style.opacity = '1';
                suggestionsContainer.style.visibility = 'visible';
                suggestionsContainer.style.display = showSuggestionsContainer ? 'block' : 'none';
            }
            saveSettingsToLocalStorage();  // 保存状态到 localStorage
        };
        /// ⚙️ 设置

        const titleLeft = document.createElement('div');
        titleLeft.style.cssText = 'display: flex; align-items: center;';
        titleLeft.appendChild(logo);
        titleLeft.appendChild(titleText);
        title.appendChild(titleLeft);

        const titleRight = document.createElement('div');
        titleRight.style.cssText = 'display: flex; align-items: center;';
        titleRight.appendChild(settingBtn);
        titleRight.appendChild(closeBtn);
        title.appendChild(titleRight);

        container.appendChild(title);

        const suggestionsList = document.createElement('ul');
        suggestionsList.id = 'ai-suggestions-list';
        suggestionsList.style.cssText = `
        list-style: none;
        padding: 0;
        margin: 0;
    `;

        container.appendChild(suggestionsList);
        document.body.appendChild(container);

        return container;
    };

    // 拖拽功能
    const makeDraggable = (element) => {
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        element.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - element.offsetLeft;
            offsetY = e.clientY - element.offsetTop;
            element.style.cursor = 'move';
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                element.style.left = e.clientX - offsetX + 'px';
                element.style.top = e.clientY - offsetY + 'px';
                element.style.right = 'auto';
                element.style.bottom = 'auto';
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            element.style.cursor = 'default';
            // 保存拖拽位置
            settingsPosition = { top: element.offsetTop, right: window.innerWidth - element.offsetLeft - element.offsetWidth };
            saveSettingsToLocalStorage();
        });
    };

    // Create settings menu
    // 创建可拖拽的设置菜单
    const createSettingsMenu = (e = null) => {
        //if (window.top !== window.self) {
        //    console.log('脚本运行在 iframe，跳过执行');
        //    return;
        //}
        if (!showSuggestionsContainer) {
            return;
        }

        // 初始化 chatContext 变量，如果之前没有定义
        if (typeof chatContext === 'undefined') {
            window.chatContext = localStorage.getItem('aiAssistant_chatContext') || '';
        }

        // 创建样式
        const style = document.createElement('style');
        style.textContent = `
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

        .settings-row:hover {
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

        /* Custom checkbox */
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

        input:checked + .checkmark {
            background-color: rgba(33, 150, 243, 0.7);
            box-shadow: inset 0 0 10px rgba(0, 120, 255, 0.2);
        }

        input:checked + .checkmark:before {
            transform: translateX(22px);
        }

        /* Custom number input */
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

        /* 文本输入框样式 */
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
        }

        .custom-text:focus {
            outline: none;
            background-color: rgba(255, 255, 255, 0.7);
            border-color: rgba(52, 152, 219, 0.8);
            box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.15);
        }

        /* 状态指示器 */
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

        .status-indicator.show {
            transform: translateY(0);
            opacity: 1;
        }
    `;
        document.head.appendChild(style);

        // 创建设置容器
        const settingsContainer = document.createElement('div');
        settingsContainer.id = 'ai-settings-container';

        // 创建切换按钮
        const toggleButton = document.createElement('button');
        toggleButton.id = 'ai-settings-toggle';
        toggleButton.innerHTML = '<span>自动填写助手设置</span><span>⚙️</span>';

        // 创建设置面板
        const settingsPanel = document.createElement('div');
        settingsPanel.id = 'ai-settings-panel';
        settingsPanel.style.display = 'none';

        // 单输入框模式设置
        const singleInputRow = document.createElement('div');
        singleInputRow.className = 'settings-row';

        const singleInputLabel = document.createElement('label');
        singleInputLabel.className = 'settings-label';
        singleInputLabel.textContent = '单输入框模式';
        singleInputLabel.htmlFor = 'single-input-mode';

        const customCheckbox = document.createElement('label');
        customCheckbox.className = 'custom-checkbox';

        const singleInputCheckbox = document.createElement('input');
        singleInputCheckbox.type = 'checkbox';
        singleInputCheckbox.id = 'single-input-mode';
        singleInputCheckbox.checked = singleInputMode;

        const checkmark = document.createElement('span');
        checkmark.className = 'checkmark';

        customCheckbox.appendChild(singleInputCheckbox);
        customCheckbox.appendChild(checkmark);

        singleInputRow.appendChild(singleInputLabel);
        singleInputRow.appendChild(customCheckbox);

        // form查找步数设置
        const stepsRow = document.createElement('div');
        stepsRow.className = 'settings-row';

        const stepsLabel = document.createElement('label');
        stepsLabel.className = 'settings-label';
        stepsLabel.textContent = 'Form查找步数';
        stepsLabel.htmlFor = 'form-steps';

        const stepsInput = document.createElement('input');
        stepsInput.type = 'number';
        stepsInput.className = 'custom-number';
        stepsInput.id = 'form-steps';
        stepsInput.value = formParentSearchDepth;
        stepsInput.min = 1;
        stepsInput.max = 10;

        stepsRow.appendChild(stepsLabel);
        stepsRow.appendChild(stepsInput);

        // 聊天上下文设置
        const chatContextRow = document.createElement('div');
        chatContextRow.className = 'settings-row';
        chatContextRow.style.flexDirection = 'column';
        chatContextRow.style.alignItems = 'flex-start';

        const chatContextLabel = document.createElement('label');
        chatContextLabel.className = 'settings-label';
        chatContextLabel.textContent = '聊天上下文';
        chatContextLabel.htmlFor = 'chat-context';
        chatContextLabel.style.marginBottom = '5px';

        const chatContextInput = document.createElement('textarea');
        chatContextInput.className = 'custom-text';
        chatContextInput.id = 'chat-context';
        chatContextInput.rows = 3;
        chatContextInput.value = window.chatContext || '';
        chatContextInput.placeholder = '输入聊天上下文...';

        chatContextRow.appendChild(chatContextLabel);
        chatContextRow.appendChild(chatContextInput);

        // 添加状态指示器
        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'status-indicator';
        statusIndicator.textContent = '设置已保存';
        statusIndicator.style.display = 'none';

        // 添加所有元素到面板
        settingsPanel.appendChild(singleInputRow);
        settingsPanel.appendChild(stepsRow);
        settingsPanel.appendChild(chatContextRow);
        settingsPanel.appendChild(statusIndicator);

        // 组装设置组件
        settingsContainer.appendChild(toggleButton);
        settingsContainer.appendChild(settingsPanel);
        document.body.appendChild(settingsContainer);
        const containerWidth = settingsContainer.offsetWidth;
        const containerHeight = settingsContainer.offsetHeight;
        // 确保不超出视口边界
        var posX = Math.max(10, Math.min(mouseX, window.innerWidth - containerWidth - 10));
        var posY = Math.max(10, Math.min(mouseY, window.innerHeight - containerHeight - 10));

        settingsContainer.style.left = posX - 50 + 'px';
        settingsContainer.style.top = posY - 40 + 'px';
        settingsContainer.style.opacity = '1';
        settingsContainer.style.visibility = 'visible';

        // 切换面板显示
        toggleButton.onclick = () => {
            const isVisible = settingsPanel.style.display !== 'none';
            settingsPanel.style.display = isVisible ? 'none' : 'block';

            // 如果是隐藏面板，并且有设置变化，显示保存提示
            if (isVisible && settingsChanged) {
                showSavedIndicator();
                settingsChanged = false;
            }
        };

        // 设置变化标志
        let settingsChanged = false;

        // 监听设置改变并保存
        singleInputCheckbox.addEventListener('change', () => {
            singleInputMode = singleInputCheckbox.checked;
            saveSettingsToLocalStorage();
            settingsChanged = true;
            showSavedIndicator();
        });

        stepsInput.addEventListener('input', () => {
            formParentSearchDepth = parseInt(stepsInput.value, 10);
            saveSettingsToLocalStorage();
            settingsChanged = true;
            showSavedIndicator();
        });

        chatContextInput.addEventListener('input', () => {
            chatContext = chatContextInput.value;
            localStorage.setItem('aiAssistant_chatContext', chatContextInput.value);
            settingsChanged = true;
            showSavedIndicator();
        });

        // 显示保存指示器
        function showSavedIndicator() {
            statusIndicator.style.display = 'inline-block';
            statusIndicator.textContent = '设置已保存';

            setTimeout(() => {
                statusIndicator.style.display = 'none';
            }, 2000);
        }
        // 在函数顶部声明需要共享的变量
        let hideTimer = null;
        let isMouseInSettings = false;
        // 设置拖拽
        makeDraggable(settingsContainer);
        // 在创建设置容器后添加以下事件监听
        settingsContainer.addEventListener('mouseenter', () => {
            clearTimeout(hideTimer);
            isMouseInSettings = true;
        });

        settingsContainer.addEventListener('mouseleave', (e) => {
            // 检查是否真正离开整个容器
            if (!e.relatedTarget || !settingsContainer.contains(e.relatedTarget)) {
                isMouseInSettings = false;
                hideTimer = setTimeout(() => {
                    if (!isMouseInSettings && settingsPanel.style.display !== 'none') {
                        settingsContainer.style.opacity = '0';
                        settingsContainer.style.display = 'none';
                        // 如果需要隐藏整个容器：settingsContainer.remove();
                    }
                }, 500); // 延迟500毫秒隐藏
            }
        });

        // 扩展保存设置函数，添加chatContext
        const originalSaveSettingsFunc = saveSettingsToLocalStorage || function() {};

    };




    // Initialize settings menu
    const initSettingsMenu = () => {
        createSettingsMenu();
    };
    // Parse response data to extract form field values
    const parseResponse = (responseStr) => {
        try {
            // Clean up the response string to make it valid JSON
            let cleanedStr = responseStr
                .replace(/'/g, '"')  // Replace single quotes with double quotes
                .replace(/，/g, ',')  // Replace Chinese commas with regular commas
                .replace(/：/g, ':')  // Replace Chinese colons with regular colons
                .replace(/\[|\]/g, ''); // Remove brackets

            // Add curly braces if they're missing
            if (!cleanedStr.startsWith('{')) {
                cleanedStr = '{' + cleanedStr + '}';
            }

            // Handle duplicate keys by creating an array-like structure
            const entries = cleanedStr.match(/"([^"]+)"\s*:\s*"([^"]+)"/g) || [];
            const result = [];

            // Group entries by pairs
            const groups = {};
            entries.forEach(entry => {
                const matches = entry.match(/"([^"]+)"\s*:\s*"([^"]+)"/);
                if (matches) {
                    const [, key, value] = matches;
                    if (!groups[key]) {
                        groups[key] = [];
                    }
                    groups[key].push(value);
                }
            });

            // Create suggestion objects
            const keyMap = {};
            Object.keys(groups).forEach(key => {
                groups[key].forEach((value, i) => {
                    if (!result[i]) result[i] = {};
                    result[i][key] = value;

                    // Keep track of which keys are used for sorting later
                    if (!keyMap[key]) keyMap[key] = 0;
                    keyMap[key]++;
                });
            });

            return result;
        } catch (e) {
            console.error('Error parsing AI response:', e);
            return [];
        }
    };

    // Find all input elements in the current form
    // Find all input, textarea, and select elements in the current form
    const findFormInputs = () => {
        const currentElement = document.activeElement;
        // 查找 input、textarea 和 select
        return Array.from(currentElement.querySelectorAll('input, textarea, select'));
    };



    // Fill form fields with selected suggestion
    const fillFormFields = (suggestion) => {
        const inputs = findFormInputs();

        if (inputs.length === 0) {
            console.log('No input fields found to fill');
            return;
        }

        inputs.forEach(input => {
            const fieldName = input.name || input.id || input.placeholder;
            if (!fieldName) return;

            // Find best matching key (case insensitive)
            const matchedKey = Object.keys(suggestion).find(key =>
                                                            key.toLowerCase() === fieldName.toLowerCase()
                                                           );

            if (matchedKey && suggestion[matchedKey]) {
                input.value = suggestion[matchedKey];

                // Trigger input, change, blur events
                ['input', 'change', 'blur'].forEach(eventType => {
                    const event = new Event(eventType, { bubbles: true });
                    input.dispatchEvent(event);
                });
            }
        });
    };

    const showSuggestions = (el) =>{
        el.style.display = 'block';
        el.style.opacity = '0'; // 确保初始状态是隐藏的
        el.style.transform = 'scale(1)'; // 确保没有缩小

        // 强制重绘以重置样式
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                // 设置显示并触发动画
                el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                el.style.opacity = '1'; // 渐显
                el.style.transform = 'scale(1)'; // 恢复正常大小
            });
        });
    };

    // Display suggestions in container
    const displaySuggestions = (suggestions) => {

        const container = document.getElementById('ai-suggestions-container') || createSuggestionsContainer();
        const list = document.getElementById('ai-suggestions-list');
        showSuggestions(container);
        // 清空现有的列表内容
        list.innerHTML = '';

        // 如果没有建议项，显示一个提示
        if (suggestions.length === 0) {
            const noSuggestions = document.createElement('li');
            noSuggestions.textContent = 'No suggestions available';
            noSuggestions.style.padding = '5px';
            list.appendChild(noSuggestions);
        } else {
            // 显示建议项并添加动画效果
            suggestions.forEach((suggestion, index) => {
                const item = document.createElement('li');
                item.style.cssText = `
    padding: 8px;
    margin: 5px 0;
    color: rgba(0, 0, 0, 0.9);
    background-color: rgba(255, 255, 255, 0.4);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, 0.5);
    cursor: pointer;
    opacity: 0; /* 初始透明度为0，隐藏元素 */
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2), inset 0 0 15px rgba(255, 255, 255, 0.3);
    transform: translateY(40px); /* 初始位置稍微偏移 */
    transition: all 0.8s;
 `;

                item.onmouseover = () => {
                    item.style.backdropFilter = 'blur(25px)';
                    item.style.webkitBackdropFilter = 'blur(25px)';
                    item.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.5)';
                    item.style.transform = 'translateY(0px) scale(1.02)';
                    item.style.borderColor = 'rgba(255, 255, 255, 0.7)';
                };

                item.onmouseout = () => {
                    item.style.backdropFilter = 'blur(15px)';
                    item.style.webkitBackdropFilter = 'blur(15px)';
                    item.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2), inset 0 0 15px rgba(255, 255, 255, 0.3)';
                    item.style.transform = 'translateY(0px)';
                    item.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                };

                const summaryText = Object.entries(suggestion)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');

                item.textContent = `Suggestion ${index + 1}: ${summaryText}`;

                // 点击事件：填充表单并复制到剪贴板
                item.onclick = async () => {
                    fillFormFields(suggestion);
                    try {
                        await navigator.clipboard.writeText(summaryText);
                        console.log('Copied to clipboard:', summaryText);
                        showTooltip('已复制到剪贴板');
                    } catch (err) {
                        console.warn('Failed to copy to clipboard:', err);
                        showTooltip('复制失败');
                    }
                    // 添加动画效果：渐隐并缩小
                    container.style.transition = 'opacity 0.3s ease, transform 0.3s ease'; // 定义过渡效果
                    container.style.opacity = '0'; // 渐隐
                    container.style.transform = 'scale(0.95)'; // 缩小

                    // 动画完成后，设置 container 的 display 为 none
                    setTimeout(() => {
                        container.style.display = 'none';
                    }, 300); // 等待动画完成后再隐藏元素
                };

                list.appendChild(item);

                // 使用 setTimeout 创建延迟效果，实现每个项依次渐变显示
                setTimeout(() => {
                    item.style.opacity = '1'; // 渐显
                    item.style.transform = 'translateY(0)'; // 平滑过渡到原位置
                }, index * 100); // 每个列表项延迟 100ms 显示
            });
        }

        // 显示容器并设置其位置
        container.style.display = 'block';
        const currentElement = document.activeElement;
        //if (currentElement) {
        ///   const rect = currentElement.getBoundingClientRect();
        //   container.style.top = rect.bottom + window.scrollY + 10 + 'px';
        //    container.style.left = rect.left + window.scrollX + 'px';
        //}
        //if (getCurrentInputInfo() != null) {
        //    const rect = currentElement.getBoundingClientRect();
        //    container.style.top = rect.bottom + window.scrollY + 10 + 'px';
        ////    container.style.left = rect.left + window.scrollX + 'px';
        //} else{
        //    container.style.top = hisX + window.scrollY + 10 + 'px';
        //    container.style.left = hisY + window.scrollX + 'px';
        //}
        container.style.top = hisX + window.scrollY + 10 + 'px';
        container.style.left = hisY + window.scrollX + 'px';

        // 使用 setTimeout 让容器本身有一个淡入的效果
        setTimeout(() => {
            container.style.opacity = '1'; // 淡入容器
            container.style.transition = 'opacity 0.3s ease'; // 渐变效果
        }, 50); // 延迟 50ms 执行

    };

    // Show floating tooltip message
    const showTooltip = (message) => {
        const tooltip = document.createElement('div');
        tooltip.textContent = message;
        tooltip.style.cssText =`
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(0,0,0,0.7);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        font-size: 14px;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s;
    ;`
        document.body.appendChild(tooltip);

        // Trigger fade-in
        requestAnimationFrame(() => {
            tooltip.style.opacity = '1';
        });

        // Remove after 1 second
        setTimeout(() => {
            tooltip.style.opacity = '0';
            tooltip.addEventListener('transitionend', () => {
                tooltip.remove();
            });
        }, 1000);
    };
    let hisX = 0;
    let hisY = 0;
    // Extract information from current input field
    const getCurrentInputInfo = () => {
        // Simply get the active element
        const currentElement = document.activeElement;

        if (!currentElement || !['INPUT', 'TEXTAREA', 'SELECT'].includes(currentElement.tagName)) {
            console.log('No valid input element focused');
            return null;
        }
        const rect = currentElement.getBoundingClientRect();
        hisX = rect.bottom;
        hisY = rect.left;
        console.log('Current focused element:', currentElement);
        return currentElement;
    };

    // Find parent form based on depth configuration
    const findParentForm = (element) => {
        let current = element;
        let steps = 0;

        while (current && steps < formParentSearchDepth) {
            current = current.parentElement;
            if (!current) break;
            if (current.tagName.toLowerCase() === 'form') {
                return current;
            }
            steps++;
        }

        return current;
    };


    // Fetch suggestions from API
    const fetchSuggestions = () => {
        // Get the active element first
        const currentElement = getCurrentInputInfo();
        if (!currentElement) {
            console.log('No valid input element focused. Cannot fetch suggestions.');
            return;
        }

        console.log('Fetching suggestions for element:', currentElement);

        // Create form data for API request
        const formData = new FormData();
        // formData.append('userInput', currentElement.id || currentElement.name || currentElement.value || 'unknown');
        formData.append('userInput', findParentForm(currentElement).outerHTML);
        formData.append('chatContext', chatContext);

        // Use the configured API server
        const apiUrl = API_SERVER + API_ENDPOINT;

        // Show loading indicator with dynamic dots
        const container = document.getElementById('ai-suggestions-container') || createSuggestionsContainer();
        const list = document.getElementById('ai-suggestions-list');
        list.innerHTML = '<li id="loading-item" style="padding: 5px; color: black;">Loading suggestions</li>';
        container.style.display = 'block';
        showSuggestions(container);
        let dotCount = 0;
        const maxDots = 10;
        const loadingItem = document.getElementById('loading-item');

        const loadingInterval = setInterval(() => {
            dotCount = (dotCount + 1) % (maxDots + 1); // 0 → 1 → 2 → 3 → 0...
            const dots = '.'.repeat(dotCount);
            loadingItem.textContent = `Thinking ${dots} `;
        }, 500);

        // Position near the form
        if (currentElement) {
            const rect = currentElement.getBoundingClientRect();
            container.style.top = rect.bottom + window.scrollY + 10 + 'px';
            container.style.left = rect.left + window.scrollX + 'px';
        } else{
            //container.style.top = hisX + window.scrollY + 10 + 'px';
            //container.style.left = hisY + window.scrollX + 'px';
        }

        // Make API request
        GM_xmlhttpRequest({
            method: 'POST',
            url: apiUrl,
            data: formData,
            headers: {
                'Accept': 'application/json'
            },
            responseType: 'json',
            onload: function(response) {
                console.log(response);
                try {
                    const result = response.response;

                    if (result && result.success && result.data && result.data.response) {
                        const responseData = result.data.response[0];
                        const suggestions = parseResponse(responseData);
                        displaySuggestions(suggestions);
                    } else {
                        displaySuggestions([]);
                    }
                } catch (e) {
                    console.error('Error processing response:', e);
                    displaySuggestions([]);
                }
            },
            onerror: function(error) {
                console.error('Request failed:', error);
                const list = document.getElementById('ai-suggestions-list');
                list.innerHTML = '<li style="padding: 5px; color: red;">Error fetching suggestions</li>';
            }
        });
    };

    // Add keyboard shortcut handler
    document.addEventListener('keydown', function(e) {
        // Check if the shortcut matches the configured keys
        if (e.altKey === SHORTCUT_KEY.altKey && e.key.toLowerCase() === SHORTCUT_KEY.key) {
            e.preventDefault();
            console.log('Shortcut pressed, current element:', document.activeElement);
            fetchSuggestions();
        }
    });

    // Initialize on page load
    const init = () => {
        console.log('Form Autofill Helper initialized. Press Alt+A to get suggestions.');
        loadSettingsFromLocalStorage();
        createSuggestionsContainer();
        // initSettingsMenu();
    };

    // Run initialization when page is fully loaded
    if (document.readyState === 'complete') {

        init();
    } else {
        window.addEventListener('load', init);
    }
})();