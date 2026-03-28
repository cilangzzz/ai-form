/**
 * SuggestionsContainer Component - 建议列表容器
 * 提取自 UIManager createSuggestionsContainer/displaySuggestions 相关代码
 */

import Styles from '../styles/Styles.js';

class SuggestionsContainer {
    constructor() {
        this.container = null;
        this.list = null;
        this.currentFocusIndex = -1;
    }

    /**
     * 创建建议容器
     * @returns {HTMLElement} 容器元素
     */
    create() {
        if (this.container) {
            return this.container;
        }

        const container = document.createElement('div');
        container.id = 'ai-suggestions-container';
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-label', 'AI Suggestions');
        container.style.cssText = Styles.container.base;

        // 创建标题栏
        const title = this.createTitle();
        container.appendChild(title);

        // 创建建议列表
        const suggestionsList = document.createElement('ul');
        suggestionsList.id = 'ai-suggestions-list';
        suggestionsList.setAttribute('role', 'listbox');
        suggestionsList.style.cssText = 'list-style: none; padding: 0; margin: 0;';
        container.appendChild(suggestionsList);

        document.body.appendChild(container);
        this.container = container;
        this.list = suggestionsList;

        return container;
    }

    /**
     * 创建标题栏
     * @returns {HTMLElement} 标题元素
     */
    createTitle() {
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

        // 设置按钮
        const settingBtn = document.createElement('button');
        settingBtn.textContent = '\u2699\uFE0F';
        settingBtn.setAttribute('aria-label', 'Settings');
        settingBtn.style.cssText = 'cursor: pointer; font-size: 18px; background: none; border: none; padding: 4px;';
        settingBtn.dataset.action = 'settings';

        // 关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '\u2716';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.style.cssText = 'cursor: pointer; font-size: 16px; background: none; border: none; padding: 4px; color: #666;';
        closeBtn.dataset.action = 'close';

        titleRight.appendChild(settingBtn);
        titleRight.appendChild(closeBtn);

        title.appendChild(titleLeft);
        title.appendChild(titleRight);

        return title;
    }

    /**
     * 显示建议列表
     * @param {Array} suggestions - 建议数据数组
     * @param {Object} callbacks - 回调函数集合 {onSelect, onSettings}
     */
    displaySuggestions(suggestions, callbacks = {}) {
        if (!this.list) return;

        this.currentFocusIndex = -1;

        if (suggestions.length === 0) {
            const noSuggestions = document.createElement('li');
            noSuggestions.textContent = 'No suggestions available';
            noSuggestions.style.padding = '5px';
            noSuggestions.setAttribute('role', 'status');
            this.list.appendChild(noSuggestions);
        } else {
            suggestions.forEach((suggestion, index) => {
                const item = this.createSuggestionItem(suggestion, index, callbacks.onSelect);
                this.list.appendChild(item);

                // 延迟显示动画
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, index * 80);
            });
        }

        // 设置按钮事件
        const settingBtn = this.container.querySelector('[data-action="settings"]');
        if (settingBtn && callbacks.onSettings) {
            settingBtn.onclick = callbacks.onSettings;
        }

        const closeBtn = this.container.querySelector('[data-action="close"]');
        if (closeBtn && callbacks.onClose) {
            closeBtn.onclick = callbacks.onClose;
        }

        // 聚焦第一个项目
        const firstItem = this.list.querySelector('[role="option"]');
        if (firstItem) {
            firstItem.focus();
            this.currentFocusIndex = 0;
            this.focusItem(this.list.querySelectorAll('[role="option"]'));
        }
    }

    /**
     * 创建单个建议项
     * @param {Object} suggestion - 建议数据
     * @param {number} index - 索引
     * @param {Function} onSelect - 选择回调
     * @returns {HTMLElement} 建议项元素
     */
    createSuggestionItem(suggestion, index, onSelect) {
        const item = document.createElement('li');
        item.setAttribute('role', 'option');
        item.setAttribute('tabindex', '0');
        item.style.cssText = Styles.listItem;

        const summaryText = Object.entries(suggestion)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');

        item.textContent = `Suggestion ${index + 1}: ${summaryText}`;

        // 鼠标悬停效果
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
        const handleSelect = () => {
            if (onSelect) {
                onSelect(suggestion, summaryText);
            }
        };

        item.addEventListener('click', handleSelect);
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelect();
            }
        });

        return item;
    }

    /**
     * 设置位置
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     */
    setPosition(x, y) {
        if (!this.container) return;
        this.container.style.top = `${y}px`;
        this.container.style.left = `${x}px`;
    }

    /**
     * 清除列表内容
     */
    clear() {
        if (this.list) {
            this.list.innerHTML = '';
        }
    }

    /**
     * 聚焦项目
     * @param {NodeList} items - 项目列表
     */
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
    }

    /**
     * 获取容器元素
     * @returns {HTMLElement|null}
     */
    getContainer() {
        return this.container;
    }

    /**
     * 获取列表元素
     * @returns {HTMLElement|null}
     */
    getList() {
        return this.list;
    }
}

export default SuggestionsContainer;