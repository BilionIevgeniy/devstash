import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";
import { answerHealth, readBody } from "./fake-server";

// A stand-in for Sentry's ingest, for the end-to-end tests only (ADR 0035).
// The test build sends its events here: NEXT_PUBLIC_SENTRY_DSN and SENTRY_DSN
// point at it (scripts/e2e-server-env.ts), and the DSN guard of
// lib/observability/sentry-dsn.ts takes localhost. It records every request,
// decoded, so e2e/egress.spec.ts can read what would have left the app
// (ADR 0016): GET /requests lists them, DELETE /requests empties the list.
// A body in an encoding it cannot read is refused and recorded as such, so a
// compressed body is never searched as bytes and passed by mistake. It
// answers 200 with an empty envelope reply, so the SDKs never back off.
// Playwright starts it beside the test server; it listens on localhost only.

export const FAKE_SENTRY_PORT = 3104;
export const FAKE_SENTRY_URL = `http://localhost:${FAKE_SENTRY_PORT}`;
// The key is a placeholder: the stand-in checks none.
export const FAKE_SENTRY_DSN = `http://e2epublickey@localhost:${FAKE_SENTRY_PORT}/1`;

export interface RecordedRequest {
  method: string;
  /** The path and query, as the SDK sent them. */
  url: string;
  /** The decoded body, or null when its encoding was unknown. */
  body: string | null;
  contentEncoding: string | null;
}

const recorded: RecordedRequest[] = [];

// The browser SDK posts cross-origin from the test server's origin.
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

function decode(raw: Buffer, encoding: string | null): string | null {
  switch (encoding) {
    case null:
    case "identity":
      return raw.toString("utf8");
    case "gzip":
      return gunzipSync(raw).toString("utf8");
    case "deflate":
      return inflateSync(raw).toString("utf8");
    case "br":
      return brotliDecompressSync(raw).toString("utf8");
    default:
      return null;
  }
}

function answerJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { ...CORS, "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function handle(request: IncomingMessage, response: ServerResponse) {
  if (answerHealth(request, response)) return;
  if (request.url === "/requests") {
    if (request.method === "DELETE") recorded.length = 0;
    answerJson(response, 200, recorded);
    return;
  }
  if (request.method === "OPTIONS") {
    response.writeHead(204, CORS);
    response.end();
    return;
  }

  const header = request.headers["content-encoding"];
  const contentEncoding = typeof header === "string" ? header : null;
  const body = decode(await readBody(request), contentEncoding);
  recorded.push({
    method: request.method ?? "",
    url: request.url ?? "",
    body,
    contentEncoding,
  });
  if (body === null) {
    answerJson(response, 400, { detail: "unknown content-encoding" });
    return;
  }
  answerJson(response, 200, {});
}

function main() {
  const server = createServer((request, response) => {
    handle(request, response).catch(() => {
      response.writeHead(500);
      response.end();
    });
  });
  server.listen(FAKE_SENTRY_PORT, "localhost");
}

if (process.argv[1]?.endsWith("fake-sentry.ts")) main();
