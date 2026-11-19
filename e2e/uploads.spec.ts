import { expect, test, type Locator } from "@playwright/test";
import { signInFreshUser } from "./support/fresh-user";
import { itemHeading, openCreateDialog, uniqueTitle } from "./support/items";
import { SIGNED_OUT } from "./support/storage-state";

// Uploads on a fresh Pro user. The browser PUTs to the signed URL and the
// server checks the object before it saves the item, both against the local
// R2 stand-in (scripts/fake-r2.ts, ADR 0035).
test.use({ storageState: SIGNED_OUT });

// The smallest PNG there is: one transparent pixel.
const PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const NOTES_TXT = Buffer.from("Notes of the e2e upload\n");

// The drop zone opens the browser's file picker, as a user's click does.
async function pickFile(
  dialog: Locator,
  zone: string,
  file: { name: string; mimeType: string; buffer: Buffer },
): Promise<void> {
  const [chooser] = await Promise.all([
    dialog.page().waitForEvent("filechooser"),
    dialog.getByRole("button", { name: zone }).click(),
  ]);
  await chooser.setFiles(file);
}

test("an uploaded image shows in the gallery", async ({ page }) => {
  await signInFreshUser(page, "pro");
  const title = uniqueTitle("Uploaded image");

  const dialog = await openCreateDialog(page, "/items/images", "Image");
  await dialog.getByLabel("Title", { exact: true }).fill(title);
  await pickFile(dialog, "Upload an image", {
    name: "pixel.png",
    mimeType: "image/png",
    buffer: PIXEL_PNG,
  });
  // The finished upload offers to remove it; the create waits for that.
  await expect(
    dialog.getByRole("button", { name: "Remove the image" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  await expect(dialog).toBeHidden();

  const card = page
    .getByRole("article")
    .filter({ has: itemHeading(page, title) });
  const image = card.getByRole("presentation");
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.naturalWidth),
    )
    .toBe(1);
});

test("an uploaded file is offered as a download", async ({ page, request }) => {
  await signInFreshUser(page, "pro");
  const title = uniqueTitle("Uploaded file");

  const dialog = await openCreateDialog(page, "/items/files", "File");
  await dialog.getByLabel("Title", { exact: true }).fill(title);
  await pickFile(dialog, "Upload a file", {
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: NOTES_TXT,
  });
  await expect(
    dialog.getByRole("button", { name: "Remove the file" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  await expect(dialog).toBeHidden();
  // A file is a row, a link named by its title, file name, size and date.
  await expect(page.getByRole("link", { name: title })).toBeVisible();

  // What the app signs: an attachment, so the browser saves it.
  const link = page.getByRole("link", { name: "Download notes.txt" });
  const href = await link.getAttribute("href");
  expect(href).not.toBeNull();
  const signed = new URL(href ?? "");
  expect(signed.searchParams.get("response-content-disposition")).toMatch(
    /^attachment;/,
  );

  const download = await request.get(signed.toString());
  expect(download.status()).toBe(200);
  expect(await download.body()).toEqual(NOTES_TXT);
});
