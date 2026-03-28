/**
 * AngularAdapter Test Suite
 * Tests for Angular framework detection and value setting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import AngularAdapter from '../../src/form/adapters/AngularAdapter.js';

describe('AngularAdapter', () => {
    let adapter;

    beforeEach(() => {
        adapter = new AngularAdapter();
        // Clean up window globals
        delete window.ng;
    });

    describe('basic properties', () => {
        it('should have correct name', () => {
            expect(adapter.name).toBe('angular');
        });

        it('should have priority of 30', () => {
            expect(adapter.priority).toBe(30);
        });

        it('should extend BaseAdapter', () => {
            expect(adapter.getName()).toBe('angular');
            expect(adapter.getPriority()).toBe(30);
        });
    });

    describe('Angular detection', () => {
        it('should detect Angular via ng-version attribute', () => {
            const element = document.createElement('app-root');
            element.setAttribute('ng-version', '17.0.0');
            document.body.appendChild(element);

            const result = adapter.detect();

            expect(result).toBe(element);
            expect(adapter.frameworkVersion).toBe('17.0.0');

            document.body.removeChild(element);
        });

        it('should detect Angular via window.ng.probe', () => {
            window.ng = {
                probe: vi.fn()
            };

            const result = adapter.detect();

            expect(result).toBe(true);

            delete window.ng;
        });

        it('should detect Angular via __ngContext__', () => {
            const element = document.createElement('div');
            element.__ngContext__ = {};
            document.body.appendChild(element);

            const result = adapter.detect();

            expect(result).toBe(element);

            document.body.removeChild(element);
        });

        it('should detect Angular via ng-binding attribute', () => {
            const element = document.createElement('div');
            element.setAttribute('ng-binding', '');
            document.body.appendChild(element);

            const result = adapter.detect();

            expect(result).toBe(element);

            document.body.removeChild(element);
        });

        it('should detect Angular via _ngcontent attribute', () => {
            const element = document.createElement('div');
            element.setAttribute('_ngcontent', '');
            document.body.appendChild(element);

            const result = adapter.detect();

            expect(result).toBe(element);

            document.body.removeChild(element);
        });

        it('should return false when Angular is not present', () => {
            const result = adapter.detect();

            expect(result).toBe(false);
        });
    });

    describe('detectVersion', () => {
        it('should return cached version', () => {
            adapter.frameworkVersion = '15.0.0';

            const version = adapter.detectVersion();

            expect(version).toBe('15.0.0');
        });

        it('should get version from ng-version attribute', () => {
            const element = document.createElement('app-root');
            element.setAttribute('ng-version', '16.1.0');
            document.body.appendChild(element);

            const version = adapter.detectVersion();

            expect(version).toBe('16.1.0');

            document.body.removeChild(element);
        });

        it('should get version from window.ng.version', () => {
            window.ng = {
                version: {
                    full: '14.2.0'
                }
            };

            const version = adapter.detectVersion();

            expect(version).toBe('14.2.0');

            delete window.ng;
        });

        it('should return null when version not found', () => {
            const version = adapter.detectVersion();

            expect(version).toBeNull();
        });
    });

    describe('setValue', () => {
        it('should set value using FormControl.setValue when available', () => {
            const input = document.createElement('input');
            input.setAttribute('formControlName', 'username');
            document.body.appendChild(input);

            // Mock FormControl
            const mockControl = {
                setValue: vi.fn(),
                markAsDirty: vi.fn(),
                markAsTouched: vi.fn()
            };
            input.__ngContext__ = { control: mockControl };

            adapter.setValue(input, 'test value');

            expect(mockControl.setValue).toHaveBeenCalledWith('test value');
            expect(mockControl.markAsDirty).toHaveBeenCalled();
            expect(mockControl.markAsTouched).toHaveBeenCalled();

            document.body.removeChild(input);
        });

        it('should fall back to native setter when FormControl not available', () => {
            const input = document.createElement('input');
            document.body.appendChild(input);

            adapter.setValue(input, 'test value');

            expect(input.value).toBe('test value');

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

        it('should fall back when FormControl.setValue fails', () => {
            const input = document.createElement('input');
            document.body.appendChild(input);

            // Mock FormControl that throws error
            const mockControl = {
                setValue: vi.fn().mockImplementation(() => {
                    throw new Error('Test error');
                }),
                markAsDirty: vi.fn(),
                markAsTouched: vi.fn()
            };
            input.__ngContext__ = { control: mockControl };

            adapter.setValue(input, 'test value');

            expect(input.value).toBe('test value');

            document.body.removeChild(input);
        });
    });

    describe('match', () => {
        it('should match element with formControlName attribute', () => {
            const input = document.createElement('input');
            input.setAttribute('formControlName', 'email');

            const result = adapter.match(input);

            expect(result).toBe(true);
        });

        it('should match element with ngModel attribute', () => {
            const input = document.createElement('input');
            input.setAttribute('ngModel', '');

            const result = adapter.match(input);

            expect(result).toBe(true);
        });

        it('should match element inside Angular component', () => {
            const parent = document.createElement('app-root');
            parent.setAttribute('ng-version', '17.0.0');
            const input = document.createElement('input');
            parent.appendChild(input);
            document.body.appendChild(parent);

            const result = adapter.match(input);

            expect(result).toBe(true);

            document.body.removeChild(parent);
        });

        it('should match element with __ngContext__', () => {
            const element = document.createElement('div');
            element.__ngContext__ = {};

            const result = adapter.match(element);

            expect(result).toBe(true);
        });
    });

    describe('getFormControl', () => {
        it('should return control from __ngContext__', () => {
            const input = document.createElement('input');
            const mockControl = { setValue: vi.fn() };
            input.__ngContext__ = { control: mockControl };

            const control = adapter.getFormControl(input);

            expect(control).toBe(mockControl);
        });

        it('should return null when no control found', () => {
            const input = document.createElement('input');

            const control = adapter.getFormControl(input);

            expect(control).toBeNull();
        });
    });

    describe('getControlName', () => {
        it('should get control name from formControlName attribute', () => {
            const input = document.createElement('input');
            input.setAttribute('formControlName', 'username');

            const name = adapter.getControlName(input);

            expect(name).toBe('username');
        });

        it('should get control name from name attribute', () => {
            const input = document.createElement('input');
            input.name = 'password';

            const name = adapter.getControlName(input);

            expect(name).toBe('password');
        });

        it('should get control name from id attribute', () => {
            const input = document.createElement('input');
            input.id = 'email';

            const name = adapter.getControlName(input);

            expect(name).toBe('email');
        });
    });

    describe('detectAngularComponent', () => {
        it('should find element with __ngContext__', () => {
            const element = document.createElement('div');
            element.__ngContext__ = {};
            document.body.appendChild(element);

            const result = adapter.detectAngularComponent();

            expect(result).toBe(element);

            document.body.removeChild(element);
        });

        it('should find element with _ngBinding', () => {
            const element = document.createElement('div');
            element._ngBinding = {};
            document.body.appendChild(element);

            const result = adapter.detectAngularComponent();

            expect(result).toBe(element);

            document.body.removeChild(element);
        });

        it('should return false when no Angular component found', () => {
            const result = adapter.detectAngularComponent();

            expect(result).toBe(false);
        });
    });
});