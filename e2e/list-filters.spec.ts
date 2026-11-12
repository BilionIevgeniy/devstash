import { expect, test } from "@playwright/test";
import {
  cardTitles,
  chooseOption,
  createSnippet,
  itemHeading,
  uniqueTitle,
} from "./support/items";

// A tag of its own for each run, so the filter shows only the cards of this
// test among the items of the whole run.
function uniqueTag(): string {
  return uniqueTitle("e2e").replace(" ", "-");
}

function urlOf(path: string): RegExp {
  return new RegExp(`${path.replaceAll("?", "\\?")}$`);
}

test("a tag filter and a sort survive a reload and the drawer", async ({
  page,
}) => {
  const tag = uniqueTag();
  const alpha = uniqueTitle("Alpha");
  const beta = uniqueTitle("Beta");
  await createSnippet(page, alpha, [tag]);
  await createSnippet(page, beta, [tag]);

  await chooseOption(page, "Filter by tag", tag);
  await expect(page).toHaveURL(urlOf(`/items/snippets?tag=${tag}`));
  await expect(cardTitles(page)).toHaveText([beta, alpha]);

  // A-Z turns the default order (newest first) around, so the rows prove the
  // server read the sort, not only the URL.
  await chooseOption(page, "Sort items", "A-Z");
  await expect(page).toHaveURL(urlOf(`/items/snippets?sort=a-z&tag=${tag}`));
  await expect(cardTitles(page)).toHaveText([alpha, beta]);

  await page.reload();
  await expect(cardTitles(page)).toHaveText([alpha, beta]);
  await expect(
    page.getByRole("combobox", { name: "Sort items", exact: true }),
  ).toHaveText("A-Z");
  await expect(
    page.getByRole("combobox", { name: "Filter by tag", exact: true }),
  ).toHaveText(tag);

  // A pin from the drawer refreshes the list behind it: the list keeps its
  // filter and sort, and the pin leads.
  await itemHeading(page, beta).click();
  const drawer = page.getByRole("dialog", { name: beta, exact: true });
  await expect(drawer).toBeVisible();
  const pin = drawer.getByRole("button", { name: "Pin", exact: true });
  await pin.click();
  await expect(pin).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");

  await expect(drawer).toBeHidden();
  await expect(page).toHaveURL(urlOf(`/items/snippets?sort=a-z&tag=${tag}`));
  await expect(cardTitles(page)).toHaveText([beta, alpha]);
});

test("the sort of favorite items survives a reload", async ({ page }) => {
  const title = uniqueTitle("Starred");
  await createSnippet(page, title);

  await itemHeading(page, title).click();
  const drawer = page.getByRole("dialog", { name: title, exact: true });
  const favorite = drawer.getByRole("button", {
    name: "Favorite",
    exact: true,
  });
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();

  await page.goto("/favorites");
  await chooseOption(page, "Sort items", "A-Z");
  await expect(page).toHaveURL(urlOf("/favorites?itemSort=a-z"));

  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Sort items", exact: true }),
  ).toHaveText("A-Z");
});
