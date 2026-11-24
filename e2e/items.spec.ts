import { expect, test } from "./support/test";
import { CONTENT_MAX } from "../src/features/items/domain/item-fields";
import {
  createSnippet,
  itemHeading,
  itemLink,
  openCreateDialog,
  uniqueTitle,
} from "./support/items";

test("a created snippet shows in the snippets list", async ({ page }) => {
  const title = uniqueTitle("Created snippet");

  await createSnippet(page, title);

  await expect(page).toHaveURL(/\/items\/snippets$/);
  await expect(itemHeading(page, title)).toBeVisible();
});

// The card of a type page is a link to the item: the click goes through the
// intercepting route (the list stays behind the drawer, the URL is the item's),
// and the focus comes back to the card when the drawer closes.
test("an item opens in the drawer and Esc gives the focus back to its card", async ({
  page,
}) => {
  const title = uniqueTitle("Drawer snippet");
  await createSnippet(page, title);
  const card = itemLink(page, title);
  await expect(card).toHaveAttribute("href", /^\/items\/snippets\/[^/]+$/);

  await card.click();
  const drawer = page.getByRole("dialog", { name: title, exact: true });
  await expect(drawer).toBeVisible();
  await expect(page).toHaveURL(/\/items\/snippets\/[^/]+$/);

  await page.keyboard.press("Escape");

  await expect(drawer).toBeHidden();
  await expect(page).toHaveURL(/\/items\/snippets$/);
  await expect(card).toBeFocused();
});

test("Cmd/Ctrl+click on a card opens the item in a new tab", async ({
  page,
  context,
}) => {
  const title = uniqueTitle("New tab snippet");
  await createSnippet(page, title);
  const href = await itemLink(page, title).getAttribute("href");

  const [tab] = await Promise.all([
    context.waitForEvent("page"),
    itemLink(page, title).click({ modifiers: ["ControlOrMeta"] }),
  ]);

  await tab.waitForLoadState();
  expect(new URL(tab.url()).pathname).toBe(href);
  await expect(tab.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();
  await tab.close();
});

// The deleted card is gone, so the focus goes to the card that followed it
// (the list is newest first: the older snippet).
test("a delete from the drawer gives the focus to the next card", async ({
  page,
}) => {
  const older = uniqueTitle("Older snippet");
  const newer = uniqueTitle("Newer snippet");
  await createSnippet(page, older);
  await createSnippet(page, newer);

  await itemLink(page, newer).click();
  const drawer = page.getByRole("dialog", { name: newer, exact: true });
  await drawer
    .getByRole("button", { name: `Delete ${newer}`, exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();

  await expect(drawer).toBeHidden();
  await expect(itemHeading(page, newer)).toBeHidden();
  await expect(itemLink(page, older)).toBeFocused();
});

// Monaco keeps its textarea to itself, so the label cannot point at it: the
// click goes through the editor's handle. Monaco loads on its own, and a click
// before it has mounted does nothing, so the click is repeated.
test("clicking the Content label focuses the code editor", async ({ page }) => {
  const dialog = await openCreateDialog(page, "/items/snippets", "Snippet");

  await expect(async () => {
    await dialog.getByText("Content", { exact: true }).click();
    await expect(dialog.getByLabel("Content", { exact: true })).toBeFocused({
      timeout: 2_000,
    });
  }).toPass();
});

// The Write textarea is hidden while Preview is open, and a hidden textarea
// takes no focus: the handle has to show it first.
test("clicking the Content label of a note in Preview returns to Write", async ({
  page,
}) => {
  const dialog = await openCreateDialog(page, "/items/notes", "Note");
  const preview = dialog.getByRole("tab", { name: "Preview", exact: true });
  await preview.click();
  await expect(preview).toHaveAttribute("aria-selected", "true");

  await dialog.getByText("Content", { exact: true }).click();

  await expect(
    dialog.getByRole("tab", { name: "Write", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(dialog.getByLabel("Content", { exact: true })).toBeFocused();
});

// The refusal is the only path where nothing but the handle can bring the
// editor back: no label is clicked, so the browser focuses nothing itself.
// One character over CONTENT_MAX: nothing is sent and nothing is created.
test("a note over the content limit is refused with the editor focused", async ({
  page,
}) => {
  const dialog = await openCreateDialog(page, "/items/notes", "Note");
  await dialog
    .getByLabel("Title", { exact: true })
    .fill(uniqueTitle("Too long note"));
  await dialog
    .getByLabel("Content", { exact: true })
    .fill("x".repeat(CONTENT_MAX + 1));
  const preview = dialog.getByRole("tab", { name: "Preview", exact: true });
  await preview.click();
  await expect(preview).toHaveAttribute("aria-selected", "true");

  await dialog.getByRole("button", { name: "Create", exact: true }).click();

  await expect(
    page.getByText(/Content can be up to \d+ characters/),
  ).toBeVisible();
  await expect(
    dialog.getByRole("tab", { name: "Write", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(dialog.getByLabel("Content", { exact: true })).toBeFocused();
  await expect(dialog).toBeVisible();
});
