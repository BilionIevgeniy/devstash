import { execFileSync } from "node:child_process";
import { requireTestDatabase } from "../../scripts/require-dev-database";

// The output a failed execFileSync attaches to its error. Prisma writes the
// reason to stderr; stdout holds only its header.
function outputOf(error: unknown, stream: "stdout" | "stderr"): string {
  if (typeof error !== "object" || error === null || !(stream in error)) {
    return "";
  }
  return String((error as Record<string, unknown>)[stream]);
}

// Runs before any test file: refuses a database that is not a test database
// (vitest.integration.config.mts hands this URL to every worker), then brings
// it to the schema of this branch. The URL is handed to Prisma explicitly:
// prisma.config.ts loads .env, and dotenv never overrides a variable that is
// already set.
export default function setup(): void {
  const url = requireTestDatabase(process.env.TEST_DATABASE_URL);
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
