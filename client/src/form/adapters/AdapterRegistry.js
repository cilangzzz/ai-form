/**
 * Adapter Registry - 适配器注册中心
 * 管理和选择最适合的表单填充适配器
 * 支持单例模式和实例模式
 */

import { BaseAdapter } from './BaseAdapter.js';

class AdapterRegistryClass {
    constructor() {
        this.adapters = [];
        this.cache = null;
        this.defaultAdapter = null;
    }

    /**
     * 注册适配器
     * @param {BaseAdapter} adapter - 适配器实例
     */
    register(adapter) {
        if (!adapter || typeof adapter.name === 'undefined') {
            throw new Error('Adapter must have a name property');
        }

        // 检查是否已存在同名适配器
        const existing = this.adapters.find(a => a.name === adapter.name);
        if (existing) {
            // 替换已存在的适配器
            this.adapters = this.adapters.map(a =>
                a.name === adapter.name ? adapter : a
            );
            console.log(`Adapter "${adapter.name}" updated`);
        } else {
            this.adapters.push(adapter);
            console.log(`Adapter "${adapter.name}" registered`);
        }

        // 按优先级排序（降序）
        this.adapters.sort((a, b) => {
            const priorityA = a.priority || a.getPriority?.() || 0;
            const priorityB = b.priority || b.getPriority?.() || 0;
            return priorityB - priorityA;
        });

        // 清除缓存
        this.cache = null;
    }

    /**
     * 移除适配器
     * @param {string} name - 适配器名称
     * @returns {boolean} - 是否成功移除
     */
    unregister(name) {
        const index = this.adapters.findIndex(a => a.name === name);
        if (index !== -1) {
            this.adapters.splice(index, 1);
            this.cache = null;
            return true;
        }
        return false;
    }

    /**
     * 设置默认适配器
     * @param {BaseAdapter} adapter - 适配器实例
     */
    setDefaultAdapter(adapter) {
        this.defaultAdapter = adapter;
    }

    /**
     * 获取最佳适配器
     * @param {HTMLElement} element - 用于检测的元素（可选）
     * @returns {BaseAdapter}
     */
    getBestAdapter(element) {
        // 使用缓存
        if (this.cache) {
            return this.cache;
        }

        // 检测并选择最佳适配器
        for (const adapter of this.adapters) {
            try {
                const detected = adapter.detect?.(element);
                if (detected) {
                    this.cache = adapter;
                    console.log(`Selected adapter: ${adapter.name} (priority: ${adapter.priority || 0})`);
                    return adapter;
                }
            } catch (e) {
                console.warn(`Adapter ${adapter.name} detect failed:`, e);
            }
        }

        // 返回默认适配器
        if (this.defaultAdapter) {
            return this.defaultAdapter;
        }

        // 如果没有适配器匹配，返回最后一个（应该是 Vanilla，优先级最低）
        if (this.adapters.length > 0) {
            return this.adapters[this.adapters.length - 1];
        }

        throw new Error('No adapters registered');
    }

    /**
     * 匹配元素到适配器（兼容静态调用方式）
     * @param {HTMLElement} element - 用于检测的元素
     * @returns {BaseAdapter}
     */
    match(element) {
        return this.getBestAdapter(element);
    }

    /**
     * 设置元素值
     * @param {HTMLElement} element - 目标元素
     * @param {string} value - 要设置的值
     * @returns {boolean}
     */
    setValue(element, value) {
        const adapter = this.match(element);
        if (adapter && adapter.setValue) {
            return adapter.setValue(element, value);
        }
        return false;
    }

    /**
     * 获取所有适配器
     * @returns {Array<BaseAdapter>}
     */
    getAdapters() {
        return [...this.adapters];
    }

    /**
     * 获取适配器数量
     * @returns {number}
     */
    getCount() {
        return this.adapters.length;
    }

    /**
     * 检测所有适配器并返回结果
     * @param {HTMLElement} element - 用于检测的元素
     * @returns {Array<{name: string, detected: boolean, priority: number}>}
     */
    detectAll(element) {
        return this.adapters.map(adapter => ({
            name: adapter.name,
            detected: adapter.detect?.(element) || false,
            priority: adapter.priority || 0
        }));
    }

    /**
     * 检测所有框架版本
     * @returns {Object}
     */
    detectFrameworks() {
        const result = {};

        for (const adapter of this.adapters) {
            result[adapter.name] = {
                detected: adapter.detect?.() || false,
                version: adapter.frameworkVersion || adapter.detectVersion?.() || null
            };
        }

        return result;
    }

    /**
     * 清除检测缓存
     */
    clearCache() {
        this.cache = null;
    }

    /**
     * 清空所有适配器
     */
    clear() {
        this.adapters = [];
        this.cache = null;
        this.defaultAdapter = null;
    }

    /**
     * 重置注册中心
     */
    reset() {
        this.clear();
    }

    /**
     * 获取所有适配器（别名）
     * @returns {Array<BaseAdapter>}
     */
    getAllAdapters() {
        return this.getAdapters();
    }
}

// 创建全局单例实例
const AdapterRegistry = new AdapterRegistryClass();

// 导出单例和类
export { AdapterRegistry, AdapterRegistryClass };
export default AdapterRegistry;