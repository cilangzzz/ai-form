import BaseAdapter from './BaseAdapter.js';

/**
 * WebComponentsAdapter - Adapter for Web Components
 * Handles detection and value setting for custom elements
 */
class WebComponentsAdapter extends BaseAdapter {
    constructor() {
        super();
        this.name = 'webcomponents';
        this.priority = 20;
        this.frameworkVersion = null;
    }

    /**
     * Detect if Web Components are present on the page
     * Checks for registered custom elements and elements with 'is' attribute
     * @returns {boolean|Element} Detection result
     */
    detect() {
        // Check if there are registered custom elements
        if (window.customElements && window.customElements.size > 0) {
            return true;
        }

        // Check for elements using the 'is' attribute (custom built-in elements)
        const customBuiltInElement = document.querySelector('[is]');
        if (customBuiltInElement) {
            return customBuiltInElement;
        }

        return false;
    }

    /**
     * Detect the Web Components API version/availability
     * @returns {string|null} Detected version or null
     */
    detectVersion() {
        if (!window.customElements) {
            return null;
        }

        // Check for CustomElementRegistry v1 features
        this.frameworkVersion = 'v1';

        // Check for additional v1 features
        if (window.customElements.upgrade) {
            this.frameworkVersion = 'v1-full';
        }

        return this.frameworkVersion;
    }

    /**
     * Check if this adapter matches a specific element
     * @param {HTMLElement} element - Target element to match
     * @returns {boolean} True if the element is a custom element
     */
    match(element) {
        // Check if this is a registered custom element
        if (this.isCustomElement(element)) {
            return true;
        }

        // Check for 'is' attribute (custom built-in element)
        if (element.hasAttribute('is')) {
            return true;
        }

        return false;
    }

    /**
     * Set value on a Web Component element
     * Handles both autonomous custom elements and custom built-in elements
     * @param {Element} element - Target element
     * @param {*} value - Value to set
     */
    setValue(element, value) {
        const tagName = element.tagName.toLowerCase();

        // Check if this is a registered custom element
        const customElementClass = window.customElements?.get(tagName);

        if (customElementClass) {
            // This is an autonomous custom element
            // Check if it has a custom setValue method
            if (typeof element.setValue === 'function') {
                element.setValue(value);
            } else if ('value' in element) {
                // Use standard value property if available
                element.value = value;

                // Dispatch custom change event with detail
                element.dispatchEvent(new CustomEvent('change', {
                    bubbles: true,
                    detail: { value }
                }));
            }
        } else {
            // This might be a custom built-in element (using 'is' attribute)
            // or a regular element, use native value setting
            this.setNativeValue(element, value);
        }
    }

    /**
     * Check if an element is a custom element
     * @param {Element} element - Element to check
     * @returns {boolean} True if element is a custom element
     */
    isCustomElement(element) {
        const tagName = element.tagName.toLowerCase();
        return window.customElements?.get(tagName) !== undefined;
    }

    /**
     * Get list of all registered custom element tag names
     * @returns {string[]} Array of custom element tag names
     */
    getRegisteredCustomElements() {
        if (!window.customElements) {
            return [];
        }

        // Note: There's no direct API to get all registered custom elements
        // This is a workaround by checking elements in the document
        const customTags = new Set();
        const elements = document.querySelectorAll('*');

        for (const el of elements) {
            const tagName = el.tagName.toLowerCase();
            if (window.customElements.get(tagName)) {
                customTags.add(tagName);
            }
        }

        return Array.from(customTags);
    }
}

export default WebComponentsAdapter;