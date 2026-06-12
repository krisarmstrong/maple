import "@testing-library/jest-dom/vitest";

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
