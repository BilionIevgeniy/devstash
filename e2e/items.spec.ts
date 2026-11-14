import { expect, test } from "@playwright/test";
import { CONTENT_MAX } from "../src/features/items/domain/item-fields";
import {
  createSnippet,
  itemHeading,
  openCreateDialog,
  uniqueTitle,
} from "./support/items";

test("a created snippet shows in the snippets list", async ({ page }) => {
  const title = uniqueTitle("Created snippet");

  await createSnippet(page, title);

  await expect(page).toHaveURL(/\/items\/snippets$/);
  await expect(itemHeading(page, title)).toBeVisible();
});

// Focus returning to the card after the route drawer closes is a known open
// bug (context/todo.md, "Items"): it is not asserted here.
test("an item opens in the drawer and Esc closes it", async ({ page }) => {
  const title = uniqueTitle("Drawer snippet");
  await createSnippet(page, title);

  // The click goes through the intercepting route: the list stays behind the
  // drawer, and the URL is the one of the item.
  await itemHeading(page, title).click();
  const drawer = page.getByRole("dialog", { name: title, exact: true });
  await expect(drawer).toBeVisible();
  await expect(page).toHaveURL(/\/items\/snippets\/[^/]+$/);

  await page.keyboard.press("Escape");

  await expect(drawer).toBeHidden();
  await expect(page).toHaveURL(/\/items\/snippets$/);
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
