import BaseAdapter from './BaseAdapter.js';
import { AdapterRegistry } from './AdapterRegistry.js';

/**
 * IonicAdapter - Adapter for Ionic/Capacitor framework
 * Handles detection and value setting for Ionic Web Components
 * Delegates to underlying framework adapters (Angular/React/Vue) when needed
 */
class IonicAdapter extends BaseAdapter {
    /**
     * 适配器名称
     * @returns {string}
     */
    get name() {
        return 'ionic';
    }

    /**
     * 适配器优先级
     * @returns {number}
     */
    get priority() {
        return 28;
    }

    constructor() {
        super();
        this.frameworkVersion = null;
        this.underlyingFramework = null;
    }

    /**
     * Detect if Ionic/Capacitor is present on the page
     * Checks for ion-app, Ionic classes, and window.Ionic
     * @returns {boolean|Element} Detection result
     */
    detect() {
        // Check for ion-app element (Ionic's root component)
        const ionApp = document.querySelector('ion-app');
        if (ionApp) {
            return ionApp;
        }

        // Check for Ionic classes
        const ionicClassElement = document.querySelector('[class*="ionic"]');
        if (ionicClassElement) {
            return ionicClassElement;
        }

        // Check for window.Ionic global
        if (window.Ionic) {
            this.frameworkVersion = window.Ionic.version || 'unknown';
            return true;
        }

        // Check for Capacitor
        if (window.Capacitor) {
            this.frameworkVersion = window.Capacitor.version || 'unknown';
            return true;
        }

        // Check for Ionic specific web components
        const ionElement = this.detectIonicComponents();
        if (ionElement) {
            return ionElement;
        }

        return false;
    }

    /**
     * Detect Ionic Web Components in the document
     * @returns {boolean|Element} Detection result
     */
    detectIonicComponents() {
        // Check for common Ionic elements
        const ionSelectors = [
            'ion-input', 'ion-textarea', 'ion-select', 'ion-checkbox',
            'ion-radio', 'ion-toggle', 'ion-range', 'ion-searchbar',
            'ion-datetime', 'ion-item', 'ion-list', 'ion-content',
            'ion-header', 'ion-footer', 'ion-toolbar', 'ion-title',
            'ion-button', 'ion-buttons', 'ion-back-button', 'ion-menu-button'
        ];

        for (const selector of ionSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element;
            }
        }

        return false;
    }

    /**
     * Get Ionic version
     * @returns {string|null} Ionic version string
     */
    detectVersion() {
        if (this.frameworkVersion) {
            return this.frameworkVersion;
        }

        // Try to get version from window.Ionic
        if (window.Ionic && window.Ionic.version) {
            this.frameworkVersion = window.Ionic.version;
            return this.frameworkVersion;
        }

        // Try to get version from Capacitor
        if (window.Capacitor && window.Capacitor.version) {
            this.frameworkVersion = `Capacitor ${window.Capacitor.version}`;
            return this.frameworkVersion;
        }

        return null;
    }

    /**
     * Detect the underlying framework (Angular, React, or Vue)
     * Ionic apps are built on top of these frameworks
     * @returns {string|null} Underlying framework name
     */
    detectUnderlyingFramework() {
        // Check for Angular
        if (document.querySelector('[ng-version]') || window.ng) {
            this.underlyingFramework = 'angular';
            return 'angular';
        }

        // Check for React
        if (window.React || document.querySelector('[data-reactroot]')) {
            this.underlyingFramework = 'react';
            return 'react';
        }

        // Check for Vue
        if (window.Vue || document.querySelector('[data-v-]') ||
            document.querySelector('[__vue__]')) {
            this.underlyingFramework = 'vue';
            return 'vue';
        }

        return null;
    }

    /**
     * Set value on an Ionic element
     * Handles ion-* Web Components and delegates to underlying framework
     * @param {Element} element - Target element
     * @param {*} value - Value to set
     */
    setValue(element, value) {
        const tagName = element.tagName.toUpperCase();

        // Check if this is an Ionic Web Component (ION-* elements)
        if (tagName.startsWith('ION-')) {
            return this.setIonValue(element, value);
        }

        // For non-Ionic elements, delegate to underlying framework adapter
        const frameworkAdapter = this.getFrameworkAdapter();
        if (frameworkAdapter && frameworkAdapter !== this) {
            frameworkAdapter.setValue(element, value);
            console.log(`IonicAdapter: Delegated to ${frameworkAdapter.name} adapter`);
            return true;
        }

        // Fall back to native value setting
        this.setNativeValue(element, value);
        console.log(`IonicAdapter: Set value via native setter`);
        return true;
    }

    /**
     * Set value on Ionic Web Component elements
     * Uses ionChange event for proper Ionic component updates
     * @param {Element} element - Ionic element
     * @param {*} value - Value to set
     */
    setIonValue(element, value) {
        const tagName = element.tagName.toLowerCase();

        // Handle ion-input
        if (tagName === 'ion-input') {
            // Ionic input has a shadow DOM with native input inside
            // Set value directly and trigger ionChange
            element.value = value;

            // Dispatch ionChange event with detail
            element.dispatchEvent(new CustomEvent('ionChange', {
                bubbles: true,
                cancelable: true,
                detail: { value }
            }));

            // Also dispatch ionInput for real-time updates
            element.dispatchEvent(new CustomEvent('ionInput', {
                bubbles: true,
                cancelable: true,
                detail: { value }
            }));

            console.log(`IonicAdapter: Set ion-input value`);
            return true;
        }

        // Handle ion-textarea
        if (tagName === 'ion-textarea') {
            element.value = value;

            element.dispatchEvent(new CustomEvent('ionChange', {
                bubbles: true,
                cancelable: true,
                detail: { value }
            }));

            console.log(`IonicAdapter: Set ion-textarea value`);
            return true;
        }

        // Handle ion-select
        if (tagName === 'ion-select') {
            // For ion-select, we need to set the selected value
            element.value = value;

            element.dispatchEvent(new CustomEvent('ionChange', {
                bubbles: true,
                cancelable: true,
                detail: { value }
            }));

            console.log(`IonicAdapter: Set ion-select value`);
            return true;
        }

        // Handle ion-checkbox, ion-toggle, ion-radio
        if (tagName === 'ion-checkbox' || tagName === 'ion-toggle') {
            // Boolean values
            const boolValue = Boolean(value);
            element.checked = boolValue;

            element.dispatchEvent(new CustomEvent('ionChange', {
                bubbles: true,
                cancelable: true,
                detail: { checked: boolValue, value: boolValue }
            }));

            console.log(`IonicAdapter: Set ${tagName} checked`);
            return true;
        }

        // Handle ion-range
        if (tagName === 'ion-range') {
            const numValue = Number(value);
            element.value = numValue;

            element.dispatchEvent(new CustomEvent('ionChange', {
                bubbles: true,
                cancelable: true,
                detail: { value: numValue }
            }));

            console.log(`IonicAdapter: Set ion-range value`);
            return true;
        }

        // Handle ion-searchbar
        if (tagName === 'ion-searchbar') {
            element.value = value;

            element.dispatchEvent(new CustomEvent('ionChange', {
                bubbles: true,
                cancelable: true,
                detail: { value }
            }));

            element.dispatchEvent(new CustomEvent('ionInput', {
                bubbles: true,
                cancelable: true,
                detail: { value }
            }));

            console.log(`IonicAdapter: Set ion-searchbar value`);
            return true;
        }

        // Handle ion-datetime
        if (tagName === 'ion-datetime') {
            element.value = value;

            element.dispatchEvent(new CustomEvent('ionChange', {
                bubbles: true,
                cancelable: true,
                detail: { value }
            }));

            console.log(`IonicAdapter: Set ion-datetime value`);
            return true;
        }

        // Generic Ionic element handling
        if ('value' in element) {
            element.value = value;

            element.dispatchEvent(new CustomEvent('ionChange', {
                bubbles: true,
                cancelable: true,
                detail: { value }
            }));
        } else {
            // Element doesn't have value property, try native handling
            this.setNativeValue(element, value);
        }

        return true;
    }

    /**
     * Get the underlying framework adapter from registry
     * @returns {BaseAdapter|null} Framework adapter or null
     */
    getFrameworkAdapter() {
        // Detect underlying framework first
        const framework = this.detectUnderlyingFramework();

        if (framework) {
            // Get the appropriate adapter from registry
            const adapters = AdapterRegistry.getAdapters();
            const frameworkAdapter = adapters.find(a => a.name === framework);

            if (frameworkAdapter) {
                return frameworkAdapter;
            }
        }

        // Try to get best adapter from registry
        const bestAdapter = AdapterRegistry.match(document.body);
        if (bestAdapter && bestAdapter !== this && bestAdapter.name !== 'VanillaFallback') {
            return bestAdapter;
        }

        return null;
    }

    /**
     * Get value from an Ionic element
     * @param {Element} element - Target element
     * @returns {*} Element value
     */
    getValue(element) {
        const tagName = element.tagName.toUpperCase();

        if (tagName.startsWith('ION-')) {
            // Ionic elements have different value semantics
            if (tagName === 'ION-CHECKBOX' || tagName === 'ION-TOGGLE') {
                return element.checked;
            }
            if (tagName === 'ION-RANGE') {
                return Number(element.value);
            }
            return element.value;
        }

        return element.value;
    }

    /**
     * Match an element to determine if this adapter should handle it
     * @param {Element} element - Element to check
     * @returns {boolean} True if this adapter should handle the element
     */
    match(element) {
        // Check if element is an Ionic Web Component
        const tagName = element.tagName.toUpperCase();
        if (tagName.startsWith('ION-')) {
            return true;
        }

        // Check if element is inside an Ionic container
        const ionContainer = element.closest('ion-app, ion-content, ion-item');
        if (ionContainer) {
            return true;
        }

        // Check for Ionic-specific attributes
        if (element.hasAttribute('ion-') || element.classList.contains('ionic') || element.getAttributeNames().some(attr => attr.startsWith('ion-'))) {
            return true;
        }

        return this.detect() !== false;
    }

    /**
     * Check if element is an Ionic native input (inside ion-input)
     * @param {Element} element - Element to check
     * @returns {boolean} True if element is a native input inside ion-input
     */
    isIonNativeInput(element) {
        const parent = element.closest('ion-input, ion-textarea, ion-searchbar');
        return parent !== null;
    }

    /**
     * Get the Ionic parent component for a native input element
     * @param {Element} element - Native input element
     * @returns {Element|null} Ionic parent component or null
     */
    getIonParent(element) {
        return element.closest('ion-input, ion-textarea, ion-searchbar, ion-select');
    }
}

export default IonicAdapter;