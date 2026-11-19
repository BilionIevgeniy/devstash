import type { Page } from "@playwright/test";
import { createFreshUser, signInFreshUser } from "./support/fresh-user";
import { createSnippet, uniqueTitle } from "./support/items";
import { signInThroughForm } from "./support/sign-in";
import { SIGNED_OUT } from "./support/storage-state";
import { expect, test } from "./support/test";
import { waitForAnswers } from "./support/network";

// A user never sees another user's data (ADR 0037). Nothing per user is
// cached on the server, so what remains is the browser: the router's cache of
// per-session shells and prefetches, and the routes it keeps mounted but
// hidden. In one tab, a Pro user A visits the pages, signs out, and a Free
// user B signs in and visits the same pages, Back included.
test.use({ storageState: SIGNED_OUT });

const ROUTES = ["/dashboard", "/items/snippets", "/favorites", "/pinned"];

async function visit(page: Page) {
  for (const path of ROUTES) {
    await page
      .getByRole("link", { name: linkName(path) })
      .first()
      .click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await waitForAnswers(page);
  }
}

function linkName(path: string): RegExp {
  return {
    "/dashboard": /^DevStash$/,
    "/items/snippets": /^Snippets/,
    "/favorites": /^Favorites$/,
    "/pinned": /^Pinned$/,
  }[path] as RegExp;
}

async function signOut(page: Page) {
  // An answer still on its way after the sign-out would set the session
  // cookie again (endSession in signed-out.spec.ts).
  await waitForAnswers(page);
  const item = page.getByRole("menuitem", { name: "Sign out" });
  await expect(async () => {
    await page.getByRole("button", { name: /E2E Tester/ }).click();
    await expect(item).toBeVisible({ timeout: 2_000 });
  }).toPass();
  await item.click();
  await expect(page).toHaveURL(/:\d+\/$/);
}

test("the next user of the tab sees none of the last one's data or plan", async ({
  page,
}) => {
  await signInFreshUser(page, "pro");
  const titleOfA = uniqueTitle("Only for A");
  await createSnippet(page, titleOfA);
  await page.goto("/settings");
  await visit(page);
  await signOut(page);

  const emailOfB = createFreshUser("free");
  await signInThroughForm(page, emailOfB);
  await expect(page).toHaveURL(/\/dashboard$/);
  const sidebar = page.getByRole("complementary");
  await expect(sidebar.getByText("Free", { exact: true })).toBeVisible();

  await visit(page);
  for (let step = 0; step < ROUTES.length; step++) {
    await page.goBack();
    await waitForAnswers(page);
    await expect(page.getByText(titleOfA)).toHaveCount(0);
    // B's plan, beside the logo; "Pro" there would be A's (the Pro badges
    // of the locked types are a Free user's own).
    await expect(sidebar.getByText("Free", { exact: true })).toBeVisible();
  }
  await expect(page.getByText(titleOfA)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: new RegExp(emailOfB) }),
  ).toBeVisible();
});
