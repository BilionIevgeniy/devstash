import { DEV_DATABASE_HOST, endpointHost } from "./neon-endpoints";

// A script that deletes data runs only on the `development` branch, so a .env
// pointed at production stops it before any query. The pooled and the direct
// host of the endpoint both count, as in the migration guard.

export function isDevDatabase(connectionString: string): boolean {
  return endpointHost(new URL(connectionString).hostname) === DEV_DATABASE_HOST;
}

export function requireDevDatabase(connectionString: string): void {
  if (!isDevDatabase(connectionString)) {
    const host = new URL(connectionString).hostname;
    throw new Error(`Refusing to run: ${host} is not the development database`);
  }
}
