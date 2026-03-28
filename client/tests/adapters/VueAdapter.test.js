/**
 * VueAdapter Test Suite
 * Tests for Vue.js framework detection and value setting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import VueAdapter from '../../src/form/adapters/VueAdapter.js';

describe('VueAdapter', () => {
    let adapter;

    beforeEach(() => {
        adapter = new VueAdapter();
        // Clean up window globals
        delete window.Vue;
        delete window.__VUE_APP__;
        delete window.__VUE__;
        delete window.__vue_app__;
    });

    describe('basic properties', () => {
        it('should have correct name', () => {
            expect(adapter.name).toBe('vue');
        });

        it('should have priority of 50', () => {
            expect(adapter.priority).toBe(50);
        });

        it('should extend BaseAdapter', () => {
            expect(adapter.getName()).toBe('vue');
            expect(adapter.getPriority()).toBe(50);
        });
    });

    describe('Vue 2 detection', () => {
        it('should detect Vue 2 via window.Vue', () => {
            window.Vue = { version: '2.7.14' };

            const result = adapter.detect();
            expect(result).toBe(true);
            expect(adapter.vueVersion).toBe('2.7.14');
        });

        it('should detect Vue 2 via __vue__ marker', () => {
            const element = document.createElement('div');
            element.setAttribute('__vue__', '');
            document.body.appendChild(element);

            const result = adapter.detect();
            expect(result).toBeTruthy();

            document.body.removeChild(element);
        });

        it('should detect Vue 2 via element.__vue__ property', () => {
            const element = document.createElement('div');
            element.__vue__ = { $data: {} };
            document.body.appendChild(element);

            const result = adapter.detect();
            expect(result).toBeTruthy();

            document.body.removeChild(element);
        });
    });

    describe('Vue 3 detection', () => {
        it('should detect Vue 3 via __VUE_APP__', () => {
            window.__VUE_APP__ = {};

            const result = adapter.detect();
            expect(result).toBe(true);
            expect(adapter.vueVersion).toBe('3.x');
        });

        it('should detect Vue 3 via data-v-app attribute', () => {
            const element = document.createElement('div');
            element.setAttribute('data-v-app', '');
            document.body.appendChild(element);

            const result = adapter.detect();
            expect(result).toBeTruthy();

            document.body.removeChild(element);
        });

        it('should detect Vue 3 via __vueParentComponent__', () => {
            const element = document.createElement('div');
            element.__vueParentComponent__ = {};
            document.body.appendChild(element);

            const result = adapter.detect();
            expect(result).toBeTruthy();

            document.body.removeChild(element);
        });

        it('should detect Vue 3 via __vue_app__ property', () => {
            const element = document.createElement('div');
            element.__vue_app__ = {};
            document.body.appendChild(element);

            const result = adapter.detect();
            expect(result).toBeTruthy();

            document.body.removeChild(element);
        });
    });

    describe('detection fallback', () => {
        it('should return false when Vue is not present', () => {
            const result = adapter.detect();
            expect(result).toBe(false);
        });

        it('should detect via data-v- attributes (scoped styles)', () => {
            const element = document.createElement('div');
            element.setAttribute('data-v-', '');
            document.body.appendChild(element);

            const result = adapter.detect();
            expect(result).toBeTruthy();

            document.body.removeChild(element);
        });
    });

    describe('setValue', () => {
        it('should set value on input element', () => {
            const input = document.createElement('input');
            input.type = 'text';
            document.body.appendChild(input);

            // Mock Vue 3 detection
            adapter.vueVersion = '3.x';

            const events = spyOnDispatchEvent(input);

            adapter.setValue(input, 'test value');

            expect(input.value).toBe('test value');
            expect(events.length).toBeGreaterThan(0);

            document.body.removeChild(input);
        });

        it('should trigger input and change events', () => {
            const input = document.createElement('input');
            document.body.appendChild(input);

            adapter.vueVersion = '3.x';

            const events = spyOnDispatchEvent(input);

            adapter.setValue(input, 'test');

            const eventTypes = events.map(e => e.type);
            expect(eventTypes).toContain('input');
            expect(eventTypes).toContain('change');

            document.body.removeChild(input);
        });

        it('should handle Vue 2 with $set', () => {
            const input = document.createElement('input');
            input.name = 'testField';
            document.body.appendChild(input);

            // Mock Vue 2 instance
            adapter.vueVersion = '2.x';
            const mockVueInstance = {
                $data: {},
                $set: vi.fn()
            };
            input.__vue__ = mockVueInstance;

            adapter.setValue(input, 'test value');

            expect(input.value).toBe('test value');
            // $set should be called for reactivity
            expect(mockVueInstance.$set).toHaveBeenCalled();

            document.body.removeChild(input);
        });

        it('should handle textarea elements', () => {
            const textarea = document.createElement('textarea');
            document.body.appendChild(textarea);

            adapter.vueVersion = '3.x';

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

            adapter.vueVersion = '3.x';

            adapter.setValue(select, 'option2');

            expect(select.value).toBe('option2');

            document.body.removeChild(select);
        });

        it('should trigger update:modelValue event for Vue 3', () => {
            const input = document.createElement('input');
            document.body.appendChild(input);

            adapter.vueVersion = '3.x';

            const events = spyOnDispatchEvent(input);

            adapter.setValue(input, 'test');

            const customEvents = events.filter(e => e.type === 'update:modelValue');
            expect(customEvents.length).toBeGreaterThan(0);

            document.body.removeChild(input);
        });
    });

    describe('match', () => {
        it('should match Vue element', () => {
            const element = document.createElement('div');
            element.__vue__ = {};
            document.body.appendChild(element);

            adapter.detectVersion();

            expect(adapter.match(element)).toBe(true);

            document.body.removeChild(element);
        });

        it('should not match non-Vue element', () => {
            adapter.vueVersion = null;

            const element = document.createElement('div');
            document.body.appendChild(element);

            expect(adapter.match(element)).toBe(false);

            document.body.removeChild(element);
        });

        it('should match element inside Vue component', () => {
            const parent = document.createElement('div');
            parent.setAttribute('data-v-', '');

            const child = document.createElement('input');
            parent.appendChild(child);
            document.body.appendChild(parent);

            adapter.detectVersion();

            expect(adapter.match(child)).toBe(true);

            document.body.removeChild(parent);
        });
    });

    describe('getInfo', () => {
        it('should return adapter info', () => {
            adapter.vueVersion = '3.x';

            const info = adapter.getInfo();

            expect(info.name).toBe('vue');
            expect(info.priority).toBe(50);
            expect(info.vueVersion).toBe('3.x');
        });
    });

    describe('findVueElement', () => {
        it('should find Vue 3 app root', () => {
            const element = document.createElement('div');
            element.setAttribute('data-v-app', '');
            document.body.appendChild(element);

            const found = adapter.findVueElement();
            expect(found).toBe(element);

            document.body.removeChild(element);
        });

        it('should find Vue 2 root', () => {
            const element = document.createElement('div');
            element.setAttribute('__vue__', '');
            document.body.appendChild(element);

            const found = adapter.findVueElement();
            expect(found).toBe(element);

            document.body.removeChild(element);
        });

        it('should return null when no Vue element found', () => {
            const found = adapter.findVueElement();
            expect(found).toBeNull();
        });
    });
});