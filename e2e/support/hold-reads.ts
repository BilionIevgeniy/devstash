import type { BrowserContext } from "@playwright/test";
import { Client, DatabaseError } from "pg";
import { requireTestDatabase } from "../../scripts/require-dev-database";
import { waitForContextAnswers } from "./network";

// Holds the server's answer back without a test path in production code: the
// test takes a lock on a table, so every read of it waits and the production
// build streams its loading state, until the lock is released (ADR 0035). The
// tables are Prisma models; a request reads "User" first (its session), so
// that lock holds a whole page, and "Item" or "Collection" holds the parts of
// a page whose session and plan have been read.
export type HeldTable = "User" | "Item" | "Collection" | "UserPreference";

export type ReleaseReads = () => Promise<void>;

/** A lock the test forgot is dropped by the server, so the run goes on. */
const SERVER_RELEASE_MS = 60_000;
const LOCK_TIMEOUT_MS = 10_000;
const ATTEMPTS = 3;
/** Deadlock with a read in flight, and a lock that did not come in time. */
const RETRIED = new Set(["40P01", "55P03"]);

async function lock(client: Client, tables: HeldTable[]): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await client.query("BEGIN");
      await client.query(`SET LOCAL lock_timeout = ${LOCK_TIMEOUT_MS}`);
      await client.query(
        `SET LOCAL idle_in_transaction_session_timeout = ${SERVER_RELEASE_MS}`,
      );
      // The names are a literal union, quoted: Prisma's tables are mixed case.
      const names = tables.map((table) => `"${table}"`).join(", ");
      await client.query(`LOCK TABLE ${names} IN ACCESS EXCLUSIVE MODE`);
      return;
    } catch (error) {
      await client.query("ROLLBACK");
      const code = error instanceof DatabaseError ? error.code : undefined;
      if (attempt === ATTEMPTS || !code || !RETRIED.has(code)) throw error;
    }
  }
}

/** Call it through the `holdReads` fixture of support/test.ts, which releases. */
export async function holdReads(
  context: BrowserContext,
  ...tables: HeldTable[]
): Promise<ReleaseReads> {
  // A page that is already open has prefetches in flight: their reads are not
  // caught half way by the lock.
  await waitForContextAnswers(context);
  const client = new Client({
    connectionString: requireTestDatabase(process.env.TEST_DATABASE_URL),
  });
  // Without a listener an error event would end the worker, not fail the test.
  let lost: Error | null = null;
  client.on("error", (error) => {
    lost = error;
  });
  await client.connect();
  try {
    await lock(client, tables);
  } catch (error) {
    await client.end();
    throw error;
  }
  let released = false;
  return async () => {
    if (released) return;
    released = true;
    // A lock the server dropped would have let the answer through early: the
    // ROLLBACK fails then, and so does the test.
    try {
      if (lost) throw lost;
      await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  };
}
