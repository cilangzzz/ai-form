/**
 * IonicAdapter Test Suite
 * Tests for Ionic framework detection and value setting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import IonicAdapter from '../../src/form/adapters/IonicAdapter.js';

describe('IonicAdapter', () => {
    let adapter;

    beforeEach(() => {
        adapter = new IonicAdapter();
        // Clean up window globals
        delete window.Ionic;
        delete window.ionic;
        delete window.IonicConfig;
    });

    describe('basic properties', () => {
        it('should have correct name', () => {
            expect(adapter.name).toBe('ionic');
        });

        it('should have priority of 28', () => {
            expect(adapter.priority).toBe(28);
        });

        it('should extend BaseAdapter', () => {
            expect(adapter.getName()).toBe('ionic');
            expect(adapter.getPriority()).toBe(28);
        });
    });

    describe('Ionic detection', () => {
        it('should detect Ionic via ion-app element', () => {
            const ionApp = document.createElement('ion-app');
            document.body.appendChild(ionApp);

            const result = adapter.detect();

            expect(result).toBe(ionApp);

            document.body.removeChild(ionApp);
        });

        it('should detect Ionic via window.Ionic', () => {
            window.Ionic = { version: '7.0.0' };

            const result = adapter.detect();

            expect(result).toBe(true);

            delete window.Ionic;
        });

        it('should detect Ionic via window.ionic', () => {
            window.ionic = { version: '5.0.0' };

            const result = adapter.detect();

            expect(result).toBe(true);

            delete window.ionic;
        });

        it('should detect Ionic via window.IonicConfig', () => {
            window.IonicConfig = { mode: 'ios' };

            const result = adapter.detect();

            expect(result).toBe(true);

            delete window.IonicConfig;
        });

        it('should detect Ionic via ion-input element', () => {
            const ionInput = document.createElement('ion-input');
            document.body.appendChild(ionInput);

            const result = adapter.detect();

            expect(result).toBe(true);

            document.body.removeChild(ionInput);
        });

        it('should detect Ionic via ion-textarea element', () => {
            const ionTextarea = document.createElement('ion-textarea');
            document.body.appendChild(ionTextarea);

            const result = adapter.detect();

            expect(result).toBe(true);

            document.body.removeChild(ionTextarea);
        });

        it('should detect Ionic via ion-select element', () => {
            const ionSelect = document.createElement('ion-select');
            document.body.appendChild(ionSelect);

            const result = adapter.detect();

            expect(result).toBe(true);

            document.body.removeChild(ionSelect);
        });

        it('should detect Ionic via ion-checkbox element', () => {
            const ionCheckbox = document.createElement('ion-checkbox');
            document.body.appendChild(ionCheckbox);

            const result = adapter.detect();

            expect(result).toBe(true);

            document.body.removeChild(ionCheckbox);
        });

        it('should return false when Ionic is not present', () => {
            const result = adapter.detect();

            expect(result).toBe(false);
        });
    });

    describe('setValue', () => {
        describe('ion-input', () => {
            it('should set value on ion-input', () => {
                const ionInput = document.createElement('ion-input');
                document.body.appendChild(ionInput);

                adapter.setValue(ionInput, 'test value');

                expect(ionInput.value).toBe('test value');

                document.body.removeChild(ionInput);
            });

            it('should trigger ionChange event on ion-input', () => {
                const ionInput = document.createElement('ion-input');
                document.body.appendChild(ionInput);

                const events = spyOnDispatchEvent(ionInput);

                adapter.setValue(ionInput, 'test');

                const ionChangeEvents = events.filter(e => e.type === 'ionChange');
                expect(ionChangeEvents.length).toBeGreaterThan(0);

                document.body.removeChild(ionInput);
            });

            it('should trigger ionInput event on ion-input', () => {
                const ionInput = document.createElement('ion-input');
                document.body.appendChild(ionInput);

                const events = spyOnDispatchEvent(ionInput);

                adapter.setValue(ionInput, 'test');

                const ionInputEvents = events.filter(e => e.type === 'ionInput');
                expect(ionInputEvents.length).toBeGreaterThan(0);

                document.body.removeChild(ionInput);
            });
        });

        describe('ion-textarea', () => {
            it('should set value on ion-textarea', () => {
                const ionTextarea = document.createElement('ion-textarea');
                document.body.appendChild(ionTextarea);

                adapter.setValue(ionTextarea, 'test content');

                expect(ionTextarea.value).toBe('test content');

                document.body.removeChild(ionTextarea);
            });

            it('should trigger ionChange event on ion-textarea', () => {
                const ionTextarea = document.createElement('ion-textarea');
                document.body.appendChild(ionTextarea);

                const events = spyOnDispatchEvent(ionTextarea);

                adapter.setValue(ionTextarea, 'test');

                const ionChangeEvents = events.filter(e => e.type === 'ionChange');
                expect(ionChangeEvents.length).toBeGreaterThan(0);

                document.body.removeChild(ionTextarea);
            });
        });

        describe('ion-select', () => {
            it('should set value on ion-select', () => {
                const ionSelect = document.createElement('ion-select');
                document.body.appendChild(ionSelect);

                adapter.setValue(ionSelect, 'selected-option');

                expect(ionSelect.value).toBe('selected-option');

                document.body.removeChild(ionSelect);
            });

            it('should trigger ionChange event on ion-select', () => {
                const ionSelect = document.createElement('ion-select');
                document.body.appendChild(ionSelect);

                const events = spyOnDispatchEvent(ionSelect);

                adapter.setValue(ionSelect, 'option1');

                const ionChangeEvents = events.filter(e => e.type === 'ionChange');
                expect(ionChangeEvents.length).toBeGreaterThan(0);

                document.body.removeChild(ionSelect);
            });
        });

        describe('ion-checkbox', () => {
            it('should set checked value on ion-checkbox', () => {
                const ionCheckbox = document.createElement('ion-checkbox');
                document.body.appendChild(ionCheckbox);

                adapter.setValue(ionCheckbox, true);

                expect(ionCheckbox.checked).toBe(true);

                document.body.removeChild(ionCheckbox);
            });

            it('should trigger ionChange event on ion-checkbox', () => {
                const ionCheckbox = document.createElement('ion-checkbox');
                document.body.appendChild(ionCheckbox);

                const events = spyOnDispatchEvent(ionCheckbox);

                adapter.setValue(ionCheckbox, true);

                const ionChangeEvents = events.filter(e => e.type === 'ionChange');
                expect(ionChangeEvents.length).toBeGreaterThan(0);

                document.body.removeChild(ionCheckbox);
            });
        });

        describe('ion-toggle', () => {
            it('should set checked value on ion-toggle', () => {
                const ionToggle = document.createElement('ion-toggle');
                document.body.appendChild(ionToggle);

                adapter.setValue(ionToggle, true);

                expect(ionToggle.checked).toBe(true);

                document.body.removeChild(ionToggle);
            });

            it('should trigger ionChange event on ion-toggle', () => {
                const ionToggle = document.createElement('ion-toggle');
                document.body.appendChild(ionToggle);

                const events = spyOnDispatchEvent(ionToggle);

                adapter.setValue(ionToggle, false);

                const ionChangeEvents = events.filter(e => e.type === 'ionChange');
                expect(ionChangeEvents.length).toBeGreaterThan(0);

                document.body.removeChild(ionToggle);
            });
        });

        describe('native inputs', () => {
            it('should fall back to native setter for regular inputs', () => {
                const input = document.createElement('input');
                input.type = 'text';
                document.body.appendChild(input);

                adapter.setValue(input, 'native value');

                expect(input.value).toBe('native value');

                document.body.removeChild(input);
            });
        });
    });

    describe('detectIonicComponents', () => {
        it('should return true when ion-input exists', () => {
            const ionInput = document.createElement('ion-input');
            document.body.appendChild(ionInput);

            const result = adapter.detectIonicComponents();

            expect(result).toBe(true);

            document.body.removeChild(ionInput);
        });

        it('should return true when ion-radio exists', () => {
            const ionRadio = document.createElement('ion-radio');
            document.body.appendChild(ionRadio);

            const result = adapter.detectIonicComponents();

            expect(result).toBe(true);

            document.body.removeChild(ionRadio);
        });

        it('should return false when no Ionic components exist', () => {
            const result = adapter.detectIonicComponents();

            expect(result).toBe(false);
        });
    });

    describe('setIonicInputValue', () => {
        it('should set value and dispatch ionChange event', () => {
            const ionInput = document.createElement('ion-input');
            document.body.appendChild(ionInput);

            const events = spyOnDispatchEvent(ionInput);

            adapter.setIonicInputValue(ionInput, 'test');

            expect(ionInput.value).toBe('test');
            expect(events.some(e => e.type === 'ionChange')).toBe(true);
            expect(events.some(e => e.type === 'ionInput')).toBe(true);

            document.body.removeChild(ionInput);
        });
    });

    describe('setIonicSelectValue', () => {
        it('should set value and dispatch ionChange event', () => {
            const ionSelect = document.createElement('ion-select');
            document.body.appendChild(ionSelect);

            const events = spyOnDispatchEvent(ionSelect);

            adapter.setIonicSelectValue(ionSelect, 'selected');

            expect(ionSelect.value).toBe('selected');
            expect(events.some(e => e.type === 'ionChange')).toBe(true);

            document.body.removeChild(ionSelect);
        });
    });

    describe('integration tests', () => {
        it('should detect and fill Ionic form', () => {
            // Create mock Ionic app
            const ionApp = document.createElement('ion-app');
            const ionInput = document.createElement('ion-input');
            ionInput.setAttribute('name', 'username');
            ionApp.appendChild(ionInput);
            document.body.appendChild(ionApp);

            // Detect
            const detected = adapter.detect();
            expect(detected).toBe(ionApp);

            // Fill
            adapter.setValue(ionInput, 'ionicuser');

            expect(ionInput.value).toBe('ionicuser');

            document.body.removeChild(ionApp);
        });

        it('should handle multiple Ionic component types', () => {
            const ionApp = document.createElement('ion-app');
            const ionInput = document.createElement('ion-input');
            const ionCheckbox = document.createElement('ion-checkbox');
            const ionSelect = document.createElement('ion-select');

            ionApp.appendChild(ionInput);
            ionApp.appendChild(ionCheckbox);
            ionApp.appendChild(ionSelect);
            document.body.appendChild(ionApp);

            adapter.setValue(ionInput, 'text value');
            adapter.setValue(ionCheckbox, true);
            adapter.setValue(ionSelect, 'option1');

            expect(ionInput.value).toBe('text value');
            expect(ionCheckbox.checked).toBe(true);
            expect(ionSelect.value).toBe('option1');

            document.body.removeChild(ionApp);
        });
    });
});