import type { Page } from "@playwright/test";
import { createFreshUser, signInFreshUser } from "./support/fresh-user";
import { createSnippet, uniqueTitle } from "./support/items";
import { signInThroughForm, signOutThroughMenu } from "./support/sign-in";
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
  await signOutThroughMenu(page, {
    trigger: page.getByRole("button", { name: /E2E Tester/ }),
    item: "Sign out",
  });
  await expect(page).toHaveURL(/:\d+\/$/);
}

declare global {
  interface Window {
    __sameDocument?: boolean;
  }
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

  // The sign-out loaded the homepage as a new document. From here on the tab
  // keeps it: B signs in through the homepage's link, and the marker proves at
  // the end that no page load dropped what A could have left in it.
  await page.evaluate(() => {
    window.__sameDocument = true;
  });
  const emailOfB = createFreshUser("free");
  await signInThroughForm(page, emailOfB, undefined, {
    fromCurrentPage: true,
  });
  await expect(page).toHaveURL(/\/dashboard$/);
  const sidebar = page.getByRole("complementary");
  await expect(sidebar.getByText("Free", { exact: true })).toBeVisible();

  await visit(page);
  // Back through B's own pages only: one more would reach the sign-in page,
  // which loads as a new document after the app (FreshAuthDocument).
  for (let step = 1; step < ROUTES.length; step++) {
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
  expect(await page.evaluate(() => window.__sameDocument)).toBe(true);
});
