import type { IncomingMessage, ServerResponse } from "node:http";

// What the stand-ins of the end-to-end tests share (fake-openai.ts,
// fake-r2.ts, fake-upstash.ts): Playwright waits on each one's /health.

export async function readBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

// Answers GET /health and says so; any other request is the caller's.
export function answerHealth(
  request: IncomingMessage,
  response: ServerResponse,
): boolean {
  if (request.method !== "GET" || request.url !== "/health") return false;
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({ ok: true }));
  return true;
}
