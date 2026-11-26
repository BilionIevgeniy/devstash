import { createHash, randomUUID } from "node:crypto";
import { Client } from "pg";
import {
  accountDeletionPath,
  getAccountDeletionExpiry,
  getAccountDeletionIdentifier,
} from "../../src/features/auth/domain/account-deletion";
import { requireTestDatabase } from "../../scripts/require-dev-database";

// The path a working deletion link opens, for a user who is signed in already:
// the account loses its password, as a GitHub account has none, and gets the
// token the email would carry. Only for a fresh user of the test.
export async function openDeletionLink(email: string): Promise<string> {
  const token = randomUUID();
  const client = new Client({
    connectionString: requireTestDatabase(process.env.TEST_DATABASE_URL),
  });
  await client.connect();
  try {
    const updated = await client.query(
      'UPDATE "User" SET password = NULL WHERE email = $1',
      [email],
    );
    if (updated.rowCount !== 1) throw new Error("No such test user");
    await client.query(
      'INSERT INTO "VerificationToken" (identifier, token, expires) VALUES ($1, $2, $3)',
      [
        getAccountDeletionIdentifier(email),
        createHash("sha256").update(token).digest("hex"),
        // As UTC, like Prisma: pg writes a Date in the machine's time zone,
        // which a column without one drops.
        getAccountDeletionExpiry(new Date()).toISOString(),
      ],
    );
  } finally {
    await client.end();
  }
  return accountDeletionPath(email, token);
}
