import { expect, test as setup } from "@playwright/test";
import { AUTH_FILE } from "./support/storage-state";
import { signInThroughForm } from "./support/sign-in";

// The sign-in of playwright.instant.config.ts. `next dev` compiles a route on
// its first request, and a field typed into before the form has hydrated can
// be lost there, so the sign-in is repeated until it lands (a new test IP each
// time, so no attempt counts against another).
setup("sign in on next dev", async ({ page }) => {
  setup.setTimeout(240_000);
  await page.request.get("/sign-in");
  await page.request.get("/dashboard", { maxRedirects: 0 });
  await expect(async () => {
    await signInThroughForm(page);
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  }).toPass({ timeout: 200_000 });
  await page.context().storageState({ path: AUTH_FILE });
});
