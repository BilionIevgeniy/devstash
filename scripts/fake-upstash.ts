import {
  createServer,
  request as forward,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { answerHealth, readBody } from "./fake-server";

// A stand-in for Upstash Redis, for the end-to-end tests only (ADR 0035). The
// REST API comes from serverless-redis-http (SRH) in front of a plain Redis,
// both in Docker (README, "End-to-end tests"; services of the e2e job). This
// proxy sits in front of SRH for one reason: the Lua scripts of
// @upstash/ratelimit start with `#!lua flags=allow-key-locking`, a flag only
// Upstash knows, which plain Redis refuses. The proxy drops that one flag and
// refuses any other, so a ratelimit release that needs more of Upstash fails
// in the setup instead of being tested against something it never runs on.
// The rewritten script hashes differently, so every EVALSHA is answered with
// NOSCRIPT and ratelimit falls back to EVAL: two round trips, still atomic.
// Playwright starts it beside the test server (playwright.config.ts); it
// listens on localhost only.

export const FAKE_UPSTASH_PORT = 3103;
export const FAKE_UPSTASH_URL = `http://localhost:${FAKE_UPSTASH_PORT}`;
// SRH, published by Docker. The token is not a secret: SRH and Redis listen on
// this machine (or the CI runner) only. The e2e job in .github/workflows/ci.yml
// repeats both values in its service definition.
export const SRH_PORT = 8079;
export const SRH_TOKEN = "e2e-local-redis-token";

const KNOWN_FLAG_LINE = "#!lua flags=allow-key-locking";

export type ScriptRewrite = { script: string } | { error: string };

// Only the first line of a script can carry a shebang.
export function rewriteScript(script: string): ScriptRewrite {
  if (!script.startsWith("#!")) return { script };
  const end = script.indexOf("\n");
  const firstLine = end === -1 ? script : script.slice(0, end);
  const rest = end === -1 ? "" : script.slice(end);
  if (firstLine === KNOWN_FLAG_LINE) return { script: `#!lua${rest}` };
  if (firstLine === "#!lua") return { script };
  return {
    error: `fake-upstash: unknown script shebang "${firstLine}", see scripts/fake-upstash.ts`,
  };
}

type Command = unknown[];

function rewriteCommand(command: Command): Command | { error: string } {
  if (String(command[0]).toLowerCase() !== "eval") return command;
  if (typeof command[1] !== "string") return command;
  const rewrite = rewriteScript(command[1]);
  if ("error" in rewrite) return rewrite;
  return [command[0], rewrite.script, ...command.slice(2)];
}

// `/` carries one command, `/pipeline` and `/multi-exec` an array of them.
export function rewriteBody(
  path: string,
  body: unknown,
): { body: unknown } | { error: string } {
  if (!Array.isArray(body)) return { body };
  const isBatch = path === "/pipeline" || path === "/multi-exec";
  if (!isBatch) {
    const command = rewriteCommand(body);
    return "error" in command ? command : { body: command };
  }
  const commands: Command[] = [];
  for (const entry of body) {
    if (!Array.isArray(entry)) return { body };
    const command = rewriteCommand(entry);
    if ("error" in command) return command;
    commands.push(command);
  }
  return { body: commands };
}

function answerJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

// The body as SRH should get it, or the error to answer with.
function prepareBody(
  path: string,
  raw: Buffer,
): { out: Buffer } | { error: string } {
  if (raw.length === 0) return { out: raw };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch {
    return { error: "fake-upstash: invalid JSON" };
  }
  const result = rewriteBody(path, parsed);
  if ("error" in result) return result;
  return { out: Buffer.from(JSON.stringify(result.body)) };
}

async function handle(request: IncomingMessage, response: ServerResponse) {
  if (answerHealth(request, response)) return;
  const url = request.url ?? "/";
  const prepared = prepareBody(url.split("?")[0], await readBody(request));
  if ("error" in prepared) {
    answerJson(response, 400, { error: prepared.error });
    return;
  }
  // The proxy always sends a length: a chunked request is passed on whole.
  const headers = { ...request.headers };
  delete headers["transfer-encoding"];
  const upstream = forward(
    {
      host: "localhost",
      port: SRH_PORT,
      path: url,
      method: request.method,
      headers: { ...headers, "content-length": String(prepared.out.length) },
    },
    (answer) => {
      response.writeHead(answer.statusCode ?? 502, answer.headers);
      answer.pipe(response);
    },
  );
  upstream.on("error", () => {
    answerJson(response, 502, { error: "fake-upstash: SRH is not reachable" });
  });
  upstream.end(prepared.out);
}

function main() {
  const server = createServer((request, response) => {
    handle(request, response).catch(() => {
      answerJson(response, 500, { error: "fake-upstash: failed" });
    });
  });
  server.listen(FAKE_UPSTASH_PORT, "localhost");
}

if (process.argv[1]?.endsWith("fake-upstash.ts")) main();
