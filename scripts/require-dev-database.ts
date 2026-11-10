import { DEV_DATABASE_HOST } from "./neon-endpoints";

// A script that deletes data runs only on the `development` branch, so a .env
// pointed at production stops it before any query.

export function isDevDatabase(connectionString: string): boolean {
  return new URL(connectionString).hostname === DEV_DATABASE_HOST;
}

export function requireDevDatabase(connectionString: string): void {
  if (!isDevDatabase(connectionString)) {
    const host = new URL(connectionString).hostname;
    throw new Error(`Refusing to run: ${host} is not the development database`);
  }
}
