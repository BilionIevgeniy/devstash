import { config } from "dotenv";
import { defineConfig } from "vitest/config";
import { sharedResolve } from "./vitest.shared.mjs";

// The integration tests: real Prisma on the test database, every vendor
// mocked (test/integration/setup.ts). A config of its own, not a project of
// vitest.config.mts, so `npm run test` and `test:watch` never run them on a
// machine without a test database. An editor extension that picks this config
// up is refused by the global setup when no test database is set.
//
// TEST_DATABASE_URL comes from the environment (CI) or .env.test (locally;
// a value already set wins). Each worker gets it as DATABASE_URL, which
// src/lib/prisma.ts reads, so the database of .env is never used. The guard
// (requireTestDatabase) runs in the global setup, which Vitest finishes before
// it starts any test file.
config({ path: ".env.test", quiet: true });
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? "";

export default defineConfig({
  resolve: sharedResolve,
  test: {
    name: "integration",
    environment: "node",
    include: ["src/**/*.int.test.ts"],
    // One shared database: a file empties it before its tests, so two files
    // must never run at the same time.
    fileParallelism: false,
    mockReset: true,
    // A `vi.stubEnv` (a Stripe price id) ends with its test. DATABASE_URL
    // comes from `env` below, not from a stub, so it stays.
    unstubEnvs: true,
    env: { DATABASE_URL: testDatabaseUrl, DIRECT_URL: testDatabaseUrl },
    globalSetup: ["./test/integration/global-setup.ts"],
    setupFiles: ["./test/integration/setup.ts"],
    // A Neon compute waking up and the advisory-lock race can take seconds.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
