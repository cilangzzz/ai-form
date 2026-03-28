/**
 * SettingsPanel Component - 设置面板
 * 提取自 UIManager createSettingsMenu 相关代码
 */

import Styles from '../styles/Styles.js';

class SettingsPanel {
    constructor(config, state, utils) {
        this.config = config;
        this.state = state;
        this.utils = utils;
        this.container = null;
        this.statusIndicator = null;
    }

    /**
     * 创建设置菜单
     * @returns {HTMLElement} 设置容器元素
     */
    create() {
        if (this.container) {
            return this.container;
        }

        // 添加样式
        this.injectStyles();

        // 创建容器
        const container = document.createElement('div');
        container.id = 'ai-settings-container';
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-label', 'AI Form Settings');

        // 创建切换按钮
        const toggleButton = this.createToggleButton();
        container.appendChild(toggleButton);

        // 创建设置面板
        const settingsPanel = document.createElement('div');
        settingsPanel.id = 'ai-settings-panel';
        settingsPanel.style.display = 'none';

        // 添加设置项
        settingsPanel.appendChild(this.createSingleInputRow());
        settingsPanel.appendChild(this.createStepsRow());
        settingsPanel.appendChild(this.createApiServerRow());
        settingsPanel.appendChild(this.createTimeoutRow());
        settingsPanel.appendChild(this.createChatContextRow());

        // 状态指示器
        this.statusIndicator = document.createElement('div');
        this.statusIndicator.className = 'status-indicator';
        this.statusIndicator.textContent = 'Settings saved';
        this.statusIndicator.style.display = 'none';
        settingsPanel.appendChild(this.statusIndicator);

        container.appendChild(settingsPanel);
        document.body.appendChild(container);

        // 设置初始位置
        this.setInitialPosition(container);

        // 初始化拖拽
        this.makeDraggable(container);

        // 绑定事件
        this.bindEvents(container, toggleButton, settingsPanel);

        this.container = container;
        return container;
    }

    /**
     * 注入样式
     */
    injectStyles() {
        const style = document.createElement('style');
        style.textContent = Styles.getSettingsStyles();
        document.head.appendChild(style);
    }

    /**
     * 创建切换按钮
     * @returns {HTMLElement}
     */
    createToggleButton() {
        const toggleButton = document.createElement('button');
        toggleButton.id = 'ai-settings-toggle';
        toggleButton.innerHTML = '<span>Auto-fill Assistant Settings</span><span aria-hidden="true">\u2699\uFE0F</span>';
        return toggleButton;
    }

    /**
     * 创建单输入框模式设置行
     * @returns {HTMLElement}
     */
    createSingleInputRow() {
        return this.createSettingsRow(
            'Single Input Mode',
            'single-input-mode',
            'checkbox',
            this.config.form.singleInputMode
        );
    }

    /**
     * 创建表单搜索深度设置行
     * @returns {HTMLElement}
     */
    createStepsRow() {
        return this.createSettingsRow(
            'Form Search Depth',
            'form-steps',
            'number',
            this.config.form.parentSearchDepth,
            { min: 1, max: 10 }
        );
    }

    /**
     * 创建API服务器设置行
     * @returns {HTMLElement}
     */
    createApiServerRow() {
        const row = this.createSettingsRow(
            'API Server',
            'api-server',
            'text',
            this.config.api.server
        );
        row.classList.add('api-config-row');
        return row;
    }

    /**
     * 创建超时设置行
     * @returns {HTMLElement}
     */
    createTimeoutRow() {
        return this.createSettingsRow(
            'Timeout (ms)',
            'api-timeout',
            'number',
            this.config.api.timeout,
            { min: 5000, max: 60000 }
        );
    }

    /**
     * 创建聊天上下文设置行
     * @returns {HTMLElement}
     */
    createChatContextRow() {
        const row = document.createElement('div');
        row.className = 'settings-row';
        row.style.flexDirection = 'column';
        row.style.alignItems = 'flex-start';

        const label = document.createElement('label');
        label.className = 'settings-label';
        label.textContent = 'Chat Context';
        label.htmlFor = 'chat-context';
        label.style.marginBottom = '5px';

        const input = document.createElement('textarea');
        input.className = 'custom-text';
        input.id = 'chat-context';
        input.rows = 3;
        input.value = this.state.chatContext || '';
        input.placeholder = 'Enter chat context...';

        row.appendChild(label);
        row.appendChild(input);
        return row;
    }

    /**
     * 创建设置行
     * @param {string} labelText - 标签文本
     * @param {string} inputId - 输入ID
     * @param {string} type - 输入类型
     * @param {*} value - 当前值
     * @param {Object} options - 附加选项
     * @returns {HTMLElement}
     */
    createSettingsRow(labelText, inputId, type, value, options = {}) {
        const row = document.createElement('div');
        row.className = 'settings-row';

        const label = document.createElement('label');
        label.className = 'settings-label';
        label.textContent = labelText;
        label.htmlFor = inputId;

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
            row.appendChild(label);
            row.appendChild(checkboxWrapper);
        } else if (type === 'number') {
            input = document.createElement('input');
            input.type = 'number';
            input.className = 'custom-number';
            input.id = inputId;
            input.value = value;
            if (options.min !== undefined) input.min = options.min;
            if (options.max !== undefined) input.max = options.max;

            row.appendChild(label);
            row.appendChild(input);
        } else {
            input = document.createElement('input');
            input.type = 'text';
            input.className = 'custom-text';
            input.id = inputId;
            input.value = value;

            row.appendChild(label);
            row.appendChild(input);
        }

        return row;
    }

    /**
     * 设置初始位置
     * @param {HTMLElement} container
     */
    setInitialPosition(container) {
        const posX = this.state.mouseX - 50;
        const posY = this.state.mouseY - 40;
        container.style.left = `${posX}px`;
        container.style.top = `${posY}px`;
        container.style.opacity = '1';
        container.style.visibility = 'visible';
    }

    /**
     * 绑定事件
     * @param {HTMLElement} container
     * @param {HTMLElement} toggleButton
     * @param {HTMLElement} settingsPanel
     */
    bindEvents(container, toggleButton, settingsPanel) {
        let settingsChanged = false;

        // 切换按钮事件
        toggleButton.addEventListener('click', () => {
            const isVisible = settingsPanel.style.display !== 'none';
            settingsPanel.style.display = isVisible ? 'none' : 'block';

            if (isVisible && settingsChanged) {
                this.showStatus('Settings saved');
                settingsChanged = false;
            }
        });

        // 单输入框模式
        const singleInputCheckbox = container.querySelector('#single-input-mode');
        if (singleInputCheckbox) {
            singleInputCheckbox.addEventListener('change', () => {
                this.config.form.singleInputMode = singleInputCheckbox.checked;
                this.config.save();
                settingsChanged = true;
                this.showStatus('Settings saved');
            });
        }

        // 表单搜索深度
        const stepsInput = container.querySelector('#form-steps');
        if (stepsInput) {
            stepsInput.addEventListener('input', this.utils.debounce(() => {
                this.config.form.parentSearchDepth = parseInt(stepsInput.value, 10) || 4;
                this.config.save();
                settingsChanged = true;
                this.showStatus('Settings saved');
            }, this.config.ui.debounceDelay));
        }

        // API服务器
        const apiServerInput = container.querySelector('#api-server');
        if (apiServerInput) {
            apiServerInput.addEventListener('input', this.utils.debounce(() => {
                const value = apiServerInput.value.trim();
                if (value) {
                    this.config.api.server = value;
                    if (typeof GM_setValue !== 'undefined') {
                        GM_setValue('apiServer', value);
                    }
                    settingsChanged = true;
                    this.showStatus('Settings saved');
                }
            }, this.config.ui.debounceDelay));
        }

        // 超时设置
        const timeoutInput = container.querySelector('#api-timeout');
        if (timeoutInput) {
            timeoutInput.addEventListener('input', this.utils.debounce(() => {
                this.config.api.timeout = parseInt(timeoutInput.value, 10) || 30000;
                if (typeof GM_setValue !== 'undefined') {
                    GM_setValue('apiTimeout', this.config.api.timeout);
                }
                settingsChanged = true;
                this.showStatus('Settings saved');
            }, this.config.ui.debounceDelay));
        }

        // 聊天上下文
        const chatContextInput = container.querySelector('#chat-context');
        if (chatContextInput) {
            chatContextInput.addEventListener('input', this.utils.debounce(() => {
                this.state.chatContext = chatContextInput.value;
                localStorage.setItem('aiAssistant_chatContext', chatContextInput.value);
                settingsChanged = true;
                this.showStatus('Settings saved');
            }, this.config.ui.debounceDelay));
        }

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
    }

    /**
     * 显示状态指示
     * @param {string} message
     * @param {boolean} isError
     */
    showStatus(message, isError = false) {
        if (!this.statusIndicator) return;

        this.statusIndicator.textContent = message;
        this.statusIndicator.style.display = 'inline-block';

        if (isError) {
            this.statusIndicator.classList.add('error');
        } else {
            this.statusIndicator.classList.remove('error');
        }

        setTimeout(() => {
            this.statusIndicator.style.display = 'none';
        }, 2000);
    }

    /**
     * 实现拖拽功能
     * @param {HTMLElement} element
     */
    makeDraggable(element) {
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initialLeft = 0;
        let initialTop = 0;
        let rafId = null;
        let pendingX = 0;
        let pendingY = 0;

        const hasTouchSupport = 'ontouchstart' in window;

        const getElementPosition = () => {
            const style = window.getComputedStyle(element);
            return {
                left: parseFloat(style.left) || element.offsetLeft || 0,
                top: parseFloat(style.top) || element.offsetTop || 0
            };
        };

        const clampPosition = (left, top) => {
            const rect = element.getBoundingClientRect();
            const maxX = window.innerWidth - rect.width;
            const maxY = window.innerHeight - rect.height;
            return {
                left: Math.max(0, Math.min(left, maxX)),
                top: Math.max(0, Math.min(top, maxY))
            };
        };

        const handleDragStart = (clientX, clientY) => {
            const activeElement = document.activeElement;
            if (activeElement && ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(activeElement.tagName)) {
                return;
            }

            isDragging = true;
            startX = clientX;
            startY = clientY;

            const pos = getElementPosition();
            initialLeft = pos.left;
            initialTop = pos.top;

            element.style.cursor = 'grabbing';
            element.style.userSelect = 'none';
            element.style.willChange = 'transform';
            element.classList.add('dragging');

            document.body.style.userSelect = 'none';
        };

        const handleDragMove = (clientX, clientY) => {
            if (!isDragging) return;

            pendingX = clientX - startX;
            pendingY = clientY - startY;

            if (rafId === null) {
                rafId = requestAnimationFrame(() => {
                    if (!isDragging) return;
                    element.style.transform = `translate(${pendingX}px, ${pendingY}px)`;
                    rafId = null;
                });
            }
        };

        const handleDragEnd = () => {
            if (!isDragging) return;

            isDragging = false;

            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }

            const newLeft = initialLeft + pendingX;
            const newTop = initialTop + pendingY;
            const clampedPos = clampPosition(newLeft, newTop);

            element.style.transform = '';
            element.style.willChange = 'transform, opacity';
            element.style.left = `${clampedPos.left}px`;
            element.style.top = `${clampedPos.top}px`;
            element.style.right = 'auto';
            element.style.bottom = 'auto';
            element.style.cursor = '';
            element.style.userSelect = '';
            element.classList.remove('dragging');

            document.body.style.userSelect = '';

            this.config.ui.position = {
                top: clampedPos.top,
                right: window.innerWidth - clampedPos.left - element.offsetWidth
            };
            this.config.save();

            pendingX = 0;
            pendingY = 0;
        };

        element.addEventListener('mousedown', (e) => {
            if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(e.target.tagName)) {
                return;
            }
            e.preventDefault();
            handleDragStart(e.clientX, e.clientY);
        });

        document.addEventListener('mousemove', (e) => handleDragMove(e.clientX, e.clientY));
        document.addEventListener('mouseup', handleDragEnd);

        if (hasTouchSupport) {
            element.addEventListener('touchstart', (e) => {
                if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(e.target.tagName)) {
                    return;
                }
                const touch = e.touches[0];
                handleDragStart(touch.clientX, touch.clientY);
            }, { passive: true });

            document.addEventListener('touchmove', (e) => {
                if (!isDragging) return;
                const touch = e.touches[0];
                handleDragMove(touch.clientX, touch.clientY);
            }, { passive: true });

            document.addEventListener('touchend', handleDragEnd);
            document.addEventListener('touchcancel', handleDragEnd);
        }

        // 添加拖拽样式
        if (!document.getElementById('ai-drag-style')) {
            const dragStyle = document.createElement('style');
            dragStyle.id = 'ai-drag-style';
            dragStyle.textContent = `
                #ai-settings-container.dragging {
                    transition: none !important;
                    pointer-events: none;
                }
                #ai-settings-container.dragging * {
                    pointer-events: none !important;
                }
            `;
            document.head.appendChild(dragStyle);
        }
    }

    /**
     * 显示设置面板
     */
    show() {
        if (!this.container) {
            this.create();
        }
        this.container.style.display = 'block';
        this.container.style.opacity = '1';
    }

    /**
     * 隐藏设置面板
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    /**
     * 切换显示状态
     */
    toggle() {
        if (this.container) {
            const isVisible = this.container.style.display !== 'none';
            if (isVisible) {
                this.hide();
            } else {
                this.show();
            }
        } else {
            this.show();
        }
    }

    /**
     * 获取容器元素
     * @returns {HTMLElement|null}
     */
    getContainer() {
        return this.container;
    }
}

export default SettingsPanel;