import { spawnSync } from "node:child_process";
import { decideMigration } from "./migration-guard";

// The first half of `npm run vercel-build`: applies pending migrations to the
// database of this Vercel environment, then the build runs. The guard decides;
// this file only does the I/O. `npx` finds the local Prisma CLI whether the
// script runs through npm or through plain tsx.
const decision = decideMigration({
  vercelEnv: process.env.VERCEL_ENV,
  directUrl: process.env.DIRECT_URL,
  databaseUrl: process.env.DATABASE_URL,
});

if (!decision.migrate) {
  console.error(`Migration refused: ${decision.reason}`);
  process.exit(1);
}

console.log(`Migrating the ${decision.vercelEnv} database at ${decision.host}`);
const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
});
// A spawn that fails to start (npx missing) leaves no status and no output.
if (result.error) {
  console.error(`Could not run prisma migrate deploy: ${result.error.message}`);
}
process.exit(result.status ?? 1);
