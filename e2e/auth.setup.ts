import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { expect, test as setup } from "@playwright/test";
import {
  listsUserEmail,
  overLimitUserEmail,
  proUserEmail,
  requireE2eUserEmail,
} from "../scripts/e2e-user";
import {
  AUTH_FILE,
  LISTS_AUTH_FILE,
  OVER_LIMIT_AUTH_FILE,
  PRO_AUTH_FILE,
} from "./support/storage-state";
import { signInThroughForm } from "./support/sign-in";

// Signs in once through the form and saves the session for the other tests.
setup("sign in and save the session", async ({ page }) => {
  await signInThroughForm(page);
  await expect(page).toHaveURL(/\/dashboard$/);

  // The folder is in .gitignore, so a fresh checkout does not have it.
  await mkdir(dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
});

setup("sign in the user with the long lists", async ({ page }) => {
  await signInThroughForm(page, listsUserEmail(requireE2eUserEmail()));
  await expect(page).toHaveURL(/\/dashboard$/);

  await mkdir(dirname(LISTS_AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: LISTS_AUTH_FILE });
});

setup("sign in the Pro user", async ({ page }) => {
  await signInThroughForm(page, proUserEmail(requireE2eUserEmail()));
  await expect(page).toHaveURL(/\/dashboard$/);

  await mkdir(dirname(PRO_AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: PRO_AUTH_FILE });
});

setup("sign in the former Pro user over the limit", async ({ page }) => {
  await signInThroughForm(page, overLimitUserEmail(requireE2eUserEmail()));
  await expect(page).toHaveURL(/\/dashboard$/);

  await mkdir(dirname(OVER_LIMIT_AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: OVER_LIMIT_AUTH_FILE });
});
