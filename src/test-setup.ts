// jsdom (used by the Vitest-based unit test runner) does not implement
// matchMedia. ThemeService and AdminLayoutComponent call it directly, so
// tests that construct either (even transitively) need this polyfill.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
