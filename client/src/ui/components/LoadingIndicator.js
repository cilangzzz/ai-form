/**
 * LoadingIndicator Component - 加载指示器
 * 提取自 UIManager showLoading/showError 方法
 */

import Styles from '../styles/Styles.js';

class LoadingIndicator {
    constructor(listElement) {
        this.list = listElement;
        this.loadingInterval = null;
    }

    /**
     * 显示加载状态
     */
    show() {
        if (!this.list) return;

        this.list.innerHTML = '';
        const loadingItem = document.createElement('li');
        loadingItem.id = 'loading-item';
        loadingItem.setAttribute('role', 'status');
        loadingItem.setAttribute('aria-live', 'polite');
        loadingItem.style.cssText = Styles.loading;
        loadingItem.textContent = 'Loading suggestions';

        this.list.appendChild(loadingItem);

        // 动态加载动画
        let dotCount = 0;
        const maxDots = 3;
        this.loadingInterval = setInterval(() => {
            dotCount = (dotCount % maxDots) + 1;
            loadingItem.textContent = `Thinking${'.'.repeat(dotCount)}`;
        }, 400);
    }

    /**
     * 显示错误状态
     * @param {string} message - 错误消息
     * @param {Function} retryCallback - 重试回调
     */
    showError(message, retryCallback = null) {
        this.clear();
        if (!this.list) return;

        const errorItem = document.createElement('li');
        errorItem.setAttribute('role', 'alert');
        errorItem.style.cssText = Styles.error;

        const errorSpan = document.createElement('span');
        errorSpan.textContent = message;
        errorItem.appendChild(errorSpan);

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

        this.list.appendChild(errorItem);
    }

    /**
     * 清除加载状态
     */
    clear() {
        if (this.loadingInterval) {
            clearInterval(this.loadingInterval);
            this.loadingInterval = null;
        }
        if (this.list) {
            this.list.innerHTML = '';
        }
    }

    /**
     * 显示无建议状态
     */
    showNoSuggestions() {
        this.clear();
        if (!this.list) return;

        const noSuggestions = document.createElement('li');
        noSuggestions.textContent = 'No suggestions available';
        noSuggestions.style.padding = '5px';
        noSuggestions.setAttribute('role', 'status');
        this.list.appendChild(noSuggestions);
    }
}

export default LoadingIndicator;