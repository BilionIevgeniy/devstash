import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import {
  encodedForms,
  eventsWith,
  ingestRequests,
  resetIngest,
  serverLog,
} from "./support/ingest";
import { expect, test } from "./support/test";

// What leaves the app (ADR 0016), checked on every run instead of by hand:
// the test build sends Sentry's events to a stand-in ingest
// (scripts/fake-sentry.ts), and the throw routes of src/app/(e2e)/ fail on
// purpose with a token, an email address, an item title and a Prisma-like
// message. None of it may reach the ingest or the server's log; each error is
// one event; an idle page sends nothing. The CSP fixture of support/test.ts
// fails the run if connect-src blocks the ingest.

function probeSecrets() {
  const id = randomUUID().slice(0, 8);
  return {
    token: `tok_${randomUUID().replaceAll("-", "")}`,
    email: `leak.${id}+probe@example.com`,
    title: `Quarterly plan ${id} "draft"`,
  };
}

type Secrets = ReturnType<typeof probeSecrets>;

function probeUrl(path: string, secrets: Secrets): string {
  return `/e2e-throw/${path}?${new URLSearchParams(secrets).toString()}`;
}

async function expectOneEvent(name: string): Promise<void> {
  await expect.poll(() => eventsWith(name)).toBe(1);
}

async function expectNothingLeaked(secrets: Secrets): Promise<void> {
  const bodies = (await ingestRequests()).map((request) => {
    expect(request.body, `body in ${request.contentEncoding}`).not.toBeNull();
    return request.body ?? "";
  });
  const log = await serverLog();
  for (const value of Object.values(secrets)) {
    for (const form of encodedForms(value)) {
      for (const body of bodies) expect(body).not.toContain(form);
      expect(log).not.toContain(form);
    }
  }
  for (const text of [...bodies, log]) {
    expect(text).not.toContain("Invalid invocation");
  }
}

// The server writes its log asynchronously: wait until it holds the error.
async function waitForServerLog(name: string): Promise<void> {
  await expect.poll(async () => (await serverLog()).includes(name)).toBe(true);
}

async function throwInBrowser(page: Page, secrets: Secrets, button: string) {
  await page.goto(probeUrl("client", secrets));
  // A click before hydration does nothing, so it is repeated until it takes.
  await expect(async () => {
    await page.getByRole("button", { name: button }).click();
    await expect
      .poll(() => ingestRequests().then((r) => r.length))
      .toBeGreaterThan(0);
  }).toPass();
}

test.beforeEach(async () => {
  await resetIngest();
});

test("each server error is one event, without its message, and the log keeps it out too", async ({
  page,
  request,
}) => {
  const secrets = probeSecrets();

  await page.goto(probeUrl("server", secrets));
  await expectOneEvent("E2eServerProbeError");

  await request.get(probeUrl("route", secrets));
  await expectOneEvent("E2eRouteProbeError");

  await page.goto(probeUrl("action", secrets));
  await expect(async () => {
    await page.getByRole("button", { name: "Run the action" }).click();
    await expect.poll(() => eventsWith("E2eActionProbeError")).toBe(1);
  }).toPass();

  // A caught error, logged by the app: its fixed message, an id, no text.
  await request.get(probeUrl("logged", secrets));
  await expectOneEvent("The end-to-end probe failed");

  await waitForServerLog("E2eServerProbeError");
  await waitForServerLog("E2eRouteProbeError");
  await waitForServerLog("E2eActionProbeError");
  await expectNothingLeaked(secrets);

  // Still one each once everything has arrived.
  for (const name of [
    "E2eServerProbeError",
    "E2eActionProbeError",
    "The end-to-end probe failed",
  ]) {
    expect(await eventsWith(name)).toBe(1);
  }
});

test("a render error and an event handler error in the browser are one event each", async ({
  page,
}) => {
  const secrets = probeSecrets();

  await throwInBrowser(page, secrets, "Throw in a handler");
  await expectOneEvent("E2eHandlerProbeError");

  await throwInBrowser(page, secrets, "Throw while rendering");
  await expectOneEvent("E2eRenderProbeError");

  await expectNothingLeaked(secrets);
});

test("a page in use sends nothing until an error happens, and stores nothing of Sentry", async ({
  page,
  context,
}) => {
  for (const path of ["/", "/dashboard", "/items/snippets", "/settings"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  await page.getByRole("link", { name: "Favorites" }).first().click();
  await page.waitForLoadState("networkidle");

  // The sentinel: once its event is in, anything sent before it would be too.
  await throwInBrowser(page, probeSecrets(), "Throw in a handler");
  await expectOneEvent("E2eHandlerProbeError");

  const requests = await ingestRequests();
  expect(
    requests.filter((r) => !r.body?.includes("E2eHandlerProbeError")),
  ).toEqual([]);

  const cookies = await context.cookies();
  expect(cookies.filter((c) => /sentry/i.test(c.name))).toEqual([]);
  const stored = await page.evaluate(() => [
    ...Object.keys(localStorage),
    ...Object.keys(sessionStorage),
  ]);
  expect(stored.filter((key) => /sentry/i.test(key))).toEqual([]);
});
