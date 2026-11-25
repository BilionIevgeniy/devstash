import {
  DEV_DATABASE_HOST,
  OLD_DEV_DATABASE_HOST,
  OLD_PROD_DATABASE_HOST,
  PROD_DATABASE_HOST,
} from "../neon-endpoints";

// The pure half of the one-off move to Frankfurt (ADR 0038): which database may
// be copied where. It is deleted once the move is done; git keeps it.

export const MOVE_NAMES = ["development", "production"] as const;
export type MoveName = (typeof MOVE_NAMES)[number];

export const MOVE_COMMANDS = [
  "freeze",
  "unfreeze",
  "copy",
  "verify",
  "urls",
] as const;
export type MoveCommand = (typeof MOVE_COMMANDS)[number];

export const MOVE_HOSTS: Record<MoveName, { source: string; target: string }> =
  {
    development: {
      source: OLD_DEV_DATABASE_HOST,
      target: DEV_DATABASE_HOST,
    },
    production: {
      source: OLD_PROD_DATABASE_HOST,
      target: PROD_DATABASE_HOST,
    },
  };

export interface Connection {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
}

// The URL itself is never in an error.
export function parseConnection(
  label: string,
  value: string | undefined,
  expectedHost: string,
): Connection {
  if (!value) throw new Error(`${label} is not set`);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} is not a valid URL`);
  }
  if (url.hostname !== expectedHost) {
    throw new Error(`${label} must be ${expectedHost}, not ${url.hostname}`);
  }
  // pg connects to these parameters instead of the host of the URL.
  if (url.searchParams.has("host") || url.searchParams.has("hostaddr")) {
    throw new Error(`${label} must not have a host parameter`);
  }
  const database = url.pathname.slice(1);
  if (!url.username || !url.password || !database) {
    throw new Error(`${label} needs a user, a password and a database`);
  }
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    ssl: true,
  };
}

// Two URLs of one move must name the same database and role: a compute also
// serves `postgres`, and a role of its own would keep writing through a freeze
// that ended only the sessions of the other.
export function requireSame(
  a: Connection,
  b: Connection,
  keys: readonly ("database" | "user")[],
): void {
  for (const key of keys) {
    if (a[key] !== b[key]) {
      throw new Error(`${a.host} and ${b.host} name a different ${key}`);
    }
  }
}

export function pooledHost(host: string): string {
  return host.replace(/^([^.]+)\./, "$1-pooler.");
}

export function pooled(connection: Connection): Connection {
  return { ...connection, host: pooledHost(connection.host) };
}

export type Fingerprint = Record<string, string>;

// What differs between the two sides, by name only: the values are hashes and
// counts of tables, and definitions of the schema.
export function differences(
  source: Fingerprint,
  target: Fingerprint,
): string[] {
  const names = new Set([...Object.keys(source), ...Object.keys(target)]);
  return [...names]
    .filter((name) => source[name] !== target[name])
    .map((name) => {
      if (!(name in source)) return `${name}: only in the target`;
      if (!(name in target)) return `${name}: only in the source`;
      return `${name}: differs`;
    })
    .sort();
}

// Tables that are never empty in a database of the app. Two wrong, empty
// databases are equal too, and that must not pass.
const NEVER_EMPTY = ["User", "ItemType", "_prisma_migrations"];

export function emptyTables(fingerprint: Fingerprint): string[] {
  return NEVER_EMPTY.filter((table) => {
    const rows = fingerprint[`rows ${table}`];
    return rows === undefined || rows.startsWith("0 rows");
  });
}
