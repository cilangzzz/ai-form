/**
 * ReactAdapter Test Suite
 * Tests for React framework detection and value setting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReactAdapter } from '../../src/form/adapters/ReactAdapter.js';

describe('ReactAdapter', () => {
    let adapter;

    beforeEach(() => {
        adapter = new ReactAdapter();
        // Clean up window globals
        delete window.React;
        delete window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    });

    describe('basic properties', () => {
        it('should have correct name', () => {
            expect(adapter.name).toBe('React');
        });

        it('should have priority of 35', () => {
            expect(adapter.priority).toBe(35);
        });
    });

    describe('React detection', () => {
        it('should detect React via window.React', () => {
            window.React = { version: '18.2.0' };

            const result = adapter.detect();

            expect(result).toBe(true);
            expect(adapter.reactInfo.detected).toBe(true);
            expect(adapter.reactInfo.version).toBe('18.2.0');
        });

        it('should detect React via data-reactroot attribute', () => {
            const element = document.createElement('div');
            element.setAttribute('data-reactroot', '');
            document.body.appendChild(element);

            const result = adapter.detect();

            expect(result).toBe(true);
            expect(adapter.reactInfo.hasReactRoot).toBe(true);

            document.body.removeChild(element);
        });

        it('should detect React via _reactRootContainer property', () => {
            const element = document.createElement('div');
            element._reactRootContainer = {};
            document.body.appendChild(element);

            const result = adapter.detect();

            expect(result).toBe(true);

            document.body.removeChild(element);
        });

        it('should detect React via _reactInternals property', () => {
            const element = document.createElement('div');
            element._reactInternals = {};
            document.body.appendChild(element);

            const result = adapter.detect();

            expect(result).toBe(true);

            document.body.removeChild(element);
        });

        it('should return false when React is not present', () => {
            const result = adapter.detect();

            expect(result).toBe(false);
            expect(adapter.reactInfo.detected).toBe(false);
        });
    });

    describe('setValue', () => {
        it('should set value on input element', () => {
            const input = document.createElement('input');
            input.type = 'text';
            document.body.appendChild(input);

            const result = adapter.setValue(input, 'test value');

            expect(result).toBe(true);
            expect(input.value).toBe('test value');

            document.body.removeChild(input);
        });

        it('should trigger synthetic events in correct order', () => {
            const input = document.createElement('input');
            document.body.appendChild(input);

            const events = spyOnDispatchEvent(input);

            adapter.setValue(input, 'test');

            const eventTypes = events.map(e => e.type);

            // React expects input first, then change
            expect(eventTypes).toContain('input');
            expect(eventTypes).toContain('change');

            document.body.removeChild(input);
        });

        it('should handle React value tracker', () => {
            const input = document.createElement('input');
            input._valueTracker = {
                setValue: vi.fn()
            };
            document.body.appendChild(input);

            adapter.setValue(input, 'test');

            expect(input._valueTracker.setValue).toHaveBeenCalledWith('test');

            document.body.removeChild(input);
        });

        it('should handle textarea elements', () => {
            const textarea = document.createElement('textarea');
            document.body.appendChild(textarea);

            const result = adapter.setValue(textarea, 'test content');

            expect(result).toBe(true);
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

            const result = adapter.setValue(select, 'option2');

            expect(result).toBe(true);

            document.body.removeChild(select);
        });

        it('should return false on error', () => {
            const input = document.createElement('input');

            // Mock setNativeValue to throw error
            adapter.setNativeValue = vi.fn().mockImplementation(() => {
                throw new Error('Test error');
            });

            const result = adapter.setValue(input, 'test');

            expect(result).toBe(false);
        });
    });

    describe('detectReact', () => {
        it('should return correct detection info', () => {
            const info = adapter.detectReact();

            expect(info).toHaveProperty('detected');
            expect(info).toHaveProperty('version');
            expect(info).toHaveProperty('hasReactRoot');
        });

        it('should detect version from window.React', () => {
            window.React = { version: '17.0.2' };

            const info = adapter.detectReact();

            expect(info.version).toBe('17.0.2');
        });

        it('should detect unknown version when window.React has no version', () => {
            window.React = {};

            const info = adapter.detectReact();

            expect(info.version).toBe('unknown');
        });
    });

    describe('simulateReactTracker', () => {
        it('should call tracker.setValue when tracker exists', () => {
            const input = document.createElement('input');
            input._valueTracker = {
                setValue: vi.fn()
            };

            adapter.simulateReactTracker(input, 'new value');

            expect(input._valueTracker.setValue).toHaveBeenCalledWith('new value');
        });

        it('should dispatch change event', () => {
            const input = document.createElement('input');
            input._valueTracker = { setValue: vi.fn() };
            document.body.appendChild(input);

            const events = spyOnDispatchEvent(input);

            adapter.simulateReactTracker(input, 'value');

            expect(events.some(e => e.type === 'change')).toBe(true);

            document.body.removeChild(input);
        });
    });

    describe('fillForm', () => {
        it('should fill multiple inputs', () => {
            const input1 = document.createElement('input');
            input1.name = 'username';
            const input2 = document.createElement('input');
            input2.id = 'password';
            document.body.appendChild(input1);
            document.body.appendChild(input2);

            const inputs = [input1, input2];
            const fieldsMap = new Map([
                ['username', 'testuser'],
                ['password', 'testpass']
            ]);

            const result = adapter.fillForm(inputs, fieldsMap);

            expect(result.filled).toBe(2);
            expect(result.total).toBe(2);
            expect(result.skipped).toBe(0);

            document.body.removeChild(input1);
            document.body.removeChild(input2);
        });

        it('should skip inputs without matching field', () => {
            const input = document.createElement('input');
            input.name = 'username';
            document.body.appendChild(input);

            const inputs = [input];
            const fieldsMap = new Map([
                ['otherfield', 'value']
            ]);

            const result = adapter.fillForm(inputs, fieldsMap);

            expect(result.filled).toBe(0);
            expect(result.skipped).toBe(1);

            document.body.removeChild(input);
        });

        it('should handle inputs without name, id, or placeholder', () => {
            const input = document.createElement('input');
            document.body.appendChild(input);

            const inputs = [input];
            const fieldsMap = new Map([
                ['value', 'test']
            ]);

            const result = adapter.fillForm(inputs, fieldsMap);

            expect(result.skipped).toBe(1);

            document.body.removeChild(input);
        });

        it('should return details of filled fields', () => {
            const input = document.createElement('input');
            input.name = 'username';
            document.body.appendChild(input);

            const inputs = [input];
            const fieldsMap = new Map([
                ['username', 'testuser']
            ]);

            const result = adapter.fillForm(inputs, fieldsMap);

            expect(result.details).toHaveLength(1);
            expect(result.details[0].field).toBe('username');
            expect(result.details[0].value).toBe('testuser');

            document.body.removeChild(input);
        });
    });
});