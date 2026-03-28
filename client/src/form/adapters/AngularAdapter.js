import BaseAdapter from './BaseAdapter.js';

/**
 * AngularAdapter - Adapter for Angular framework
 * Handles detection and value setting for Angular components and forms
 * Supports both Angular reactive forms and template-driven forms
 */
class AngularAdapter extends BaseAdapter {
    constructor() {
        super();
        this.name = 'angular';
        this.priority = 30;
        this.frameworkVersion = null;
    }

    /**
     * Detect if Angular is present on the page
     * Checks for ng-version attribute, window.ng, or Angular component markers
     * @returns {boolean|Element} Detection result
     */
    detect() {
        // Check for ng-version attribute (Angular 2+)
        const ngVersionElement = document.querySelector('[ng-version]');
        if (ngVersionElement) {
            const version = ngVersionElement.getAttribute('ng-version');
            this.frameworkVersion = version;
            return ngVersionElement;
        }

        // Check for window.ng (Angular debugging tools)
        if (window.ng && window.ng.probe) {
            return true;
        }

        // Check for Angular component markers
        const angularComponent = this.detectAngularComponent();
        if (angularComponent) {
            return angularComponent;
        }

        // Check for common Angular-specific attributes
        const ngAttributes = document.querySelector('[ng-binding], [ng-scope], [_ngcontent], [_nghost]');
        if (ngAttributes) {
            return ngAttributes;
        }

        return false;
    }

    /**
     * Detect Angular component instances by checking internal properties
     * @returns {boolean|Element} Detection result
     */
    detectAngularComponent() {
        // Check for Angular component instances
        const elements = document.querySelectorAll('*');
        for (const el of elements) {
            // Angular component debugging markers
            if (el.__ngContext__ || el._ngBinding || el.ngDebug) {
                return el;
            }
        }
        return false;
    }

    /**
     * Get Angular version
     * @returns {string|null} Angular version string
     */
    detectVersion() {
        if (this.frameworkVersion) {
            return this.frameworkVersion;
        }

        // Try to get version from ng-version attribute
        const ngVersionElement = document.querySelector('[ng-version]');
        if (ngVersionElement) {
            this.frameworkVersion = ngVersionElement.getAttribute('ng-version');
            return this.frameworkVersion;
        }

        // Try to detect from window.ng
        if (window.ng && window.ng.version) {
            this.frameworkVersion = window.ng.version.full || 'unknown';
            return this.frameworkVersion;
        }

        return null;
    }

    /**
     * Get FormControl for an element (for reactive forms)
     * @param {HTMLElement} element - Target element
     * @returns {Object|null} FormControl instance or null
     */
    getFormControl(element) {
        // Method 1: Try to get via ng.probe (deprecated but still works in some versions)
        if (window.ng && window.ng.probe) {
            try {
                const debugElement = window.ng.probe(element);
                if (debugElement && debugElement.componentInstance) {
                    const component = debugElement.componentInstance;
                    // Look for form control in reactive forms
                    if (component.form && component.form.get) {
                        const controlName = this.getControlName(element);
                        if (controlName) {
                            return component.form.get(controlName);
                        }
                    }
                }
            } catch (e) {
                // ng.probe may not be available or element may not be an Angular component
            }
        }

        // Method 2: Try to find FormControl via __ngContext__
        if (element.__ngContext__) {
            const context = element.__ngContext__;
            if (context && context.control) {
                return context.control;
            }
        }

        // Method 3: Check for formControlName directive data
        const formControlName = element.getAttribute('formcontrolname') ||
                                element.getAttribute('formControlName');
        if (formControlName) {
            // Try to find the parent form group
            const parentForm = this.findParentFormGroup(element);
            if (parentForm && parentForm.get) {
                return parentForm.get(formControlName);
            }
        }

        return null;
    }

    /**
     * Get the control name for an element
     * @param {HTMLElement} element - Target element
     * @returns {string|null} Control name or null
     */
    getControlName(element) {
        return element.getAttribute('formcontrolname') ||
               element.getAttribute('formControlName') ||
               element.name ||
               element.id;
    }

    /**
     * Find the parent FormGroup for an element
     * @param {HTMLElement} element - Target element
     * @returns {Object|null} FormGroup instance or null
     */
    findParentFormGroup(element) {
        // Walk up the DOM tree looking for form elements
        let current = element;
        while (current) {
            // Check for formGroup attribute
            const formGroupName = current.getAttribute('formgroup') ||
                                  current.getAttribute('formGroup');

            if (formGroupName && window.ng) {
                try {
                    const debugEl = window.ng.probe(current);
                    if (debugEl && debugEl.componentInstance) {
                        const component = debugEl.componentInstance;
                        // Look for form group in component
                        if (component[formGroupName]) {
                            return component[formGroupName];
                        }
                        if (component.form) {
                            return component.form;
                        }
                    }
                } catch (e) {
                    // Continue searching
                }
            }

            // Check for form element
            if (current.tagName === 'FORM') {
                if (window.ng) {
                    try {
                        const debugEl = window.ng.probe(current);
                        if (debugEl && debugEl.componentInstance) {
                            return debugEl.componentInstance.form ||
                                   debugEl.componentInstance.ngForm;
                        }
                    } catch (e) {
                        // Continue searching
                    }
                }
            }

            current = current.parentElement;
        }

        return null;
    }

    /**
     * Set value on an Angular element
     * Prioritizes FormControl.setValue() for reactive forms
     * Falls back to native value setting for template-driven forms
     * @param {HTMLElement} element - Target element
     * @param {*} value - Value to set
     */
    setValue(element, value) {
        // Try to get FormControl first (for reactive forms)
        const control = this.getFormControl(element);
        if (control && typeof control.setValue === 'function') {
            try {
                control.setValue(value);
                control.markAsDirty();
                control.markAsTouched();
                console.log(`AngularAdapter: Set value via FormControl.setValue()`);
                return true;
            } catch (e) {
                console.warn('AngularAdapter: FormControl.setValue() failed, falling back:', e);
            }
        }

        // Fall back to native value setting
        // This works for template-driven forms and regular inputs
        this.setNativeValue(element, value);
        console.log(`AngularAdapter: Set value via native setter`);
        return true;
    }

    /**
     * Match an element to determine if this adapter should handle it
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} True if this adapter should handle the element
     */
    match(element) {
        // Check if element has Angular-specific attributes
        const hasNgAttr = element.hasAttribute('ng-version') ||
                          element.hasAttribute('formControlName') ||
                          element.hasAttribute('formcontrolname') ||
                          element.hasAttribute('ngModel') ||
                          element.hasAttribute('[ngModel]') ||
                          element.hasAttribute('[(ngModel)]');

        if (hasNgAttr) {
            return true;
        }

        // Check if element is inside an Angular component
        const parent = element.closest('[ng-version], [_ngcontent], [_nghost]');
        if (parent) {
            return true;
        }

        // Check for Angular context on element
        if (element.__ngContext__) {
            return true;
        }

        return this.detect() !== false;
    }
}

export default AngularAdapter;