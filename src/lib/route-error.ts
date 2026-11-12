import "client-only";

// The error a route answered as JSON (`{ error: "…" }`), in its own words.
// Anything else (the platform's own error page, an empty body) gets the
// caller's fallback.
export async function routeErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
    ) {
      return body.error;
    }
  } catch {
    // Not JSON: the fallback.
  }
  return fallback;
}
