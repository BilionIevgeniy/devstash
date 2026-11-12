import { expect, test, type Page } from "@playwright/test";
import { createSnippet, itemHeading, uniqueTitle } from "./support/items";

// A session that ends while a page is open: the next Server Action must take
// the user to sign-in, not show an error toast. The cookies are cleared only
// after the page has loaded and hydrated, as when a session expires in a tab.
const SIGN_IN_URL = /\/sign-in/;

// A false error toast may show for a moment and go with the navigation, so
// every error toast (Sonner marks it with data-type="error") is recorded from
// now on. The navigation is client-side: the window and its record stay.
async function recordErrorToasts(page: Page) {
  await page.evaluate(() => {
    const seen = new Set<string>();
    Object.assign(window, { seenErrorToasts: seen });
    new MutationObserver(() => {
      const toasts = document.querySelectorAll(
        '[data-sonner-toast][data-type="error"]',
      );
      for (const toast of toasts) seen.add(toast.textContent ?? "");
    }).observe(document.body, { childList: true, subtree: true });
  });
}

async function expectSentToSignIn(page: Page) {
  await expect(page).toHaveURL(SIGN_IN_URL);
  const seen = await page.evaluate(() => [
    ...(window as unknown as { seenErrorToasts: Set<string> }).seenErrorToasts,
  ]);
  expect(seen).toEqual([]);
}

test("a star clicked after the session ended goes to sign-in", async ({
  page,
}) => {
  const title = uniqueTitle("Signed-out star");
  await createSnippet(page, title);

  await page.context().clearCookies();
  await recordErrorToasts(page);
  await page
    .getByRole("button", { name: `Favorite ${title}`, exact: true })
    .click();

  await expectSentToSignIn(page);
});

test("a delete confirmed after the session ended goes to sign-in", async ({
  page,
}) => {
  const title = uniqueTitle("Signed-out delete");
  await createSnippet(page, title);
  // The click opens the drawer at the item's URL; a reload of that URL renders
  // the item's own page instead of the intercepted drawer.
  await itemHeading(page, title).click();
  await expect(page).toHaveURL(/\/items\/snippets\/[^/]+$/);
  await page.reload();
  const deleteButton = page.getByRole("button", {
    name: `Delete ${title}`,
    exact: true,
  });
  const confirm = page.getByRole("alertdialog");
  await expect(async () => {
    await deleteButton.click();
    await expect(confirm).toBeVisible({ timeout: 2_000 });
  }).toPass();

  await page.context().clearCookies();
  await recordErrorToasts(page);
  await confirm.getByRole("button", { name: "Delete", exact: true }).click();

  await expectSentToSignIn(page);
});

test("an editor preference changed after the session ended goes to sign-in", async ({
  page,
}) => {
  await page.goto("/settings");
  const wordWrap = page.getByRole("switch", { name: "Word wrap", exact: true });
  // A click before hydration does nothing: wait until one takes, then put the
  // setting back while still signed in.
  const before = await wordWrap.getAttribute("aria-checked");
  await expect(async () => {
    await wordWrap.click();
    await expect(wordWrap).not.toHaveAttribute("aria-checked", before ?? "", {
      timeout: 2_000,
    });
  }).toPass();
  await expect(page.getByText("Editor preferences saved")).toBeVisible();
  // The answer of a save still running would set the session cookie again.
  const restored = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.request().headers()["next-action"] !== undefined,
  );
  await wordWrap.click();
  await restored;
  await expect(wordWrap).toHaveAttribute("aria-checked", before ?? "");

  await page.context().clearCookies();
  await recordErrorToasts(page);
  await wordWrap.click();

  await expectSentToSignIn(page);
});
