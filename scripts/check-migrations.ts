import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import { migrateTestDatabase } from "./migrate-test-database";
import { requireTestDatabase } from "./require-dev-database";

// Fails when prisma/schema.prisma and prisma/migrations disagree: a schema
// change without its migration, or a migration the schema does not describe.
// It applies every migration to the test database (TEST_DATABASE_URL, locally
// from .env.test; refused unless it is a test database) and compares that
// database with the schema. No shadow database is needed. Prisma's exit code is
// passed on: 0 in sync, 2 a difference (printed as a summary), 1 an error. Run
// by the `integration` job before the tests (ADR 0028).
//
// The URL is handed to Prisma explicitly: prisma.config.ts loads .env, whose
// DIRECT_URL is the development database, and dotenv never overrides a
// variable that is already set.
config({ path: ".env.test", quiet: true });

const url = requireTestDatabase(process.env.TEST_DATABASE_URL);
migrateTestDatabase(url);

const diff = spawnSync(
  "npx",
  [
    "prisma",
    "migrate",
    "diff",
    "--from-config-datasource",
    "--to-schema",
    "prisma/schema.prisma",
    "--exit-code",
  ],
  {
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    stdio: "inherit",
  },
);

if (diff.status === 2) {
  console.error(
    "prisma/schema.prisma differs from prisma/migrations: create the migration with `npx prisma migrate dev`.",
  );
}
process.exitCode = diff.status ?? 1;
