import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { Client } from "pg";
import { decideMigration } from "../migration-guard";
import {
  acceptsWrites,
  copyDatabase,
  countTables,
  fingerprint,
  isReadOnly,
  setReadOnly,
  terminateOthers,
} from "./database";
import {
  differences,
  MOVE_COMMANDS,
  MOVE_HOSTS,
  MOVE_NAMES,
  parseConnection,
  pooled,
  type Connection,
  type MoveCommand,
  type MoveName,
} from "./rules";

// The one-off move of a database to Frankfurt (ADR 0038):
//   npx tsx scripts/region-move/run.ts <development|production> <command>
// The URLs are in .env.move.<name>.local, which git ignores and Claude Code may
// not read: SOURCE_URL and TARGET_URL (direct), and for `urls` the two values
// that go into Vercel, VERCEL_DATABASE_URL and VERCEL_DIRECT_URL.

type Env = Record<string, string | undefined>;

interface Move {
  name: MoveName;
  env: Env;
  source: () => Connection;
  target: () => Connection;
}

async function assertWrites(connection: Connection, expected: boolean) {
  for (const side of [connection, pooled(connection)]) {
    if ((await acceptsWrites(side)) !== expected) {
      throw new Error(
        `${side.host} ${expected ? "still refuses" : "still accepts"} writes`,
      );
    }
    console.log(`${side.host} ${expected ? "accepts" : "refuses"} writes`);
  }
}

async function freeze({ source }: Move) {
  await setReadOnly(source(), true);
  await terminateOthers(source());
  await assertWrites(source(), false);
}

async function unfreeze({ source }: Move) {
  await setReadOnly(source(), false);
  await terminateOthers(source());
  await assertWrites(source(), true);
}

async function copy(move: Move) {
  const [source, target] = [move.source(), move.target()];
  if (!(await isReadOnly(source))) {
    throw new Error(`${source.host} is not frozen: run freeze first`);
  }
  if ((await countTables(target)) > 0) {
    throw new Error(`${target.host} already has tables`);
  }
  // No session that was opened before the freeze may write during the dump.
  await terminateOthers(source);
  copyDatabase(source, target);
  await verify(move);
}

async function verify({ source, target }: Move) {
  const [before, after] = [
    await fingerprint(source()),
    await fingerprint(target()),
  ];
  for (const [name, value] of Object.entries(after)) {
    if (name.startsWith("rows ")) console.log(`${name}: ${value}`);
  }
  if (await isReadOnly(target())) {
    throw new Error(`${target().host} is read-only`);
  }
  const found = differences(before, after);
  if (found.length > 0) {
    throw new Error(`The two sides differ:\n${found.join("\n")}`);
  }
  console.log(`Equal: ${Object.keys(after).length} checks`);
}

// What the build and the app will do with the two values. It proves the file,
// not what was pasted into Vercel.
async function urls({ name, env }: Move) {
  const databaseUrl = env.VERCEL_DATABASE_URL;
  const directUrl = env.VERCEL_DIRECT_URL;
  const decision = decideMigration({
    vercelEnv: name === "production" ? "production" : "preview",
    directUrl,
    databaseUrl,
  });
  if (!decision.migrate) throw new Error(decision.reason);
  for (const connectionString of [databaseUrl, directUrl]) {
    const client = new Client({ connectionString });
    await client.connect();
    await client.query("SELECT 1");
    console.log(`${client.host} answers`);
    await client.end();
  }
}

const RUN: Record<MoveCommand, (move: Move) => Promise<void>> = {
  freeze,
  unfreeze,
  copy,
  verify,
  urls,
};

async function main() {
  const name = MOVE_NAMES.find((value) => value === process.argv[2]);
  const command = MOVE_COMMANDS.find((value) => value === process.argv[3]);
  if (!name || !command) {
    throw new Error(
      `Usage: run.ts <${MOVE_NAMES.join("|")}> <${MOVE_COMMANDS.join("|")}>`,
    );
  }
  const env: Env = parse(readFileSync(`.env.move.${name}.local`));
  const hosts = MOVE_HOSTS[name];
  await RUN[command]({
    name,
    env,
    source: () => parseConnection("SOURCE_URL", env.SOURCE_URL, hosts.source),
    target: () => parseConnection("TARGET_URL", env.TARGET_URL, hosts.target),
  });
  console.log(`${command} ${name}: done`);
}

// The message only: an error object can carry the connection's settings.
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Failed");
  process.exitCode = 1;
});
