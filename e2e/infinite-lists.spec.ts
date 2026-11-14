import { expect, test, type Page } from "@playwright/test";
import { E2E_LIST_ROWS } from "../scripts/e2e-user";
import { LISTS_AUTH_FILE } from "./support/storage-state";

// The endless lists of /favorites and /pinned (ADR 0025), as the second seeded
// user, who has 40 snippets that are all starred and pinned. Read-only, so
// --repeat-each needs no more rows.
test.use({ storageState: LISTS_AUTH_FILE });

const FAVORITES_PAGE = 30;
const PINNED_GROUP_PAGE = 10;

function favoriteStars(page: Page) {
  return page.getByRole("button", { name: /^Favorite List item/ });
}

function pinButtons(page: Page) {
  return page.getByRole("button", { name: /^Pin List item/ });
}

function row(page: Page, n: number) {
  const title = `List item ${String(n).padStart(2, "0")}`;
  return page.getByRole("button", { name: `Favorite ${title}`, exact: true });
}

// The sentinel works only once React has hydrated the list, so the scroll to
// the end is repeated until the next page has come.
async function scrollToAll(page: Page) {
  await expect(async () => {
    await page
      .getByRole("button", { name: "Load more" })
      .scrollIntoViewIfNeeded();
    await expect(favoriteStars(page)).toHaveCount(E2E_LIST_ROWS, {
      timeout: 2_000,
    });
  }).toPass();
}

test("scrolling /favorites loads the rest after the first page", async ({
  page,
}) => {
  await page.goto("/favorites");

  await expect(
    page.getByRole("heading", { name: `Items (${E2E_LIST_ROWS})` }),
  ).toBeVisible();
  await expect(favoriteStars(page)).toHaveCount(FAVORITES_PAGE);
  // Newest first: the last one starred leads.
  await expect(favoriteStars(page).first()).toHaveAccessibleName(
    "Favorite List item 40",
  );

  await scrollToAll(page);
  await expect(page.getByRole("button", { name: "Load more" })).toHaveCount(0);
});

test("Back to /favorites keeps every page loaded and the place", async ({
  page,
}) => {
  await page.goto("/favorites");
  await scrollToAll(page);
  await row(page, 5).scrollIntoViewIfNeeded();
  await expect(row(page, 5)).toBeInViewport();

  await page.getByRole("link", { name: "View all pinned" }).click();
  await expect(page).toHaveURL(/\/pinned$/);
  await page.goBack();

  await expect(page).toHaveURL(/\/favorites$/);
  await expect(favoriteStars(page)).toHaveCount(E2E_LIST_ROWS);
  await expect(row(page, 5)).toBeInViewport();
});

test("the sort of /favorites is read on the server after a reload", async ({
  page,
}) => {
  await page.goto("/favorites?itemSort=a-z");

  await expect(favoriteStars(page).first()).toHaveAccessibleName(
    "Favorite List item 01",
  );
  await expect(favoriteStars(page)).toHaveCount(FAVORITES_PAGE);
});

test("a /pinned group shows ten and more on Show more, by keyboard", async ({
  page,
}) => {
  await page.goto("/pinned");
  await expect(
    page.getByRole("button", { name: `Snippets (${E2E_LIST_ROWS})` }),
  ).toBeVisible();
  await expect(pinButtons(page)).toHaveCount(PINNED_GROUP_PAGE);

  // A key press before React has hydrated the button does nothing, so it is
  // repeated until the next page has started to come, and only then counted.
  const showMore = page.getByRole("button", { name: "Show more" });
  await expect(async () => {
    await showMore.focus();
    await page.keyboard.press("Enter");
    await expect(pinButtons(page)).not.toHaveCount(PINNED_GROUP_PAGE, {
      timeout: 2_000,
    });
  }).toPass();
  await expect(pinButtons(page)).toHaveCount(PINNED_GROUP_PAGE * 2);

  // The first new row takes the focus, so the keyboard goes on forward.
  await expect(
    page.getByRole("button", { name: /^List item 30/ }),
  ).toBeFocused();
});
