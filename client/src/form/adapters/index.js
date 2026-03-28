/**
 * Adapters Index File
 * Export all framework adapters for unified access
 */

// Base adapter
export { BaseAdapter } from './BaseAdapter.js';

// Framework adapters
export { VueAdapter } from './VueAdapter.js';
export { ReactAdapter } from './ReactAdapter.js';
export { AngularAdapter } from './AngularAdapter.js';
export { IonicAdapter } from './IonicAdapter.js';
export { SvelteAdapter } from './SvelteAdapter.js';
export { WebComponentsAdapter } from './WebComponentsAdapter.js';
export { VanillaAdapter } from './VanillaAdapter.js';

// Adapter registry (singleton)
export { AdapterRegistry } from './AdapterRegistry.js';

// Import all adapters for registration
import { VueAdapter } from './VueAdapter.js';
import { ReactAdapter } from './ReactAdapter.js';
import { AngularAdapter } from './AngularAdapter.js';
import { IonicAdapter } from './IonicAdapter.js';
import { SvelteAdapter } from './SvelteAdapter.js';
import { WebComponentsAdapter } from './WebComponentsAdapter.js';
import { VanillaAdapter } from './VanillaAdapter.js';
import { AdapterRegistry } from './AdapterRegistry.js';

/**
 * Register all available adapters to the registry
 * @returns {AdapterRegistry}
 */
export function registerAllAdapters() {
    // Clear existing adapters
    AdapterRegistry.clear();

    // Register adapters in priority order (higher priority first)
    // Vue (priority 40)
    AdapterRegistry.register(new VueAdapter());
    // React (priority 35)
    AdapterRegistry.register(new ReactAdapter());
    // Angular (priority 30)
    AdapterRegistry.register(new AngularAdapter());
    // Ionic (priority 28)
    AdapterRegistry.register(new IonicAdapter());
    // Svelte (priority 25)
    AdapterRegistry.register(new SvelteAdapter());
    // WebComponents (priority 20)
    AdapterRegistry.register(new WebComponentsAdapter());
    // Vanilla (priority 0/10) - fallback
    AdapterRegistry.register(new VanillaAdapter());

    // Set Vanilla as default adapter
    AdapterRegistry.setDefaultAdapter(new VanillaAdapter());

    console.log('All adapters registered:', AdapterRegistry.getAdapters());
    return AdapterRegistry;
}

/**
 * Get sorted adapters by priority (highest first)
 * @returns {Array} Sorted array of adapters
 */
export function getSortedAdapters() {
    return AdapterRegistry.getAdapters();
}

/**
 * Detect the first matching framework adapter
 * @param {HTMLElement} element - Element to check (optional)
 * @returns {Object|null} First matching adapter or null
 */
export function detectFramework(element) {
    return AdapterRegistry.getBestAdapter(element);
}

/**
 * Get the best adapter for an element
 * @param {HTMLElement} element - Target element
 * @returns {Object} Best matching adapter
 */
export function getBestAdapter(element) {
    return AdapterRegistry.getBestAdapter(element);
}

/**
 * Create all available adapters instances
 * @returns {Object<string, Object>} Object with adapter name as key
 */
export function createAdapters() {
    return {
        vue: new VueAdapter(),
        react: new ReactAdapter(),
        angular: new AngularAdapter(),
        ionic: new IonicAdapter(),
        svelte: new SvelteAdapter(),
        webcomponents: new WebComponentsAdapter(),
        vanilla: new VanillaAdapter()
    };
}

/**
 * Initialize adapters with auto-registration
 * Call this function to set up all adapters
 */
export function initializeAdapters() {
    return registerAllAdapters();
}

// Auto-register on import (optional, can be disabled)
// registerAllAdapters();