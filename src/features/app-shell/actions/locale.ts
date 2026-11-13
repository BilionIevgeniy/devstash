"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";

import { localeSchema } from "@/features/app-shell/schemas";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { LOCALE_COOKIE } from "@/i18n/config";
import { ok, type ActionResult } from "@/lib/action-result";
import { firstIssue } from "@/lib/validation";

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

// The language of the app and the auth pages, chosen in the user menu
// (ADR 0024): a preference cookie, not a session one, so the choice survives a
// sign-out and the next sign-in. No service: nothing is written but the
// cookie. refresh() brings the page back in the new language.
export async function setLocale(input: unknown): Promise<ActionResult> {
  const parsed = localeSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);

  // A signed-out caller is redirected by a thrown error.
  await getSessionUser();

  (await cookies()).set(LOCALE_COOKIE, parsed.data, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
  });
  refresh();
  return ok();
}
