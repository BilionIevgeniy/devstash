"use server";

import { refresh } from "next/cache";

import { localeSchema } from "@/features/app-shell/schemas";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { ok, type ActionResult } from "@/lib/action-result";
import { setLocaleCookie } from "@/lib/locale-cookie";
import { firstIssue } from "@/lib/validation";

// The language of the app and the auth pages, chosen in the user menu
// (ADR 0024). No service: nothing is written but the cookie. refresh() brings
// the page back in the new language.
export async function setLocale(input: unknown): Promise<ActionResult> {
  const parsed = localeSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);

  // A signed-out caller is redirected by a thrown error.
  await getSessionUser();

  await setLocaleCookie(parsed.data);
  refresh();
  return ok();
}
