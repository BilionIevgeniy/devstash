import {
  DEV_DATABASE_HOST,
  endpointHost,
  isPoolerHost,
  PROD_DATABASE_HOST,
} from "./neon-endpoints";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

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

// The integration tests empty every table, so they run only on a database
// made for them: a local Postgres, or the one host named in
// TEST_DATABASE_HOST (a Neon branch of its own). The development and the
// production endpoint are refused even when configured, under any name of
// theirs (their endpoint id is compared, not the whole host), and so is a
// pooled host: `prisma migrate deploy` takes a lock the transaction pooler
// does not keep. A `host` or `hostaddr` parameter is refused too: pg and
// Prisma connect to it instead of the host the URL shows.

const HOST_OVERRIDE_PARAMS = ["host", "hostaddr"];

function endpointId(hostname: string): string {
  return endpointHost(hostname).split(".")[0];
}

const PROTECTED_ENDPOINT_IDS = new Set(
  [DEV_DATABASE_HOST, PROD_DATABASE_HOST].map(endpointId),
);

// The message of a failed parse would carry the whole URL, password included.
function parseDatabaseUrl(connectionString: string): URL {
  try {
    return new URL(connectionString);
  } catch {
    throw new Error("Refusing to run: TEST_DATABASE_URL is not a valid URL");
  }
}

export function isTestDatabase(
  connectionString: string,
  configuredHost?: string,
): boolean {
  const url = parseDatabaseUrl(connectionString);
  const host = url.hostname;
  if (HOST_OVERRIDE_PARAMS.some((name) => url.searchParams.has(name))) {
    return false;
  }
  if (PROTECTED_ENDPOINT_IDS.has(endpointId(host))) return false;
  if (isPoolerHost(host)) return false;
  return LOCAL_HOSTS.has(host) || (!!configuredHost && host === configuredHost);
}

export function requireTestDatabase(
  connectionString: string | undefined,
  configuredHost: string | undefined = process.env.TEST_DATABASE_HOST,
): string {
  if (!connectionString) {
    throw new Error("Refusing to run: TEST_DATABASE_URL is not set");
  }
  if (!isTestDatabase(connectionString, configuredHost)) {
    const host = parseDatabaseUrl(connectionString).hostname;
    throw new Error(`Refusing to run: ${host} is not a test database`);
  }
  return connectionString;
}
