import type { Locator } from "@playwright/test";
import { expect, test } from "./support/test";
import { FAKE_SUMMARY } from "../scripts/fake-openai";
import { createSnippet, itemHeading, uniqueTitle } from "./support/items";
import { PRO_AUTH_FILE } from "./support/storage-state";

// ADR 0027: an accepted AI summary is saved with its mark (the attribute and
// the visible label), and an edit of the description takes both away. The
// summary comes from the local fake of the OpenAI API (scripts/fake-openai.ts).
test.use({ storageState: PRO_AUTH_FILE });

async function saveEdit(drawer: Locator) {
  await drawer.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    drawer.getByRole("button", { name: "Edit", exact: true }),
  ).toBeVisible();
}

test("an accepted summary is marked until the description is edited", async ({
  page,
}) => {
  const title = uniqueTitle("AI summary");
  await createSnippet(page, title);
  await itemHeading(page, title).click();
  const drawer = page.getByRole("dialog", { name: title, exact: true });
  await drawer.getByRole("button", { name: "Edit", exact: true }).click();

  await drawer
    .getByRole("button", { name: "Generate with AI for description" })
    .click();
  await drawer
    .getByRole("region", { name: "Suggested description" })
    .getByRole("button", { name: "Accept", exact: true })
    .click();
  await expect(drawer.getByLabel("Description", { exact: true })).toHaveValue(
    FAKE_SUMMARY,
  );
  await saveEdit(drawer);

  await expect(
    drawer.getByRole("heading", { name: "Description AI-generated" }),
  ).toBeVisible();
  // The machine-readable mark is the point of this journey, so it is read as
  // an attribute: the marked element is the one that holds the summary.
  await expect(
    drawer.locator("[data-ai-generated]").filter({ hasText: FAKE_SUMMARY }),
  ).toHaveCount(1);

  await drawer.getByRole("button", { name: "Edit", exact: true }).click();
  await drawer
    .getByLabel("Description", { exact: true })
    .fill(`${FAKE_SUMMARY} Edited.`);
  await saveEdit(drawer);

  await expect(
    drawer.getByRole("heading", { name: "Description", exact: true }),
  ).toBeVisible();
  await expect(drawer.getByText("AI-generated")).toHaveCount(0);
  await expect(drawer.locator("[data-ai-generated]")).toHaveCount(0);
});
