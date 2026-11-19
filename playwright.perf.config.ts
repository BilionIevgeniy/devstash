import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// The lab measurements of docs/performance.md ("How to measure"): the same
// production build, stand-ins and seeded users as the end-to-end suite, but
// only the files under e2e/perf/. Not part of `npm run test:e2e` or CI:
// `npx playwright test --config playwright.perf.config.ts`.
export default defineConfig({
  ...base,
  testDir: "e2e",
  testMatch: /perf\/.*\.perf\.ts/,
  retries: 0,
});
