import { DEV_DATABASE_HOST, PROD_DATABASE_HOST } from "../neon-endpoints";

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

// The endpoints before the move. They are only here and in the guards' tests.
export const MOVE_HOSTS: Record<MoveName, { source: string; target: string }> =
  {
    development: {
      source: "ep-calm-voice-b4zvdl6z.c-6.us-east-2.aws.neon.tech",
      target: DEV_DATABASE_HOST,
    },
    production: {
      source: "ep-twilight-hat-b4ay1zs8.c-6.us-east-2.aws.neon.tech",
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

// Only the parts named here are used to connect, so a `host` parameter of the
// URL cannot lead anywhere else. The URL itself is never in an error.
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
  // The exact direct host: a pooled one keeps no session, which pg_dump needs.
  if (url.hostname !== expectedHost) {
    throw new Error(`${label} must be ${expectedHost}, not ${url.hostname}`);
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

export function pooled(connection: Connection): Connection {
  const host = connection.host.replace(/^([^.]+)\./, "$1-pooler.");
  return { ...connection, host };
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
