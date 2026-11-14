import type { Page } from "@playwright/test";
import { E2E_USER_PASSWORD, requireE2eUserEmail } from "../../scripts/e2e-user";

// A different client address for every sign-in. Next fills `x-forwarded-for`
// from the socket when the header is missing, so without this every test
// request would share one per-IP counter (20 per 15 minutes, never reset by a
// success) in the Upstash database. 203.0.113.0/24 is reserved for
// documentation (RFC 5737): never a real client.
function randomTestIp(): string {
  return `203.0.113.${1 + Math.floor(Math.random() * 254)}`;
}

// Fills the sign-in form with the user of this run (or another seeded user)
// and submits it. The caller asserts where it lands. No wait for hydration:
// React keeps text typed before it, and the form posts to its Server Action
// without script.
export async function signInThroughForm(
  page: Page,
  email: string = requireE2eUserEmail(),
): Promise<void> {
  await page
    .context()
    .setExtraHTTPHeaders({ "x-forwarded-for": randomTestIp() });
  await page.goto("/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(E2E_USER_PASSWORD);
  // Exact: "Sign in with GitHub" is a button too.
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
