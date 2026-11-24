import { expect, type Locator, type Page } from "@playwright/test";
import { waitForAnswers } from "./network";
import { ANSWERED_CONSENT } from "./storage-state";
import { E2E_USER_PASSWORD, requireE2eUserEmail } from "../../scripts/e2e-user";

// A different client address for every sign-in. Next fills `x-forwarded-for`
// from the socket when the header is missing, so without this every test
// request would share one per-IP counter (20 per 15 minutes, never reset by a
// success) in the Upstash database. 203.0.113.0/24 is reserved for
// documentation (RFC 5737): never a real client.
function randomTestIp(): string {
  return `203.0.113.${1 + Math.floor(Math.random() * 254)}`;
}

// Fills the sign-in form with the user of this run (or another seeded user)
// and submits it. The caller asserts where it lands. No wait for hydration:
// React keeps text typed before it, and the form posts to its Server Action
// without script.
export async function signInThroughForm(
  page: Page,
  email: string = requireE2eUserEmail(),
  password: string = E2E_USER_PASSWORD,
  // Reach the form through the current page's "Sign in" link, a soft
  // navigation, instead of loading it: for a journey that must keep the
  // tab's document (two-users.spec.ts).
  { fromCurrentPage = false }: { fromCurrentPage?: boolean } = {},
): Promise<void> {
  const context = page.context();
  await context.setExtraHTTPHeaders({ "x-forwarded-for": randomTestIp() });
  // The saved session carries the answer to the consent banner, so it never
  // covers a button; an answer already there is kept.
  await context.addInitScript(({ name, value }) => {
    if (window.localStorage.getItem(name) === null) {
      window.localStorage.setItem(name, value);
    }
  }, ANSWERED_CONSENT);
  if (fromCurrentPage) {
    await page
      .getByRole("link", { name: /^sign in$/i })
      .first()
      .click();
    await page.waitForURL(/\/sign-in/);
  } else {
    await page.goto("/sign-in");
  }
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  // Exact: "Sign in with GitHub" is a button too.
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

// Signs out through the account menu. The first click is repeated until React
// has hydrated the trigger, which also means the page's first prefetches have
// been sent; then every answer is waited for, since each answer of a
// signed-in request sets the session cookie again (waitForAnswers), and only
// then is the sign-out clicked.
export async function signOutThroughMenu(
  page: Page,
  { trigger, item }: { trigger: Locator; item: string },
): Promise<void> {
  const signOut = page.getByRole("menuitem", { name: item });
  await expect(async () => {
    await trigger.click();
    await expect(signOut).toBeVisible({ timeout: 2_000 });
  }).toPass();
  await waitForAnswers(page);
  await signOut.click();
}
