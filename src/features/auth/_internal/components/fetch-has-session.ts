import "client-only";

// The browser side of GET /api/auth/session. A signed-out visitor gets null;
// a server error has a body with no user either, so it also counts as a guest.
export async function fetchHasSession(signal: AbortSignal): Promise<boolean> {
  const response = await fetch("/api/auth/session", { signal });
  if (!response.ok) return false;
  const body = (await response.json()) as { user?: unknown } | null;
  return Boolean(body?.user);
}
