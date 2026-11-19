import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { E2E_USER_EMAIL_VAR } from "../scripts/e2e-user";
import { FAKE_UPSTASH_URL, SRH_TOKEN } from "../scripts/fake-upstash";
import { requireTestDatabase } from "../scripts/require-dev-database";

// Runs once, after the web server is up and before the first test: prepares
// the test database for this run. The seed runs in a child process under tsx,
// where the generated Prisma client loads as it does for `db:seed-test`. The
// email is new every run, because the per-email sign-in limit lives in Upstash
// and outlasts the database; it reaches the workers through process.env.
// Sign-in is rate-limited and fails closed, so a stand-in that is down or
// cannot run ratelimit's scripts would show up only as a failed sign-in. One
// script with ratelimit's shebang, through the proxy and SRH to Redis, says
// which it is.
async function checkUpstashStandIn(): Promise<void> {
  const notRunning = new Error(
    'The Upstash stand-in cannot run ratelimit\'s scripts: start Redis and SRH, see "End-to-end tests" in README.md',
  );
  let answer: unknown;
  try {
    const response = await fetch(FAKE_UPSTASH_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${SRH_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify([
        "EVAL",
        "#!lua flags=allow-key-locking\nreturn 1",
        "0",
      ]),
    });
    answer = await response.json();
  } catch (error) {
    throw new Error(notRunning.message, { cause: error });
  }
  if ((answer as { result?: unknown }).result !== 1) {
    throw new Error(
      `${notRunning.message} (answer: ${JSON.stringify(answer)})`,
    );
  }
}

export default async function globalSetup(): Promise<void> {
  await checkUpstashStandIn();
  const databaseUrl = requireTestDatabase(process.env.TEST_DATABASE_URL);
  process.env[E2E_USER_EMAIL_VAR] = `e2e-${randomUUID()}@devstash.test`;

  execFileSync("npx", ["tsx", "scripts/seed-e2e.ts"], {
    env: { ...process.env, TEST_DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });
}
