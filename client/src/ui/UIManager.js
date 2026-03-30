/**
 * UIManager - UI协调器
 * 提取自 ai表单-0.1.user.js 第788-1615行
 * 负责协调 SuggestionsContainer、SettingsPanel、LoadingIndicator 等组件
 */

import Styles from './styles/Styles.js';
import SuggestionsContainer from './components/SuggestionsContainer.js';
import SettingsPanel from './components/SettingsPanel.js';
import LoadingIndicator from './components/LoadingIndicator.js';
import Clipboard from '../core/Clipboard.js';

class UIManager {
    constructor(config, state, utils) {
        this.config = config;
        this.state = state;
        this.utils = utils;

        // 组件实例
        this.suggestionsContainer = new SuggestionsContainer();
        this.settingsPanel = null; // 延迟初始化，需要传入 config, state, utils
        this.loadingIndicator = null;
    }

    /**
     * 初始化设置面板组件
     */
    initSettingsPanel() {
        if (!this.settingsPanel) {
            this.settingsPanel = new SettingsPanel(this.config, this.state, this.utils);
        }
    }

    /**
     * 创建建议容器
     * @returns {HTMLElement}
     */
    createSuggestionsContainer() {
        const container = this.suggestionsContainer.create();

        // 添加键盘导航
        this.setupKeyboardNavigation(container);

        // 初始化加载指示器
        this.loadingIndicator = new LoadingIndicator(this.suggestionsContainer.getList());

        return container;
    }

    /**
     * 显示容器
     * @param {HTMLElement} container
     */
    showContainer(container) {
        container.style.display = 'block';
        container.style.opacity = '0';
        container.style.transform = 'scale(0.98)';

        requestAnimationFrame(() => {
            container.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            container.style.opacity = '1';
            container.style.transform = 'scale(1)';
        });
    }

    /**
     * 隐藏容器
     * @param {HTMLElement} container
     */
    hideContainer(container) {
        container.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        container.style.opacity = '0';
        container.style.transform = 'scale(0.98)';

        setTimeout(() => {
            container.style.display = 'none';
        }, this.config.ui.animationDuration);
    }

    /**
     * 设置键盘导航
     * @param {HTMLElement} container
     */
    setupKeyboardNavigation(container) {
        container.addEventListener('keydown', (e) => {
            const items = container.querySelectorAll('[role="option"]');

            switch(e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.suggestionsContainer.currentFocusIndex = Math.min(
                        this.suggestionsContainer.currentFocusIndex + 1,
                        items.length - 1
                    );
                    this.suggestionsContainer.focusItem(items);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.suggestionsContainer.currentFocusIndex = Math.max(
                        this.suggestionsContainer.currentFocusIndex - 1,
                        0
                    );
                    this.suggestionsContainer.focusItem(items);
                    break;
                case 'Enter':
                    e.preventDefault();
                    const currentIndex = this.suggestionsContainer.currentFocusIndex;
                    if (currentIndex >= 0 && items[currentIndex]) {
                        items[currentIndex].click();
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.hideContainer(container);
                    break;
            }
        });
    }

    /**
     * 显示加载状态
     * @param {HTMLElement} container
     */
    showLoading(container) {
        // 设置位置（在显示之前）
        this.updateContainerPosition(container);

        if (this.loadingIndicator) {
            this.loadingIndicator.show();
        }
        this.showContainer(container);
    }

    /**
     * 更新容器位置到当前状态位置
     * @param {HTMLElement} container
     */
    updateContainerPosition(container) {
        if (!container) return;

        // 清除默认的 right 定位，使用 left 定位
        container.style.right = 'auto';

        // 设置位置（相对于表单元素）
        container.style.top = `${this.state.hisX + window.scrollY + 10}px`;
        container.style.left = `${this.state.hisY + window.scrollX}px`;
    }

    /**
     * 显示错误状态
     * @param {HTMLElement} container
     * @param {string} message
     * @param {Function} retryCallback
     */
    showError(container, message, retryCallback) {
        // 设置位置（在显示之前）
        this.updateContainerPosition(container);

        if (this.loadingIndicator) {
            this.loadingIndicator.showError(message, retryCallback);
        }
        this.showContainer(container);
    }

    /**
     * 显示建议列表
     * @param {Array} suggestions
     * @param {Function} formFiller - 表单填充回调
     */
    displaySuggestions(suggestions, formFiller) {
        const container = this.suggestionsContainer.getContainer() || this.createSuggestionsContainer();

        // 清除加载状态
        if (this.loadingIndicator) {
            this.loadingIndicator.clear();
        }

        // 定义回调函数
        const callbacks = {
            onSelect: async (suggestion, summaryText) => {
                if (formFiller) {
                    formFiller(suggestion);
                }
                const success = await Clipboard.writeText(summaryText);
                if (success) {
                    this.showTooltip('Copied to clipboard');
                } else {
                    console.warn('Copy failed - please copy manually');
                }
                this.hideContainer(container);
            },
            onSettings: () => {
                this.config.ui.showSuggestionsContainer = !this.config.ui.showSuggestionsContainer;
                this.toggleSettings();
                this.config.save();
            },
            onClose: () => {
                this.hideContainer(container);
            }
        };

        this.suggestionsContainer.displaySuggestions(suggestions, callbacks);
        this.showContainer(container);

        // 设置位置
        this.updateContainerPosition(container);
    }

    /**
     * 显示提示框
     * @param {string} message
     */
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
    }

    /**
     * 切换设置面板
     */
    toggleSettings() {
        this.initSettingsPanel();

        if (this.config.ui.showSuggestionsContainer) {
            this.settingsPanel.show();
        } else {
            this.settingsPanel.hide();
        }
    }

    /**
     * 创建设置菜单
     * @returns {HTMLElement}
     */
    createSettingsMenu() {
        this.initSettingsPanel();
        return this.settingsPanel.create();
    }

    /**
     * 获取建议容器
     * @returns {HTMLElement|null}
     */
    getSuggestionContainer() {
        return this.suggestionsContainer.getContainer();
    }

    /**
     * 获取设置容器
     * @returns {HTMLElement|null}
     */
    getSettingsContainer() {
        this.initSettingsPanel();
        return this.settingsPanel.getContainer();
    }
}

export default UIManager;