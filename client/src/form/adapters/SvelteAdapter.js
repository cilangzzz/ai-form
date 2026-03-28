import BaseAdapter from './BaseAdapter.js';

/**
 * SvelteAdapter - Adapter for Svelte framework
 * Handles detection and value setting for Svelte components
 */
class SvelteAdapter extends BaseAdapter {
    constructor() {
        super();
        this.name = 'svelte';
        this.priority = 25;
        this.frameworkVersion = null;
    }

    /**
     * Detect if Svelte is present on the page
     * Checks for Svelte compiled markers and component instances
     * @returns {boolean|Element} Detection result
     */
    detect() {
        // Check for Svelte compiled markers in class names
        const svelteClassElement = document.querySelector('[class*="svelte"]');
        if (svelteClassElement) {
            return svelteClassElement;
        }

        // Check for Svelte component internal markers
        return this.detectSvelteComponent();
    }

    /**
     * Detect the Svelte framework version
     * @returns {string|null} Detected version or null
     */
    detectVersion() {
        // Try to detect Svelte version through various markers
        // Svelte 3/4 typically don't expose version globally
        // Svelte 5 may have different markers

        if (window.__svelte_version) {
            this.frameworkVersion = window.__svelte_version;
            return this.frameworkVersion;
        }

        // Check for Svelte 5 specific markers
        if (document.querySelector('[data-svelte]')) {
            this.frameworkVersion = '5.x';
            return this.frameworkVersion;
        }

        // Detect from component markers
        const elements = document.querySelectorAll('*');
        for (const el of elements) {
            if (el.$$ && el.$$.$set) {
                // Svelte 3/4 component pattern
                this.frameworkVersion = '3.x/4.x';
                return this.frameworkVersion;
            }
            if (el.__svelte_meta) {
                this.frameworkVersion = '3.x/4.x';
                return this.frameworkVersion;
            }
        }

        return null;
    }

    /**
     * Check if this adapter matches a specific element
     * @param {HTMLElement} element - Target element to match
     * @returns {boolean} True if the element is a Svelte component
     */
    match(element) {
        // Check for Svelte class markers
        if (element.classList && element.className.includes('svelte')) {
            return true;
        }

        // Check for Svelte component markers
        if (element.__svelte_meta || element.__svelte_component) {
            return true;
        }

        // Check for Svelte 5 markers
        if (element.$$ && element.$$.$set) {
            return true;
        }

        return false;
    }

    /**
     * Detect Svelte component instances by checking internal properties
     * @returns {boolean} True if Svelte component found
     */
    detectSvelteComponent() {
        // Check for __svelte_meta or __svelte_component markers
        const elements = document.querySelectorAll('*');
        for (const el of elements) {
            // Svelte 3/4 uses __svelte_meta
            if (el.__svelte_meta || el.__svelte_component) {
                return true;
            }
            // Svelte 5 may use different markers
            if (el.$$ && el.$$.$set) {
                return true;
            }
        }
        return false;
    }

    /**
     * Set value on a Svelte component element
     * Svelte uses native bindings, triggering input event is sufficient
     * @param {Element} element - Target element
     * @param {*} value - Value to set
     */
    setValue(element, value) {
        // Svelte uses native bindings, triggering input event is sufficient
        // Use the native descriptor to bypass any framework overrides
        const nativeDescriptor = Object.getOwnPropertyDescriptor(
            Object.getPrototypeOf(element), 'value'
        );

        if (nativeDescriptor && nativeDescriptor.set) {
            nativeDescriptor.set.call(element, value);
        } else {
            // Fallback to direct assignment
            element.value = value;
        }

        // Dispatch input event to trigger Svelte's binding update
        element.dispatchEvent(new Event('input', { bubbles: true }));

        // Also trigger change event for completeness
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

export default SvelteAdapter;