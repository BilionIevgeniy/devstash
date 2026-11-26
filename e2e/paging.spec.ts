import type { Page } from "@playwright/test";
import { expect, test } from "./support/test";
import { E2E_PAGED_COLLECTION } from "../scripts/e2e-user";
import { LISTS_AUTH_FILE } from "./support/storage-state";

// A page of a list is changed with the keyboard: the header stays, and the
// focus stays on the link that was used, or goes to the current page's number
// at the end, where "Next page" is no link (usePaginationFocus). The user of
// the long lists has three pages of collections and a collection of two.
test.use({ storageState: LISTS_AUTH_FILE });

async function pageWithKeyboard(page: Page, heading: string): Promise<void> {
  const pagination = page.getByRole("navigation", { name: "Pagination" });
  const next = pagination.getByRole("link", { name: "Next page" });
  // The first press can land before React has hydrated the link.
  await expect(async () => {
    await next.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/page=2/, { timeout: 2_000 });
  }).toPass();
  await expect(
    page.getByRole("heading", { level: 1, name: heading }),
  ).toBeVisible();
  await expect(
    pagination.getByRole("link", { name: "Page 2" }),
  ).toHaveAttribute("aria-current", "page");
  return;
}

test("paging the collections keeps the focus on the pagination", async ({
  page,
}) => {
  await page.goto("/collections");
  await pageWithKeyboard(page, "Collections");
  const pagination = page.getByRole("navigation", { name: "Pagination" });
  const next = pagination.getByRole("link", { name: "Next page" });
  await expect(next).toBeFocused();

  // The last page: "Next page" is no link any more.
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/page=3/);
  await expect(pagination.getByRole("link", { name: "Page 3" })).toBeFocused();
});

test("paging a collection keeps its header and the focus", async ({ page }) => {
  // The collections' order is the server's: the one with the rows is found on
  // whichever page it is.
  const link = page.getByRole("link", { name: E2E_PAGED_COLLECTION });
  for (const listPage of [1, 2, 3]) {
    await page.goto(`/collections?page=${listPage}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if ((await link.count()) > 0) break;
  }
  await link.click();
  await expect(
    page.getByRole("heading", { level: 1, name: E2E_PAGED_COLLECTION }),
  ).toBeVisible();
  await pageWithKeyboard(page, E2E_PAGED_COLLECTION);
  // Two pages: the end at once.
  const pagination = page.getByRole("navigation", { name: "Pagination" });
  await expect(pagination.getByRole("link", { name: "Page 2" })).toBeFocused();
});
