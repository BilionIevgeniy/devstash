import "server-only";

import { cookies } from "next/headers";

import { LOCALE_COOKIE, type Locale } from "@/i18n/config";

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

// The language the user chose, in the user menu or on the homepage (ADR
// 0024): a preference cookie, not a session one, so it survives a sign-out
// and the next sign-in. Read by lib/i18n-request.ts; httpOnly, since only the
// server reads it. The one place that writes it, for the action and the route.
export async function setLocaleCookie(locale: Locale): Promise<void> {
  (await cookies()).set(LOCALE_COOKIE, locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
  });
}
