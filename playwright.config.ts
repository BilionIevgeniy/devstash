import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { AUTH_FILE, E2E_ORIGIN, E2E_PORT } from "./e2e/support/storage-state";
import { buildE2eServerEnv } from "./scripts/e2e-server-env";
import { FAKE_OPENAI_PORT } from "./scripts/fake-openai";
import { FAKE_R2_PORT } from "./scripts/fake-r2";
import { FAKE_SENTRY_PORT } from "./scripts/fake-sentry";
import { FAKE_UPSTASH_PORT } from "./scripts/fake-upstash";
import { requireTestDatabase } from "./scripts/require-dev-database";

// End-to-end tests against the production build, on the test database.
// TEST_DATABASE_URL comes from the environment (CI) or .env.test (locally; a
// value already set wins) and goes through requireTestDatabase before anything
// starts. The server gets an environment built from scratch
// (scripts/e2e-server-env.ts), so the database and the vendor keys of .env
// never reach it: OpenAI, R2 and Upstash are local stand-ins (ADR 0035).
loadEnv({ path: ".env.test", quiet: true });

// The config never reuses a server that is already running.
const PORT = E2E_PORT;
const ORIGIN = E2E_ORIGIN;
const BUILD_AND_START_TIMEOUT_MS = 5 * 60 * 1000;
// The sign-in redirect waits on several Upstash calls, a cold database
// connection and the first render of the dashboard: more than the default 5 s
// on a CI runner.
const EXPECT_TIMEOUT_MS = 10_000;

const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  // One user and one database: the order of the tests is the order of the files.
  fullyParallel: false,
  workers: 1,
  expect: {
    timeout: EXPECT_TIMEOUT_MS,
    // A small absolute budget, not a ratio: a changed border or button color
    // (a few hundred pixels) must fail, anti-aliasing noise must not.
    // The threshold is how far one pixel may be off: 0.02 is about 5 of 255
    // grey levels. Playwright's default of 0.2 is about 53 and let a whole row
    // of the dark palette turn from --popover to --muted (15 levels) unseen;
    // 0.05 would still miss a card that loses its background (13 levels).
    toHaveScreenshot: { maxDiffPixels: 100, threshold: 0.02 },
  },
  // A missing baseline is written and its test passes; the e2e job then fails
  // on the changed snapshot folder (.github/workflows/ci.yml). A changed one is
  // never overwritten: its test fails and its -actual.png goes to
  // test-results/. Both reach the job's artifact (README, "End-to-end tests").
  updateSnapshots: "missing",
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
  webServer: [
    {
      // The stand-in for the OpenAI API (scripts/fake-openai.ts), which the
      // test server reaches through OPENAI_BASE_URL.
      command: "npx tsx scripts/fake-openai.ts",
      url: `http://localhost:${FAKE_OPENAI_PORT}/health`,
      reuseExistingServer: false,
    },
    {
      // The stand-in for R2 (scripts/fake-r2.ts), reached through R2_ENDPOINT.
      command: "npx tsx scripts/fake-r2.ts",
      url: `http://localhost:${FAKE_R2_PORT}/health`,
      reuseExistingServer: false,
    },
    {
      // The proxy in front of the local Redis REST API (scripts/fake-upstash.ts);
      // Redis and SRH themselves run in Docker (README, "End-to-end tests").
      command: "npx tsx scripts/fake-upstash.ts",
      url: `http://localhost:${FAKE_UPSTASH_PORT}/health`,
      reuseExistingServer: false,
    },
    {
      command: "npx tsx scripts/fake-sentry.ts",
      url: `http://localhost:${FAKE_SENTRY_PORT}/health`,
      reuseExistingServer: false,
    },
    {
      // `next start` listens on every interface by default; the test server
      // signs sessions with a public AUTH_SECRET, so it stays on this machine
      // (scripts/e2e-start.ts passes --hostname localhost and also writes the
      // server's log to a file for e2e/egress.spec.ts).
      command: "npm run build && npx tsx scripts/e2e-start.ts",
      url: ORIGIN,
      reuseExistingServer: false,
      timeout: BUILD_AND_START_TIMEOUT_MS,
      // A failed `next build` is unreadable without its output.
      stdout: isCi ? "pipe" : "ignore",
      env: buildE2eServerEnv({
        origin: ORIGIN,
        port: PORT,
        databaseUrl: requireTestDatabase(process.env.TEST_DATABASE_URL),
      }),
    },
  ],
});
