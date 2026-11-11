import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { E2E_USER_EMAIL_VAR } from "../scripts/e2e-user";
import { requireTestDatabase } from "../scripts/require-dev-database";

// Runs once, after the web server is up and before the first test: prepares
// the test database for this run. The seed runs in a child process under tsx,
// where the generated Prisma client loads as it does for `db:seed-test`. The
// email is new every run, because the per-email sign-in limit lives in Upstash
// and outlasts the database; it reaches the workers through process.env.
export default function globalSetup(): void {
  const databaseUrl = requireTestDatabase(process.env.TEST_DATABASE_URL);
  process.env[E2E_USER_EMAIL_VAR] = `e2e-${randomUUID()}@devstash.test`;

  execFileSync("npx", ["tsx", "scripts/seed-e2e.ts"], {
    env: { ...process.env, TEST_DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });
}
