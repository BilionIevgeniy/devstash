import { migrateTestDatabase } from "../../scripts/migrate-test-database";

// Runs before any test file: refuses a database that is not a test database
// (vitest.integration.config.mts hands this URL to every worker), then brings
// it to the schema of this branch.
export default function setup(): void {
  migrateTestDatabase(process.env.TEST_DATABASE_URL);
}
