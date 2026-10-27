import "server-only";

const GITHUB_API_URL = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const REQUEST_TIMEOUT_MS = 5000;
const NOT_FOUND_STATUS = 404;

// Removes the app's authorization for the token's owner, which also revokes
// every token of that authorization. GitHub skips its authorize screen while
// the app holds one, so the next GitHub sign-in shows the screen again. Best
// effort: a failure is logged and never blocks the sign-in or the deletion
// that calls it. A 404 means the token is already gone, which is the goal.
export async function revokeGitHubGrant(accessToken: string): Promise<void> {
  const clientId = process.env.AUTH_GITHUB_ID;
  const clientSecret = process.env.AUTH_GITHUB_SECRET;
  if (!clientId || !clientSecret) {
    console.error(
      "Revoking the GitHub authorization failed: AUTH_GITHUB_ID or AUTH_GITHUB_SECRET is not set",
    );
    return;
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`);
    const response = await fetch(
      `${GITHUB_API_URL}/applications/${clientId}/grant`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${credentials.toString("base64")}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": GITHUB_API_VERSION,
        },
        body: JSON.stringify({ access_token: accessToken }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
    if (response.ok || response.status === NOT_FOUND_STATUS) return;

    console.error(
      "Revoking the GitHub authorization failed with status",
      response.status,
    );
  } catch (error) {
    console.error("Revoking the GitHub authorization failed:", error);
  }
}
