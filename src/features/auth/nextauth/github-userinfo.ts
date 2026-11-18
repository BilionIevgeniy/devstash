import "server-only";

import { pickVerifiedEmail } from "@/features/auth/domain/github-email";

const GITHUB_API = "https://api.github.com";

type GitHubProfile = Record<string, unknown> & { email?: string | null };

// Auth.js's own request for the GitHub profile, except for the address: a
// public email is always verified on GitHub, and the fallback read from
// /user/emails must be the verified primary one, or there is none (the sign-in
// callback then refuses a new user). A user already linked keeps the address
// stored at sign-up.
export async function requestGitHubProfile({
  tokens,
}: {
  tokens: { access_token?: string };
}): Promise<GitHubProfile> {
  const headers = {
    Authorization: `Bearer ${tokens.access_token}`,
    "User-Agent": "devstash",
  };
  const response = await fetch(`${GITHUB_API}/user`, { headers });
  const profile = (await response.json()) as GitHubProfile;
  if (profile.email) return profile;

  const emails = await fetch(`${GITHUB_API}/user/emails`, { headers });
  return {
    ...profile,
    email: emails.ok ? pickVerifiedEmail(await emails.json()) : null,
  };
}
