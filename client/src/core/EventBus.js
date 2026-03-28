/**
 * EventBus.js - 事件总线模块
 * 提供模块间通信的事件发布/订阅机制
 */

/**
 * 事件常量定义
 */
export const Events = {
    // 表单检测事件
    FORM_DETECTED: 'form:detected',
    FORM_FIELD_FOCUS: 'form:field:focus',
    FORM_FIELD_BLUR: 'form:field:blur',

    // API 请求事件
    API_REQUEST_START: 'api:request:start',
    API_REQUEST_SUCCESS: 'api:request:success',
    API_REQUEST_ERROR: 'api:request:error',
    API_REQUEST_TIMEOUT: 'api:request:timeout',
    API_REQUEST_RETRY: 'api:request:retry',
    API_REQUEST_CANCEL: 'api:request:cancel',

    // UI 事件
    UI_SUGGESTION_SHOW: 'ui:suggestion:show',
    UI_SUGGESTION_HIDE: 'ui:suggestion:hide',
    UI_SUGGESTION_SELECT: 'ui:suggestion:select',
    UI_SETTINGS_SHOW: 'ui:settings:show',
    UI_SETTINGS_HIDE: 'ui:settings:hide',
    UI_SETTINGS_CHANGE: 'ui:settings:change',
    UI_TOOLTIP_SHOW: 'ui:tooltip:show',

    // 配置事件
    CONFIG_LOAD: 'config:load',
    CONFIG_SAVE: 'config:save',
    CONFIG_CHANGE: 'config:change',

    // 表单填充事件
    FORM_FILL_START: 'form:fill:start',
    FORM_FILL_COMPLETE: 'form:fill:complete',
    FORM_FILL_ERROR: 'form:fill:error',

    // 状态事件
    STATE_MOUSE_MOVE: 'state:mouse:move',
    STATE_RESET: 'state:reset'
};

/**
 * EventBus 类
 * 提供事件的订阅、发布、取消订阅功能
 */
class EventBus {
    constructor() {
        this._events = new Map();
        this._onceEvents = new Map();
    }

    /**
     * 订阅事件
     * @param {string} event - 事件名称
     * @param {Function} handler - 事件处理函数
     * @returns {EventBus} 返回实例以支持链式调用
     */
    on(event, handler) {
        if (!this._events.has(event)) {
            this._events.set(event, []);
        }
        this._events.get(event).push(handler);
        return this;
    }

    /**
     * 取消订阅事件
     * @param {string} event - 事件名称
     * @param {Function} handler - 事件处理函数（可选，不传则取消该事件所有订阅）
     * @returns {EventBus} 返回实例以支持链式调用
     */
    off(event, handler) {
        if (!this._events.has(event)) {
            return this;
        }

        if (!handler) {
            // 取消该事件的所有订阅
            this._events.delete(event);
        } else {
            // 取消特定处理函数的订阅
            const handlers = this._events.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
            // 如果没有订阅者了，删除事件
            if (handlers.length === 0) {
                this._events.delete(event);
            }
        }
        return this;
    }

    /**
     * 发布事件
     * @param {string} event - 事件名称
     * @param {*} data - 事件数据
     * @returns {EventBus} 返回实例以支持链式调用
     */
    emit(event, data) {
        // 触发普通订阅
        if (this._events.has(event)) {
            const handlers = this._events.get(event);
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`EventBus: Error in handler for event "${event}":`, error);
                }
            });
        }

        // 触发一次性订阅
        if (this._onceEvents.has(event)) {
            const handlers = this._onceEvents.get(event);
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`EventBus: Error in once handler for event "${event}":`, error);
                }
            });
            // 触发后删除一次性订阅
            this._onceEvents.delete(event);
        }

        return this;
    }

    /**
     * 订阅一次性事件（只触发一次后自动取消）
     * @param {string} event - 事件名称
     * @param {Function} handler - 事件处理函数
     * @returns {EventBus} 返回实例以支持链式调用
     */
    once(event, handler) {
        if (!this._onceEvents.has(event)) {
            this._onceEvents.set(event, []);
        }
        this._onceEvents.get(event).push(handler);
        return this;
    }

    /**
     * 检查事件是否有订阅者
     * @param {string} event - 事件名称
     * @returns {boolean} 是否有订阅者
     */
    hasListeners(event) {
        return (this._events.has(event) && this._events.get(event).length > 0) ||
               (this._onceEvents.has(event) && this._onceEvents.get(event).length > 0);
    }

    /**
     * 获取事件的订阅者数量
     * @param {string} event - 事件名称
     * @returns {number} 订阅者数量
     */
    listenerCount(event) {
        const normalCount = this._events.has(event) ? this._events.get(event).length : 0;
        const onceCount = this._onceEvents.has(event) ? this._onceEvents.get(event).length : 0;
        return normalCount + onceCount;
    }

    /**
     * 清除所有事件订阅
     * @returns {EventBus} 返回实例以支持链式调用
     */
    clear() {
        this._events.clear();
        this._onceEvents.clear();
        return this;
    }
}

// 创建全局单例实例
const eventBus = new EventBus();

export default eventBus;
export { EventBus };