import { readFile } from "node:fs/promises";
import {
  FAKE_SENTRY_URL,
  type RecordedRequest,
} from "../../scripts/fake-sentry";
import { SERVER_LOG } from "../../scripts/e2e-start";

// Reading the stand-in ingest (scripts/fake-sentry.ts) and the test server's
// log (scripts/e2e-start.ts), for e2e/egress.spec.ts.

export async function resetIngest(): Promise<void> {
  await fetch(`${FAKE_SENTRY_URL}/requests`, { method: "DELETE" });
}

export async function ingestRequests(): Promise<RecordedRequest[]> {
  const response = await fetch(`${FAKE_SENTRY_URL}/requests`);
  return (await response.json()) as RecordedRequest[];
}

// The events whose exception has this class, counted once per request. A
// message the app wrote (logger.error) is matched the same way.
export async function eventsWith(text: string): Promise<number> {
  const requests = await ingestRequests();
  return requests.filter((request) => request.body?.includes(text)).length;
}

export function serverLog(): Promise<string> {
  return readFile(SERVER_LOG, "utf8");
}

// Every form a value can take in a body or a log line: as it is, percent- and
// form-encoded, and escaped in JSON.
export function encodedForms(value: string): string[] {
  return [
    value,
    encodeURIComponent(value),
    new URLSearchParams({ v: value }).toString().slice(2),
    JSON.stringify(value).slice(1, -1),
  ];
}
