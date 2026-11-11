import { execFileSync } from "node:child_process";
import { requireTestDatabase } from "./require-dev-database";

// The output a failed execFileSync attaches to its error. Prisma writes the
// reason to stderr; stdout holds only its header.
function outputOf(error: unknown, stream: "stdout" | "stderr"): string {
  if (typeof error !== "object" || error === null || !(stream in error)) {
    return "";
  }
  return String((error as Record<string, unknown>)[stream]);
}

// Refuses a database that is not a test database, then brings it to the schema
// of this branch (`prisma migrate deploy`). The URL is handed to Prisma
// explicitly: prisma.config.ts loads .env, and dotenv never overrides a
// variable that is already set. Used by the global setup of the integration
// tests and by the seed of the end-to-end tests.
export function migrateTestDatabase(
  connectionString: string | undefined,
): void {
  const url = requireTestDatabase(connectionString);
  try {
    execFileSync("npx", ["prisma", "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
      stdio: "pipe",
    });
  } catch (error) {
    throw new Error(
      `prisma migrate deploy failed on the test database\n${outputOf(error, "stdout")}${outputOf(error, "stderr")}`,
    );
  }
}
