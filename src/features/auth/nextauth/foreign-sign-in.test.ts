import { encode } from "next-auth/jwt";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getForeignSignInRedirect } from "@/features/auth/nextauth/foreign-sign-in";

const { headers, getSessionVersion } = vi.hoisted(() => ({
  headers: vi.fn(),
  getSessionVersion: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers }));
vi.mock("@/features/auth/queries", () => ({ getSessionVersion }));

const SECRET = "test-secret";
const SECURE_COOKIE = "__Secure-authjs.session-token";
const PLAIN_COOKIE = "authjs.session-token";
const WRONG_ACCOUNT_URL = "/settings?reauth=wrong-account";
const REVOKED_SESSION_URL = "/sign-in?error=OAuthAccountNotLinked";

async function sendCookie(name: string) {
  const value = await encode({
    token: { sub: "user-1", sv: 2 },
    secret: SECRET,
    salt: name,
  });
  headers.mockResolvedValue(new Headers({ cookie: `${name}=${value}` }));
}

describe("getForeignSignInRedirect", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", SECRET);
    getSessionVersion.mockReset();
    getSessionVersion.mockResolvedValue(2);
  });

  it("lets a sign-in through when there is no session cookie", async () => {
    headers.mockResolvedValue(new Headers());

    expect(await getForeignSignInRedirect("user-2")).toBeNull();
  });

  it("lets the session's own user through", async () => {
    await sendCookie(SECURE_COOKIE);

    expect(await getForeignSignInRedirect("user-1")).toBeNull();
  });

  it("refuses another user with the https cookie", async () => {
    await sendCookie(SECURE_COOKIE);

    expect(await getForeignSignInRedirect("user-2")).toBe(WRONG_ACCOUNT_URL);
  });

  it("refuses another user with the plain cookie", async () => {
    await sendCookie(PLAIN_COOKIE);

    expect(await getForeignSignInRedirect("user-2")).toBe(WRONG_ACCOUNT_URL);
  });

  it("still refuses when the session was revoked", async () => {
    await sendCookie(SECURE_COOKIE);
    getSessionVersion.mockResolvedValue(3);

    expect(await getForeignSignInRedirect("user-2")).toBe(REVOKED_SESSION_URL);
  });

  it("still refuses when the session's user is gone", async () => {
    await sendCookie(SECURE_COOKIE);
    getSessionVersion.mockResolvedValue(null);

    expect(await getForeignSignInRedirect("user-2")).toBe(REVOKED_SESSION_URL);
  });
});
