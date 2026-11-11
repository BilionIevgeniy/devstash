import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { AUTH_FILE } from "./e2e/support/storage-state";
import { buildE2eServerEnv } from "./scripts/e2e-server-env";
import { requireTestDatabase } from "./scripts/require-dev-database";

// End-to-end smoke tests against the production build, on the test database.
// TEST_DATABASE_URL and the E2E_UPSTASH_* values come from the environment (CI)
// or .env.test (locally; a value already set wins). The test database goes
// through requireTestDatabase before anything starts, and the server gets an
// environment built from scratch (scripts/e2e-server-env.ts), so the database
// and the vendor keys of .env never reach it.
loadEnv({ path: ".env.test", quiet: true });

// Not 3000: a `npm run dev` on the usual port must not be mistaken for the test
// server, and the config never reuses a server that is already running.
const PORT = 3100;
const ORIGIN = `http://localhost:${PORT}`;
const BUILD_AND_START_TIMEOUT_MS = 5 * 60 * 1000;
// The sign-in redirect waits on several Upstash calls, a cold database
// connection and the first render of the dashboard: more than the default 5 s
// on a CI runner.
const EXPECT_TIMEOUT_MS = 10_000;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set: see "End-to-end tests" in README.md`);
  }
  return value;
}

const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  // One user and one database: the order of the tests is the order of the files.
  fullyParallel: false,
  workers: 1,
  expect: { timeout: EXPECT_TIMEOUT_MS },
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  reporter: isCi ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: ORIGIN, trace: "retain-on-failure" },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: AUTH_FILE },
    },
  ],
  webServer: {
    // `next start` listens on every interface by default; the test server holds
    // the Upstash token and a public AUTH_SECRET, so it stays on this machine.
    command: "npm run build && npm run start -- --hostname localhost",
    url: ORIGIN,
    reuseExistingServer: false,
    timeout: BUILD_AND_START_TIMEOUT_MS,
    // A failed `next build` is unreadable without its output.
    stdout: isCi ? "pipe" : "ignore",
    env: buildE2eServerEnv({
      origin: ORIGIN,
      port: PORT,
      databaseUrl: requireTestDatabase(process.env.TEST_DATABASE_URL),
      upstashUrl: required("E2E_UPSTASH_REDIS_REST_URL"),
      upstashToken: required("E2E_UPSTASH_REDIS_REST_TOKEN"),
    }),
  },
});
