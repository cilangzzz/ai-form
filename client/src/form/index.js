/**
 * Form Module Index
 * 导出所有表单相关模块
 */

export { FormDataExtractor, createFormDataExtractor } from './FormDataExtractor.js';
export { FormFiller, createFormFiller } from './FormFiller.js';

// 导出适配器
export { BaseAdapter } from './adapters/BaseAdapter.js';
export { VanillaAdapter } from './adapters/VanillaAdapter.js';
export { VueAdapter } from './adapters/VueAdapter.js';
export { ReactAdapter } from './adapters/ReactAdapter.js';
export { AdapterRegistry, createAdapterRegistry } from './adapters/AdapterRegistry.js';

export default {
    FormDataExtractor,
    FormFiller,
    BaseAdapter,
    VanillaAdapter,
    VueAdapter,
    ReactAdapter,
    AdapterRegistry,
    createFormDataExtractor,
    createFormFiller,
    createAdapterRegistry
};