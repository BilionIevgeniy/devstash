import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";
import { buildE2eServerEnv } from "./scripts/e2e-server-env";
import { requireTestDatabase } from "./scripts/require-dev-database";
import { AUTH_FILE } from "./e2e/support/storage-state";

// Next.js checks in `next dev` only that a navigation can show its loading
// state at once (instant validation, ADR 0037), and tells only the browser's
// console: the production build of the main suite never sees it. This config
// runs e2e/instant.spec.ts against `next dev`, on the same test database and
// stand-ins as the main suite, after it (they share the database).
const PORT = 3105;
const ORIGIN = `http://localhost:${PORT}`;
const DEV_START_TIMEOUT_MS = 3 * 60 * 1000;
// A route compiles on its first request in `next dev`.
const FIRST_COMPILE_MS = 90_000;

const [fakeOpenai, fakeR2, fakeUpstash, fakeSentry] = base.webServer as never[];

export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: /instant\.(setup|spec)\.ts$/,
  timeout: FIRST_COMPILE_MS * 2,
  expect: { timeout: FIRST_COMPILE_MS },
  retries: 0,
  reporter: "list",
  use: { baseURL: ORIGIN, trace: "retain-on-failure" },
  projects: [
    { name: "setup", testMatch: /instant\.setup\.ts/ },
    {
      name: "instant",
      testMatch: /instant\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: AUTH_FILE },
    },
  ],
  webServer: [
    fakeOpenai,
    fakeR2,
    fakeUpstash,
    fakeSentry,
    {
      // `next dev` writes to .next/dev, so the production build of the main
      // suite stays; only one dev server may run in the folder, so a
      // developer's own one is stopped first.
      command: `npx next dev --port ${PORT} --hostname localhost`,
      url: ORIGIN,
      reuseExistingServer: false,
      timeout: DEV_START_TIMEOUT_MS,
      env: {
        ...buildE2eServerEnv({
          origin: ORIGIN,
          port: PORT,
          databaseUrl: requireTestDatabase(process.env.TEST_DATABASE_URL),
        }),
        NODE_ENV: "development",
      },
    },
  ],
});
