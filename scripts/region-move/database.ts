import { spawnSync } from "node:child_process";
import { Client } from "pg";
import type { Connection, Fingerprint } from "./rules";

// Every step connects anew: `default_transaction_read_only` is read at connect.

const READ_ONLY_TRANSACTION = "25006";

export async function withClient<T>(
  connection: Connection,
  run: (client: Client) => Promise<T>,
): Promise<T> {
  const { ssl, ...rest } = connection;
  const client = new Client({ ...rest, ssl, connectionTimeoutMillis: 20_000 });
  // A terminated session also reports here; the query that failed throws.
  client.on("error", () => {});
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

function quoteIdentifier(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

// Committed on its own: sessions opened after it see the new default, and
// `terminateOthers` then ends every session opened before it. READ WRITE, so
// that it also works on a database that is already read-only.
export async function setReadOnly(
  connection: Connection,
  readOnly: boolean,
): Promise<void> {
  const database = quoteIdentifier(connection.database);
  const change = readOnly
    ? "SET default_transaction_read_only = on"
    : "RESET default_transaction_read_only";
  await withClient(connection, async (client) => {
    await client.query("BEGIN READ WRITE");
    await client.query(`ALTER DATABASE ${database} ${change}`);
    await client.query("COMMIT");
  });
}

export async function terminateOthers(connection: Connection): Promise<void> {
  await withClient(connection, (client) =>
    client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
       WHERE datname = current_database() AND usename = current_user
         AND pid <> pg_backend_pid()`,
    ),
  );
}

export async function isReadOnly(connection: Connection): Promise<boolean> {
  return withClient(connection, async (client) => {
    const { rows } = await client.query<{ value: string }>(
      "SELECT current_setting('default_transaction_read_only') AS value",
    );
    return rows[0].value === "on";
  });
}

// A write that changes no row: Postgres refuses it in a read-only transaction
// before it looks for rows.
export async function acceptsWrites(connection: Connection): Promise<boolean> {
  return withClient(connection, async (client) => {
    try {
      await client.query('UPDATE "User" SET "id" = "id" WHERE false');
      return true;
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === READ_ONLY_TRANSACTION
      ) {
        return false;
      }
      throw error;
    }
  });
}

export async function countTables(connection: Connection): Promise<number> {
  return withClient(connection, async (client) => {
    const { rows } = await client.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM pg_tables WHERE schemaname = 'public'`,
    );
    return rows[0].count;
  });
}

function pgEnv(prefix: string, connection: Connection): Record<string, string> {
  return {
    [`${prefix}HOST`]: connection.host,
    [`${prefix}PORT`]: String(connection.port),
    [`${prefix}USER`]: connection.user,
    [`${prefix}PASSWORD`]: connection.password,
    [`${prefix}DATABASE`]: connection.database,
    [`${prefix}SSL`]: connection.ssl ? "require" : "disable",
    [`${prefix}BINDING`]: connection.ssl ? "require" : "prefer",
  };
}

// `--create` is left out on purpose: it would carry the read-only default of a
// frozen source over to the target. The dump stays in the container.
const COPY_SCRIPT = `
set -euo pipefail
use() {
  for part in HOST PORT USER PASSWORD DATABASE; do
    from="$1$part"; export "PG$part=\${!from}"
  done
  from="$1SSL"; export PGSSLMODE="\${!from}"
  from="$1BINDING"; export PGCHANNELBINDING="\${!from}"
}
use SOURCE_
pg_dump --format=custom --no-owner --no-privileges --no-comments --file=/tmp/move.dump
use TARGET_
pg_restore --no-owner --no-privileges --exit-on-error --single-transaction --dbname="$PGDATABASE" /tmp/move.dump
psql --quiet --no-psqlrc --command='ANALYZE'
`;

// The values reach the container by the names of its variables, so no password
// is on a command line.
export function copyDatabase(source: Connection, target: Connection): void {
  const env = { ...pgEnv("SOURCE_", source), ...pgEnv("TARGET_", target) };
  const flags = Object.keys(env).flatMap((name) => ["--env", name]);
  const result = spawnSync(
    "docker",
    ["run", "--rm", ...flags, "postgres:18", "bash", "-c", COPY_SCRIPT],
    { stdio: "inherit", env: { ...process.env, ...env } },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("The copy failed, see above");
}

const SESSION_SETTINGS = [
  "SET TIME ZONE 'UTC'",
  "SET DateStyle = 'ISO, YMD'",
  "SET IntervalStyle = 'postgres'",
  "SET extra_float_digits = 1",
  "SET bytea_output = 'hex'",
];

// The position among the live columns, not `attnum`: a dropped column leaves a
// gap that a restore closes.
const SCHEMA_SQL = `
SELECT 'column ' || c.relname || '.' || a.attname AS name,
       concat_ws(' | ',
         row_number() OVER (PARTITION BY c.oid ORDER BY a.attnum),
         format_type(a.atttypid, a.atttypmod),
         a.attnotnull, a.attgenerated, l.collname,
         pg_get_expr(d.adbin, d.adrelid)) AS value
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid AND c.relkind = 'r'
LEFT JOIN pg_collation l ON l.oid = a.attcollation
LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
WHERE c.relnamespace = 'public'::regnamespace
  AND a.attnum > 0 AND NOT a.attisdropped
UNION ALL
SELECT 'index ' || indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public'
UNION ALL
SELECT 'constraint ' || conrelid::regclass || '.' || conname,
       pg_get_constraintdef(oid) || ' | ' || convalidated
FROM pg_constraint WHERE connamespace = 'public'::regnamespace
UNION ALL
SELECT 'extension ' || extname, extversion FROM pg_extension
UNION ALL
SELECT 'relation ' || relname, relkind::text FROM pg_class
WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r', 'v', 'm', 'S')
UNION ALL
SELECT 'database', concat_ws(' | ', datcollate, datctype,
  pg_encoding_to_char(encoding)) FROM pg_database
WHERE datname = current_database()
`;

async function tableFingerprint(client: Client, table: string) {
  const { rows } = await client.query<{ count: string; hash: string }>(
    `SELECT count(*) AS count,
            md5(coalesce(string_agg(md5(r), '' ORDER BY r COLLATE "C"), '')) AS hash
     FROM (SELECT t::text AS r FROM public.${quoteIdentifier(table)} t) AS all_rows`,
  );
  return `${rows[0].count} rows, ${rows[0].hash}`;
}

// The rows and the schema as names with counts and hashes, never a row.
export async function fingerprint(
  connection: Connection,
): Promise<Fingerprint> {
  return withClient(connection, async (client) => {
    for (const setting of SESSION_SETTINGS) await client.query(setting);
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const result: Fingerprint = {};
    const schema = await client.query<{ name: string; value: string }>(
      SCHEMA_SQL,
    );
    for (const { name, value } of schema.rows) result[name] = value;
    const tables = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
    );
    for (const { tablename } of tables.rows) {
      result[`rows ${tablename}`] = await tableFingerprint(client, tablename);
    }
    await client.query("COMMIT");
    return result;
  });
}
