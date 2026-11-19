import { execFileSync } from "node:child_process";
import type { Page } from "@playwright/test";
import type { FreshUserKind } from "../../scripts/e2e-fixture";
import { signInThroughForm } from "./sign-in";

// A new user for this test only (scripts/e2e-fixture.ts), so a retry or a
// --repeat-each starts from the same state. The seed script runs under tsx in
// a child process, where the generated Prisma client loads.
export function createFreshUser(kind: FreshUserKind): string {
  return execFileSync("npx", ["tsx", "scripts/e2e-fixture.ts", kind], {
    env: process.env,
    encoding: "utf8",
  }).trim();
}

// Signs a fresh user in through the form; the spec runs in the SIGNED_OUT
// state, so no saved session gets in the way.
export async function signInFreshUser(
  page: Page,
  kind: FreshUserKind,
): Promise<string> {
  const email = createFreshUser(kind);
  await signInThroughForm(page, email);
  await page.waitForURL(/\/dashboard$/);
  return email;
}
