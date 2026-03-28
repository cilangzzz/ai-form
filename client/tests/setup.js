/**
 * Vitest setup file
 * Provides global test utilities and DOM mocks
 */

// Mock localStorage
const localStorageMock = {
    store: {},
    getItem(key) {
        return this.store[key] || null;
    },
    setItem(key, value) {
        this.store[key] = value;
    },
    removeItem(key) {
        delete this.store[key];
    },
    clear() {
        this.store = {};
    }
};

global.localStorage = localStorageMock;

// Reset localStorage before each test
beforeEach(() => {
    localStorageMock.clear();
});

// Mock window.customElements
if (!window.customElements) {
    window.customElements = {
        define: vi.fn(),
        get: vi.fn(),
        upgrade: vi.fn(),
        whenDefined: vi.fn(),
        size: 0
    };
}

// Helper to create mock elements
global.createMockElement = (tagName, attributes = {}) => {
    const element = document.createElement(tagName);
    for (const [key, value] of Object.entries(attributes)) {
        if (key === 'className') {
            element.className = value;
        } else {
            element.setAttribute(key, value);
        }
    }
    return element;
};

// Helper to create mock input element
global.createMockInput = (type = 'text', value = '') => {
    const input = document.createElement('input');
    input.type = type;
    input.value = value;
    return input;
};

// Helper to spy on dispatchEvent
global.spyOnDispatchEvent = (element) => {
    const events = [];
    const originalDispatchEvent = element.dispatchEvent.bind(element);
    element.dispatchEvent = vi.fn((event) => {
        events.push(event);
        return originalDispatchEvent(event);
    });
    return events;
};