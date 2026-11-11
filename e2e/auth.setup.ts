import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { expect, test as setup } from "@playwright/test";
import { AUTH_FILE } from "./support/storage-state";
import { signInThroughForm } from "./support/sign-in";

// Signs in once through the form and saves the session for the other tests.
setup("sign in and save the session", async ({ page }) => {
  await signInThroughForm(page);
  await expect(page).toHaveURL(/\/dashboard$/);

  // The folder is in .gitignore, so a fresh checkout does not have it.
  await mkdir(dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
});
