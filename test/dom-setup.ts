import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest globals are off, so Testing Library cannot register its own hooks:
// it neither unmounts after a test nor tells React that updates belong in
// `act`. Both are done here.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

afterEach(() => {
  cleanup();
});

// jsdom has no pointer capture and does not scroll. Radix Select calls these
// two when it opens (SortSelect.test.tsx).
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.scrollIntoView ??= () => undefined;
