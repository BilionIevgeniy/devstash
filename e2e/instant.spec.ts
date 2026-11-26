import type { Page } from "@playwright/test";
import { expect, test } from "./support/test";
import { createSnippet, itemLink, uniqueTitle } from "./support/items";
import { SIGNED_OUT } from "./support/storage-state";

// Run by playwright.instant.config.ts against `next dev`, never by the main
// suite. `next dev` reports in the browser's console what a production build
// never says: a navigation that cannot show its loading state at once (instant
// validation: a loading.tsx or a fallback that reads the request, a page that
// reads it at its top without `instant = false`), a hydration mismatch, a
// missing key. Every page is opened and reached through a link, and any error
// in the console or on the page fails the test.

// What a page may log as an error on purpose.
const EXPECTED = [
  // The 404 of a collection that does not exist.
  /status of 404/,
];

// `next dev` compiles a route on its first request and may reload the page
// once it has, which aborts a navigation in flight: it is repeated until the
// page has loaded.
async function open(page: Page, path: string): Promise<void> {
  await expect(async () => {
    await page.goto(path);
  }).toPass();
}

function watchConsole(page: Page): string[] {
  const found: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() !== "error") return;
    if (EXPECTED.some((pattern) => pattern.test(text))) return;
    found.push(`${page.url()}: ${text.split("\n", 1)[0]}`);
  });
  page.on("pageerror", (error) => {
    found.push(`${page.url()}: ${error.name}: ${error.message.split("\n")[0]}`);
  });
  return found;
}

const SIGNED_IN_PAGES = [
  "/dashboard",
  "/items/snippets",
  "/items/notes",
  "/items/files",
  "/items/images",
  "/collections",
  "/collections/does-not-exist",
  "/favorites",
  "/pinned",
  "/profile",
  "/settings",
  "/settings/locked-files",
  "/settings/delete-account",
  "/upgrade",
];

// Reached by a click on a link whose name is given, from the page before.
const LINKS = [
  { path: "/dashboard", link: /^DevStash/ },
  { path: "/collections", link: /^View all$/ },
  { path: "/items/snippets", link: /^Snippets/ },
  { path: "/favorites", link: /^Favorites$/ },
  { path: "/pinned", link: /^Pinned$/ },
  { path: "/upgrade", link: /^Upgrade$/ },
] as const;

test("the app's pages, opened and by a link", async ({ page }) => {
  const found = watchConsole(page);
  for (const path of SIGNED_IN_PAGES) {
    await open(page, path);
    await expect(page.getByRole("main")).toBeVisible();
  }
  await open(page, "/favorites");
  for (const { path, link } of LINKS) {
    await page.getByRole("link", { name: link }).first().click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
  expect(found).toEqual([]);
});

test("an item: its drawer, its own page and a collection", async ({ page }) => {
  const found = watchConsole(page);
  const title = uniqueTitle("Instant item");
  await createSnippet(page, title);
  // Read before the drawer hides the list from the accessibility tree.
  const href = await itemLink(page, title).getAttribute("href");
  await itemLink(page, title).click();
  await expect(page.getByRole("dialog", { name: title })).toBeVisible();
  await open(page, href ?? "");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  expect(found).toEqual([]);
});

test.describe("signed out", () => {
  test.use({ storageState: SIGNED_OUT });

  test("the public and auth pages, opened and by a link", async ({ page }) => {
    const found = watchConsole(page);
    for (const path of [
      "/",
      "/de",
      "/impressum",
      "/datenschutz",
      "/agb",
      "/vertraege-kuendigen",
      "/sign-in",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
      "/switch-account",
    ]) {
      await open(page, path);
      await expect(page.locator("body")).toBeVisible();
    }
    await open(page, "/sign-in");
    await page.getByRole("link", { name: "Register" }).click();
    await expect(page).toHaveURL(/\/register$/);
    await page
      .getByRole("link", { name: /^sign in$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/sign-in/);
    await page
      .getByRole("link", { name: /forgot/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/forgot-password$/);
    expect(found).toEqual([]);
  });
});
