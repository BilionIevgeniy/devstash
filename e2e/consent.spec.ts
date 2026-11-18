import { expect, test, type Page, type Request } from "@playwright/test";
import { FRESH_VISITOR } from "./support/storage-state";

// The consent banner and the real-user Web Vitals behind it (ADR 0034), for a
// visitor on the first visit. Every other spec starts with an answer stored.
test.use({ storageState: FRESH_VISITOR });

// The banner speaks the page's language: "Leistungsmessung" on /de.
const banner = (page: Page) =>
  page.getByRole("region", {
    name: /^(Performance measurement|Leistungsmessung)$/,
  });

// Every request to the metrics route the page makes, from the first load on.
function vitalsRequests(page: Page): Request[] {
  const requests: Request[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/vitals") {
      requests.push(request);
    }
  });
  return requests;
}

// A click ends LCP, and web-vitals reports it from an idle callback; two
// idle callbacks of the page later, a metric that is going out has gone.
async function giveThePageSomethingToReport(page: Page) {
  await page.getByRole("heading", { level: 1 }).click();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestIdleCallback(() => requestIdleCallback(resolve)),
      ),
  );
}

test("a fresh visitor is asked, and nothing is measured before or after Decline", async ({
  page,
}) => {
  const requests = vitalsRequests(page);
  await page.goto("/");

  await expect(banner(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Allow" })).toBeVisible();
  await page.getByRole("heading", { level: 1 }).click();
  expect(requests).toHaveLength(0);

  // A click before React has hydrated the banner does nothing.
  await expect(async () => {
    await banner(page).getByRole("button", { name: "Decline" }).click();
    await expect(banner(page)).toBeHidden({ timeout: 2_000 });
  }).toPass();
  await giveThePageSomethingToReport(page);
  expect(requests).toHaveLength(0);

  // The answer is kept: a reload does not ask again.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(banner(page)).toBeHidden();
  expect(requests).toHaveLength(0);
});

test("after Allow, a metric goes out with the page's group and no URL", async ({
  page,
}) => {
  await page.goto("/de");
  await expect(async () => {
    await banner(page).getByRole("button", { name: "Erlauben" }).click();
    await expect(banner(page)).toBeHidden({ timeout: 2_000 });
  }).toPass();

  const sent = page.waitForRequest(
    (request) => new URL(request.url()).pathname === "/api/vitals",
  );
  await giveThePageSomethingToReport(page);
  const body = (await sent).postDataJSON() as Record<string, unknown>;

  expect(["LCP", "INP", "CLS"]).toContain(body.name);
  expect(body.group).toBe("/de");
  expect(Object.keys(body).sort()).toEqual(["group", "name", "value"]);
});

test("Privacy settings in the footer opens the banner again to withdraw", async ({
  page,
}) => {
  await page.goto("/");
  await expect(async () => {
    await banner(page).getByRole("button", { name: "Allow" }).click();
    await expect(banner(page)).toBeHidden({ timeout: 2_000 });
  }).toPass();

  await page.getByRole("button", { name: "Privacy settings" }).click();

  await expect(banner(page)).toContainText("Currently allowed.");
  await banner(page).getByRole("button", { name: "Decline" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(banner(page)).toBeHidden();
});

// Withdrawing is as easy as agreeing on every page, the auth pages included.
test("the sign-in page offers Privacy settings too", async ({ page }) => {
  await page.goto("/sign-in");

  await expect(
    page.getByRole("button", { name: "Privacy settings" }),
  ).toBeVisible();
});
