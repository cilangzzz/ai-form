/**
 * SvelteAdapter Test Suite
 * Tests for Svelte framework detection and value setting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import SvelteAdapter from '../../src/form/adapters/SvelteAdapter.js';

describe('SvelteAdapter', () => {
    let adapter;

    beforeEach(() => {
        adapter = new SvelteAdapter();
    });

    describe('basic properties', () => {
        it('should have correct name', () => {
            expect(adapter.name).toBe('svelte');
        });

        it('should have priority of 25', () => {
            expect(adapter.priority).toBe(25);
        });

        it('should extend BaseAdapter', () => {
            expect(adapter.getName()).toBe('svelte');
            expect(adapter.getPriority()).toBe(25);
        });
    });

    describe('Svelte detection', () => {
        it('should detect Svelte via svelte class name', () => {
            const element = document.createElement('div');
            element.className = 'svelte-component';
            document.body.appendChild(element);

            const result = adapter.detect();

            expect(result).toBe(element);

            document.body.removeChild(element);
        });

        it('should detect Svelte via class containing "svelte"', () => {
            const element = document.createElement('button');
            element.className = 'btn svelte-1a2b3c';
            document.body.appendChild(element);

            const result = adapter.detect();

            expect(result).toBe(element);

            document.body.removeChild(element);
        });

        it('should detect Svelte via __svelte_meta property', () => {
            const element = document.createElement('div');
            element.__svelte_meta = {};
            document.body.appendChild(element);

            const result = adapter.detectSvelteComponent();

            expect(result).toBe(true);

            document.body.removeChild(element);
        });

        it('should detect Svelte via __svelte_component property', () => {
            const element = document.createElement('div');
            element.__svelte_component = {};
            document.body.appendChild(element);

            const result = adapter.detectSvelteComponent();

            expect(result).toBe(true);

            document.body.removeChild(element);
        });

        it('should detect Svelte 5 via $$.$set property', () => {
            const element = document.createElement('div');
            element.$$ = { $set: vi.fn() };
            document.body.appendChild(element);

            const result = adapter.detectSvelteComponent();

            expect(result).toBe(true);

            document.body.removeChild(element);
        });

        it('should return false when Svelte is not present', () => {
            const result = adapter.detect();

            expect(result).toBe(false);
        });
    });

    describe('setValue', () => {
        it('should set value on input element', () => {
            const input = document.createElement('input');
            input.type = 'text';
            document.body.appendChild(input);

            adapter.setValue(input, 'test value');

            expect(input.value).toBe('test value');

            document.body.removeChild(input);
        });

        it('should trigger input event for Svelte binding', () => {
            const input = document.createElement('input');
            document.body.appendChild(input);

            const events = spyOnDispatchEvent(input);

            adapter.setValue(input, 'test');

            const eventTypes = events.map(e => e.type);
            expect(eventTypes).toContain('input');

            document.body.removeChild(input);
        });

        it('should trigger change event', () => {
            const input = document.createElement('input');
            document.body.appendChild(input);

            const events = spyOnDispatchEvent(input);

            adapter.setValue(input, 'test');

            const eventTypes = events.map(e => e.type);
            expect(eventTypes).toContain('change');

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

        it('should use native descriptor for value setting', () => {
            const input = document.createElement('input');
            document.body.appendChild(input);

            // Verify the value is set correctly
            adapter.setValue(input, 'native test');

            expect(input.value).toBe('native test');

            document.body.removeChild(input);
        });
    });

    describe('detectSvelteComponent', () => {
        it('should find __svelte_meta marker', () => {
            const element = document.createElement('div');
            element.__svelte_meta = { loc: { file: 'test.svelte' } };
            document.body.appendChild(element);

            const result = adapter.detectSvelteComponent();

            expect(result).toBe(true);

            document.body.removeChild(element);
        });

        it('should find __svelte_component marker', () => {
            const element = document.createElement('div');
            element.__svelte_component = {};
            document.body.appendChild(element);

            const result = adapter.detectSvelteComponent();

            expect(result).toBe(true);

            document.body.removeChild(element);
        });

        it('should find Svelte 5 $$ marker', () => {
            const element = document.createElement('div');
            element.$$ = { $set: vi.fn() };
            document.body.appendChild(element);

            const result = adapter.detectSvelteComponent();

            expect(result).toBe(true);

            document.body.removeChild(element);
        });

        it('should return false when no Svelte markers found', () => {
            const element = document.createElement('div');
            document.body.appendChild(element);

            const result = adapter.detectSvelteComponent();

            expect(result).toBe(false);

            document.body.removeChild(element);
        });
    });

    describe('integration tests', () => {
        it('should detect and fill Svelte form', () => {
            // Create a mock Svelte form
            const form = document.createElement('form');
            form.className = 'svelte-form';

            const input1 = document.createElement('input');
            input1.name = 'username';
            input1.className = 'svelte-input';

            const input2 = document.createElement('input');
            input2.name = 'email';
            input2.className = 'svelte-input';

            form.appendChild(input1);
            form.appendChild(input2);
            document.body.appendChild(form);

            // Detect
            const detected = adapter.detect();
            expect(detected).toBeTruthy();

            // Fill
            adapter.setValue(input1, 'testuser');
            adapter.setValue(input2, 'test@example.com');

            expect(input1.value).toBe('testuser');
            expect(input2.value).toBe('test@example.com');

            document.body.removeChild(form);
        });

        it('should handle multiple Svelte components', () => {
            const component1 = document.createElement('div');
            component1.className = 'svelte-component-1';
            const component2 = document.createElement('div');
            component2.className = 'svelte-component-2';

            document.body.appendChild(component1);
            document.body.appendChild(component2);

            const result = adapter.detect();

            expect(result).toBeTruthy();

            document.body.removeChild(component1);
            document.body.removeChild(component2);
        });
    });
});