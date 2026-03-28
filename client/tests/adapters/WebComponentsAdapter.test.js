/**
 * WebComponentsAdapter Test Suite
 * Tests for Web Components detection and value setting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import WebComponentsAdapter from '../../src/form/adapters/WebComponentsAdapter.js';

describe('WebComponentsAdapter', () => {
    let adapter;

    beforeEach(() => {
        adapter = new WebComponentsAdapter();
        // Reset customElements mock
        window.customElements = {
            define: vi.fn(),
            get: vi.fn(),
            upgrade: vi.fn(),
            whenDefined: vi.fn(),
            size: 0
        };
    });

    describe('basic properties', () => {
        it('should have correct name', () => {
            expect(adapter.name).toBe('webcomponents');
        });

        it('should have priority of 20', () => {
            expect(adapter.priority).toBe(20);
        });

        it('should extend BaseAdapter', () => {
            expect(adapter.getName()).toBe('webcomponents');
            expect(adapter.getPriority()).toBe(20);
        });
    });

    describe('Web Components detection', () => {
        it('should detect Web Components via customElements.size', () => {
            window.customElements.size = 1;

            const result = adapter.detect();

            expect(result).toBe(true);
        });

        it('should detect Web Components via "is" attribute', () => {
            const element = document.createElement('input');
            element.setAttribute('is', 'custom-input');
            document.body.appendChild(element);

            const result = adapter.detect();

            expect(result).toBe(element);

            document.body.removeChild(element);
        });

        it('should return false when Web Components not present', () => {
            window.customElements.size = 0;

            const result = adapter.detect();

            expect(result).toBe(false);
        });

        it('should return false when customElements not available', () => {
            delete window.customElements;

            const result = adapter.detect();

            expect(result).toBe(false);

            window.customElements = {
                define: vi.fn(),
                get: vi.fn(),
                upgrade: vi.fn(),
                whenDefined: vi.fn(),
                size: 0
            };
        });
    });

    describe('detectVersion', () => {
        it('should return null when customElements not available', () => {
            delete window.customElements;

            const version = adapter.detectVersion();

            expect(version).toBeNull();

            window.customElements = {
                define: vi.fn(),
                get: vi.fn(),
                size: 0
            };
        });

        it('should return v1 for basic customElements support', () => {
            window.customElements.upgrade = undefined;

            const version = adapter.detectVersion();

            expect(version).toBe('v1');
        });

        it('should return v1-full when upgrade is available', () => {
            window.customElements.upgrade = vi.fn();

            const version = adapter.detectVersion();

            expect(version).toBe('v1-full');
        });
    });

    describe('match', () => {
        it('should match registered custom element', () => {
            window.customElements.get = vi.fn().mockReturnValue(class extends HTMLElement {});

            const element = document.createElement('custom-element');

            const result = adapter.match(element);

            expect(result).toBe(true);
        });

        it('should match element with "is" attribute', () => {
            const element = document.createElement('input');
            element.setAttribute('is', 'custom-input');

            const result = adapter.match(element);

            expect(result).toBe(true);
        });

        it('should not match regular element', () => {
            window.customElements.get = vi.fn().mockReturnValue(undefined);

            const element = document.createElement('div');

            const result = adapter.match(element);

            expect(result).toBe(false);
        });
    });

    describe('setValue', () => {
        it('should use setValue method when available', () => {
            const element = document.createElement('custom-input');
            element.setValue = vi.fn();

            window.customElements.get = vi.fn().mockReturnValue(class extends HTMLElement {});

            adapter.setValue(element, 'test value');

            expect(element.setValue).toHaveBeenCalledWith('test value');
        });

        it('should set value property when no setValue method', () => {
            const element = document.createElement('custom-input');
            element.value = '';
            window.customElements.get = vi.fn().mockReturnValue(class extends HTMLElement {});

            adapter.setValue(element, 'test value');

            expect(element.value).toBe('test value');
        });

        it('should dispatch change event with detail', () => {
            const element = document.createElement('custom-input');
            element.value = '';
            window.customElements.get = vi.fn().mockReturnValue(class extends HTMLElement {});
            document.body.appendChild(element);

            const events = spyOnDispatchEvent(element);

            adapter.setValue(element, 'test');

            const changeEvents = events.filter(e => e.type === 'change');
            expect(changeEvents.length).toBeGreaterThan(0);

            document.body.removeChild(element);
        });

        it('should fall back to native setter for non-custom elements', () => {
            const input = document.createElement('input');
            window.customElements.get = vi.fn().mockReturnValue(undefined);
            document.body.appendChild(input);

            adapter.setValue(input, 'native value');

            expect(input.value).toBe('native value');

            document.body.removeChild(input);
        });

        it('should handle textarea elements', () => {
            const textarea = document.createElement('textarea');
            document.body.appendChild(textarea);

            adapter.setValue(textarea, 'test content');

            expect(textarea.value).toBe('test content');

            document.body.removeChild(textarea);
        });

        it('should handle select elements', () => {
            const select = document.createElement('select');
            const option1 = document.createElement('option');
            option1.value = 'option1';
            const option2 = document.createElement('option');
            option2.value = 'option2';
            select.appendChild(option1);
            select.appendChild(option2);
            document.body.appendChild(select);

            adapter.setValue(select, 'option2');

            expect(select.value).toBe('option2');

            document.body.removeChild(select);
        });
    });

    describe('isCustomElement', () => {
        it('should return true for registered custom element', () => {
            window.customElements.get = vi.fn().mockReturnValue(class extends HTMLElement {});

            const element = document.createElement('my-custom-element');

            const result = adapter.isCustomElement(element);

            expect(result).toBe(true);
        });

        it('should return false for unregistered element', () => {
            window.customElements.get = vi.fn().mockReturnValue(undefined);

            const element = document.createElement('div');

            const result = adapter.isCustomElement(element);

            expect(result).toBe(false);
        });

        it('should return false when customElements not available', () => {
            delete window.customElements;

            const element = document.createElement('div');

            const result = adapter.isCustomElement(element);

            expect(result).toBe(false);

            window.customElements = {
                define: vi.fn(),
                get: vi.fn(),
                size: 0
            };
        });
    });

    describe('getRegisteredCustomElements', () => {
        it('should return empty array when customElements not available', () => {
            delete window.customElements;

            const result = adapter.getRegisteredCustomElements();

            expect(result).toEqual([]);

            window.customElements = {
                define: vi.fn(),
                get: vi.fn(),
                size: 0
            };
        });

        it('should return list of registered custom elements in document', () => {
            // Mock that 'my-component' is registered
            window.customElements.get = vi.fn((tagName) => {
                if (tagName === 'my-component') {
                    return class extends HTMLElement {};
                }
                return undefined;
            });

            const element = document.createElement('my-component');
            document.body.appendChild(element);

            const result = adapter.getRegisteredCustomElements();

            expect(result).toContain('my-component');

            document.body.removeChild(element);
        });

        it('should return unique custom element names', () => {
            window.customElements.get = vi.fn((tagName) => {
                if (tagName === 'my-component') {
                    return class extends HTMLElement {};
                }
                return undefined;
            });

            const element1 = document.createElement('my-component');
            const element2 = document.createElement('my-component');
            document.body.appendChild(element1);
            document.body.appendChild(element2);

            const result = adapter.getRegisteredCustomElements();

            expect(result.length).toBe(1);
            expect(result).toContain('my-component');

            document.body.removeChild(element1);
            document.body.removeChild(element2);
        });
    });

    describe('integration tests', () => {
        it('should detect and fill custom element form', () => {
            window.customElements.size = 1;
            window.customElements.get = vi.fn((tagName) => {
                if (tagName === 'form-input') {
                    return class extends HTMLElement {
                        setValue(v) { this.value = v; }
                    };
                }
                return undefined;
            });

            const customInput = document.createElement('form-input');
            customInput.setValue = vi.fn((v) => { customInput.value = v; });
            document.body.appendChild(customInput);

            const detected = adapter.detect();
            expect(detected).toBe(true);

            adapter.setValue(customInput, 'custom value');
            expect(customInput.setValue).toHaveBeenCalledWith('custom value');

            document.body.removeChild(customInput);
        });

        it('should handle element with is attribute', () => {
            const input = document.createElement('input');
            input.setAttribute('is', 'custom-date-input');
            input.type = 'text';
            document.body.appendChild(input);

            const detected = adapter.detect();
            expect(detected).toBe(input);

            adapter.setValue(input, '2024-01-01');
            expect(input.value).toBe('2024-01-01');

            document.body.removeChild(input);
        });
    });
});