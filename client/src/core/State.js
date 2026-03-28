/**
 * State.js - 状态管理模块
 * 管理应用程序的运行状态
 */

const State = {
    // 鼠标位置
    mouseX: 0,
    mouseY: 0,

    // 历史位置（用于定位 UI）
    hisX: 0,
    hisY: 0,

    // 聊天上下文
    chatContext: localStorage.getItem('aiAssistant_chatContext') || '',

    // API 请求状态
    currentRetryCount: 0,
    isRequestPending: false,
    abortController: null,

    /**
     * 重置请求状态
     */
    resetRequestState() {
        this.currentRetryCount = 0;
        this.isRequestPending = false;
        this.abortController = null;
    },

    /**
     * 开始请求
     */
    startRequest() {
        this.isRequestPending = true;
        this.currentRetryCount = 0;
    },

    /**
     * 结束请求
     */
    endRequest() {
        this.isRequestPending = false;
        this.currentRetryCount = 0;
    },

    /**
     * 增加重试计数
     * @returns {number} 当前重试次数
     */
    incrementRetry() {
        this.currentRetryCount++;
        return this.currentRetryCount;
    },

    /**
     * 更新聊天上下文
     * @param {string} context - 新的聊天上下文
     */
    setChatContext(context) {
        this.chatContext = context;
        localStorage.setItem('aiAssistant_chatContext', context);
    },

    /**
     * 更新鼠标位置
     * @param {number} x - X 坐标
     * @param {number} y - Y 坐标
     */
    updateMousePosition(x, y) {
        this.mouseX = x;
        this.mouseY = y;
    },

    /**
     * 更新历史位置（用于 UI 定位）
     * @param {number} x - X 坐标
     * @param {number} y - Y 坐标
     */
    updateHistoryPosition(x, y) {
        this.hisX = x;
        this.hisY = y;
    }
};

export default State;