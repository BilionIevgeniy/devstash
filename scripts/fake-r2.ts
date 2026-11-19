import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { answerHealth, readBody } from "./fake-server";

// A stand-in for Cloudflare R2, for the end-to-end tests only (ADR 0035). The
// test server reaches it through R2_ENDPOINT (scripts/e2e-server-env.ts), which
// src/lib/vendors/r2.ts takes only for a localhost URL, path-style:
// /<bucket>/<key>. The browser PUTs to the signed URL and loads the signed GET
// URLs from here, the server HEADs the object before it saves the item.
// Objects live in memory for the run. It checks no signature: the size and
// type the app signs are read back by confirmUpload. Anything but PUT, HEAD,
// GET and DELETE of one object answers 501, so a journey that starts another
// R2 call fails loudly. Playwright starts it beside the test server
// (playwright.config.ts); it listens on localhost only.

export const FAKE_R2_PORT = 3102;
export const FAKE_R2_ENDPOINT = `http://localhost:${FAKE_R2_PORT}`;

interface StoredObject {
  body: Buffer;
  contentType: string;
  lastModified: Date;
}

const objects = new Map<string, StoredObject>();

// The browser's PUT is cross-origin and sends a Content-Type, so it is
// preflighted; the images are plain <img> loads and need nothing.
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "PUT, GET, HEAD",
  "access-control-allow-headers": "content-type",
};

function objectHeaders(object: StoredObject, query: URLSearchParams) {
  const headers: Record<string, string> = {
    ...CORS,
    "content-type": object.contentType,
    "content-length": String(object.body.length),
    "last-modified": object.lastModified.toUTCString(),
  };
  // What a signed GET asks R2 to answer with (signFileUrls).
  const disposition = query.get("response-content-disposition");
  if (disposition) headers["content-disposition"] = disposition;
  const cacheControl = query.get("response-cache-control");
  if (cacheControl) headers["cache-control"] = cacheControl;
  return headers;
}

async function handle(request: IncomingMessage, response: ServerResponse) {
  if (answerHealth(request, response)) return;
  const url = new URL(request.url ?? "/", FAKE_R2_ENDPOINT);
  // /<bucket>/<key>: a key holds slashes, a bucket alone is a list call.
  const isObject = url.pathname.split("/").filter(Boolean).length >= 2;
  const key = decodeURIComponent(url.pathname);

  if (request.method === "OPTIONS") {
    // The tests add x-forwarded-for to every request (e2e/support/sign-in.ts),
    // so the preflight asks for more than the app sends: allow what it asks.
    const asked = request.headers["access-control-request-headers"];
    response.writeHead(204, {
      ...CORS,
      ...(asked && { "access-control-allow-headers": asked }),
    });
    response.end();
    return;
  }
  if (!isObject || url.searchParams.has("delete")) {
    response.writeHead(501, CORS);
    response.end("Not faked");
    return;
  }

  if (request.method === "PUT") {
    objects.set(key, {
      body: await readBody(request),
      contentType:
        request.headers["content-type"] ?? "application/octet-stream",
      lastModified: new Date(),
    });
    response.writeHead(200, { ...CORS, etag: '"e2e"' });
    response.end();
    return;
  }
  if (request.method === "DELETE") {
    objects.delete(key);
    response.writeHead(204, CORS);
    response.end();
    return;
  }

  const object = objects.get(key);
  if (request.method === "HEAD" || request.method === "GET") {
    if (!object) {
      // No body on a HEAD, so the SDK throws NotFound.
      response.writeHead(404, CORS);
      response.end();
      return;
    }
    response.writeHead(200, objectHeaders(object, url.searchParams));
    response.end(request.method === "GET" ? object.body : undefined);
    return;
  }

  response.writeHead(501, CORS);
  response.end("Not faked");
}

function main() {
  const server = createServer((request, response) => {
    handle(request, response).catch(() => {
      response.writeHead(500);
      response.end();
    });
  });
  server.listen(FAKE_R2_PORT, "localhost");
}

if (process.argv[1]?.endsWith("fake-r2.ts")) main();
