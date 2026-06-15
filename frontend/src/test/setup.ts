import "@testing-library/jest-dom/vitest";

const testStorage = new Map<string, string>();

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

Object.defineProperty(window, "localStorage", {
  writable: true,
  value: {
    clear: () => testStorage.clear(),
    getItem: (key: string) => testStorage.get(key) ?? null,
    key: (index: number) => Array.from(testStorage.keys())[index] ?? null,
    removeItem: (key: string) => testStorage.delete(key),
    setItem: (key: string, value: string) => testStorage.set(key, value),
    get length() {
      return testStorage.size;
    },
  } satisfies Storage,
});

Object.defineProperty(window, "runtime", {
  writable: true,
  value: {
    EventsOn: () => () => undefined,
    EventsOnMultiple: () => () => undefined,
  },
});

Object.defineProperty(window, "go", {
  writable: true,
  value: {
    main: {
      App: {},
    },
  },
});
