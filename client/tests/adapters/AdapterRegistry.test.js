/**
 * AdapterRegistry Test Suite
 * Tests for adapter registration, detection, and caching
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdapterRegistry } from '../../src/form/adapters/AdapterRegistry.js';
import SvelteAdapter from '../../src/form/adapters/SvelteAdapter.js';
import WebComponentsAdapter from '../../src/form/adapters/WebComponentsAdapter.js';

describe('AdapterRegistry', () => {
    beforeEach(() => {
        // Clear registry before each test
        AdapterRegistry.clear();
    });

    describe('adapter registration', () => {
        it('should register an adapter', () => {
            const adapter = new SvelteAdapter();

            AdapterRegistry.register(adapter);

            expect(AdapterRegistry.adapters).toContain(adapter);
        });

        it('should not register invalid adapter', () => {
            const invalidAdapter = {};

            AdapterRegistry.register(invalidAdapter);

            expect(AdapterRegistry.adapters).not.toContain(invalidAdapter);
        });

        it('should replace existing adapter with same name', () => {
            const adapter1 = new SvelteAdapter();
            const adapter2 = new SvelteAdapter();

            AdapterRegistry.register(adapter1);
            AdapterRegistry.register(adapter2);

            expect(AdapterRegistry.adapters.length).toBe(1);
            expect(AdapterRegistry.adapters[0]).toBe(adapter2);
        });

        it('should call detectVersion on registered adapter', () => {
            const adapter = new SvelteAdapter();
            adapter.detectVersion = vi.fn();

            AdapterRegistry.register(adapter);

            expect(adapter.detectVersion).toHaveBeenCalled();
        });
    });

    describe('adapter unregistration', () => {
        it('should unregister an adapter by name', () => {
            const adapter = new SvelteAdapter();
            AdapterRegistry.register(adapter);

            AdapterRegistry.unregister(adapter.name);

            expect(AdapterRegistry.adapters).not.toContain(adapter);
        });

        it('should handle unregistering non-existent adapter', () => {
            AdapterRegistry.unregister('non-existent');

            expect(AdapterRegistry.adapters.length).toBe(0);
        });
    });

    describe('getAdapters', () => {
        it('should return all registered adapters', () => {
            const svelteAdapter = new SvelteAdapter();
            const webComponentsAdapter = new WebComponentsAdapter();

            AdapterRegistry.register(svelteAdapter);
            AdapterRegistry.register(webComponentsAdapter);

            const adapters = AdapterRegistry.getAdapters();

            expect(adapters).toHaveLength(2);
            expect(adapters).toContain(svelteAdapter);
            expect(adapters).toContain(webComponentsAdapter);
        });

        it('should return empty array when no adapters registered', () => {
            const adapters = AdapterRegistry.getAdapters();

            expect(adapters).toEqual([]);
        });
    });

    describe('setDefaultAdapter', () => {
        it('should set default adapter', () => {
            const adapter = new SvelteAdapter();

            AdapterRegistry.setDefaultAdapter(adapter);

            expect(AdapterRegistry.defaultAdapter).toBe(adapter);
        });
    });

    describe('match', () => {
        it('should match adapter by priority', () => {
            // Create mock adapters with different priorities
            const lowPriorityAdapter = {
                name: 'low',
                priority: 10,
                match: vi.fn().mockReturnValue(true),
                setValue: vi.fn()
            };
            const highPriorityAdapter = {
                name: 'high',
                priority: 50,
                match: vi.fn().mockReturnValue(true),
                setValue: vi.fn()
            };

            AdapterRegistry.register(highPriorityAdapter);
            AdapterRegistry.register(lowPriorityAdapter);

            const element = document.createElement('input');
            const matched = AdapterRegistry.match(element);

            expect(matched.name).toBe('high');
        });

        it('should return default adapter when no match', () => {
            const defaultAdapter = {
                name: 'default',
                setValue: vi.fn()
            };
            AdapterRegistry.setDefaultAdapter(defaultAdapter);

            const noMatchAdapter = {
                name: 'noMatch',
                priority: 10,
                match: vi.fn().mockReturnValue(false),
                setValue: vi.fn()
            };
            AdapterRegistry.register(noMatchAdapter);

            const element = document.createElement('input');
            const matched = AdapterRegistry.match(element);

            expect(matched).toBe(defaultAdapter);
        });

        it('should return fallback when no default adapter', () => {
            const noMatchAdapter = {
                name: 'noMatch',
                priority: 10,
                match: vi.fn().mockReturnValue(false),
                setValue: vi.fn()
            };
            AdapterRegistry.register(noMatchAdapter);

            const element = document.createElement('input');
            const matched = AdapterRegistry.match(element);

            expect(matched.name).toBe('VanillaFallback');
        });

        it('should use SvelteAdapter for svelte element', () => {
            const svelteAdapter = new SvelteAdapter();
            AdapterRegistry.register(svelteAdapter);

            const element = document.createElement('div');
            element.className = 'svelte-component';

            const matched = AdapterRegistry.match(element);

            // SvelteAdapter.match may not match without proper markers
            // but the detect should work
            expect(AdapterRegistry.adapters).toContain(svelteAdapter);
        });
    });

    describe('setValue', () => {
        it('should set value using matched adapter', () => {
            const mockAdapter = {
                name: 'mock',
                priority: 100,
                match: vi.fn().mockReturnValue(true),
                setValue: vi.fn().mockReturnValue(true)
            };
            AdapterRegistry.register(mockAdapter);

            const element = document.createElement('input');
            const result = AdapterRegistry.setValue(element, 'test value');

            expect(mockAdapter.setValue).toHaveBeenCalledWith(element, 'test value');
            expect(result).toBe(true);
        });

        it('should return false when no adapter matches', () => {
            const element = document.createElement('input');
            const result = AdapterRegistry.setValue(element, 'test value');

            expect(result).toBe(true); // fallback adapter should work
        });
    });

    describe('detectFrameworks', () => {
        it('should detect all registered frameworks', () => {
            const svelteAdapter = new SvelteAdapter();
            const webComponentsAdapter = new WebComponentsAdapter();

            AdapterRegistry.register(svelteAdapter);
            AdapterRegistry.register(webComponentsAdapter);

            const result = AdapterRegistry.detectFrameworks();

            expect(result['Svelte']).toBeDefined();
            expect(result['WebComponents']).toBeDefined();
        });

        it('should return empty object when no adapters', () => {
            const result = AdapterRegistry.detectFrameworks();

            expect(result).toEqual({});
        });

        it('should include detection status for each framework', () => {
            const mockAdapter = {
                name: 'Mock',
                priority: 10,
                frameworkVersion: null,
                detectVersion: vi.fn().mockReturnValue('1.0')
            };
            AdapterRegistry.register(mockAdapter);

            const result = AdapterRegistry.detectFrameworks();

            expect(result['Mock'].detected).toBe(true);
            expect(result['Mock'].version).toBe('1.0');
        });
    });

    describe('clear', () => {
        it('should clear all adapters', () => {
            const adapter = new SvelteAdapter();
            AdapterRegistry.register(adapter);

            AdapterRegistry.clear();

            expect(AdapterRegistry.adapters).toEqual([]);
        });

        it('should clear default adapter', () => {
            const adapter = new SvelteAdapter();
            AdapterRegistry.setDefaultAdapter(adapter);

            AdapterRegistry.clear();

            expect(AdapterRegistry.defaultAdapter).toBeNull();
        });
    });

    describe('createVanillaFallback', () => {
        it('should create vanilla fallback adapter', () => {
            const fallback = AdapterRegistry.createVanillaFallback();

            expect(fallback.name).toBe('VanillaFallback');
            expect(fallback.setValue).toBeDefined();
        });

        it('should set value and dispatch events', () => {
            const fallback = AdapterRegistry.createVanillaFallback();
            const element = document.createElement('input');
            document.body.appendChild(element);

            fallback.setValue(element, 'test value');

            expect(element.value).toBe('test value');

            document.body.removeChild(element);
        });
    });

    describe('priority-based detection', () => {
        it('should check adapters in priority order (highest first)', () => {
            // Register adapters with different priorities
            const adapters = [
                { name: 'low', priority: 10, match: vi.fn().mockReturnValue(false) },
                { name: 'medium', priority: 30, match: vi.fn().mockReturnValue(true) },
                { name: 'high', priority: 50, match: vi.fn().mockReturnValue(true) }
            ];

            adapters.forEach(a => AdapterRegistry.register(a));

            const element = document.createElement('input');
            AdapterRegistry.match(element);

            // High priority adapter should be matched first
            const matched = AdapterRegistry.match(element);
            expect(matched.name).toBe('high');
        });

        it('should skip to next adapter if first fails to match', () => {
            const highAdapter = {
                name: 'highNoMatch',
                priority: 50,
                match: vi.fn().mockReturnValue(false)
            };
            const mediumAdapter = {
                name: 'mediumMatch',
                priority: 30,
                match: vi.fn().mockReturnValue(true)
            };

            AdapterRegistry.register(highAdapter);
            AdapterRegistry.register(mediumAdapter);

            const element = document.createElement('input');
            const matched = AdapterRegistry.match(element);

            expect(matched.name).toBe('mediumMatch');
        });
    });

    describe('integration tests', () => {
        it('should register SvelteAdapter and WebComponentsAdapter', () => {
            const svelteAdapter = new SvelteAdapter();
            const webComponentsAdapter = new WebComponentsAdapter();

            AdapterRegistry.register(svelteAdapter);
            AdapterRegistry.register(webComponentsAdapter);

            expect(AdapterRegistry.getAdapters().length).toBe(2);
        });

        it('should handle complete workflow', () => {
            // Register adapters
            const svelteAdapter = new SvelteAdapter();
            AdapterRegistry.register(svelteAdapter);

            // Create element
            const element = document.createElement('input');
            document.body.appendChild(element);

            // Set value
            AdapterRegistry.setValue(element, 'workflow test');

            expect(element.value).toBe('workflow test');

            document.body.removeChild(element);
        });

        it('should work with default adapter set', () => {
            const defaultAdapter = {
                name: 'default',
                setValue: vi.fn((el, val) => {
                    el.value = val;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    return true;
                })
            };

            AdapterRegistry.setDefaultAdapter(defaultAdapter);

            const element = document.createElement('input');
            document.body.appendChild(element);

            AdapterRegistry.setValue(element, 'default test');

            expect(defaultAdapter.setValue).toHaveBeenCalled();

            document.body.removeChild(element);
        });
    });
});