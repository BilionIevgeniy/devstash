import { afterEach, describe, expect, it, vi } from "vitest";

import { requestGitHubProfile } from "@/features/auth/nextauth/github-userinfo";

function stubGitHub(profile: object, emails: unknown, emailsOk = true) {
  const fetch = vi.fn(async (url: string) =>
    url.endsWith("/user/emails")
      ? Response.json(emails, { status: emailsOk ? 200 : 403 })
      : Response.json(profile),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("requestGitHubProfile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the public address, which GitHub has verified, with no second call", async () => {
    const fetch = stubGitHub({ id: 1, email: "ada@example.com" }, []);

    const profile = await requestGitHubProfile({
      tokens: { access_token: "t" },
    });

    expect(profile.email).toBe("ada@example.com");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to the verified primary address only", async () => {
    stubGitHub({ id: 1, email: null }, [
      { email: "victim@example.com", primary: true, verified: false },
    ]);

    const profile = await requestGitHubProfile({
      tokens: { access_token: "t" },
    });

    expect(profile).toEqual({ id: 1, email: null });
  });

  it("has no address when the list of addresses is refused", async () => {
    stubGitHub({ id: 1, email: null }, { message: "Forbidden" }, false);

    const profile = await requestGitHubProfile({
      tokens: { access_token: "t" },
    });

    expect(profile.email).toBeNull();
  });
});
