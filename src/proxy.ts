import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/features/auth/nextauth/auth.config";

const { auth } = NextAuth(authConfig);

// A Server Action call is let through: answered here with a 307, it reaches the
// browser as "An unexpected response was received from the server" instead of
// a redirect, so the page shows an error and never goes to sign-in. Each action
// checks the session itself (getSessionUser or auth()) and redirects, and the
// page rendered after it reads the session too. Only a POST carries an action;
// any other request with the header is still sent to sign-in.
function isServerActionCall(req: Request): boolean {
  return req.method === "POST" && req.headers.has("next-action");
}

export const proxy = auth((req) => {
  if (!req.auth && !isServerActionCall(req)) {
    const signInUrl = new URL(authConfig.pages.signIn, req.nextUrl.origin);
    signInUrl.searchParams.set(
      "callbackUrl",
      req.nextUrl.pathname + req.nextUrl.search,
    );
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/items/:path*",
    "/collections/:path*",
    "/favorites/:path*",
    "/pinned/:path*",
    "/upgrade/:path*",
  ],
};
