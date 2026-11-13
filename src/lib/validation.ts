import type { ZodError } from "zod";

const INVALID_INPUT_MESSAGE = "Invalid input";

// The message shown for input a schema refused: the first issue, as the
// schemas word each one for the user. Zod never fails without an issue; the
// fallback only keeps the type honest. Runs in the browser too
// (parseImportFile), so no server-only.
export function firstIssueMessage(
  error: ZodError,
  fallback = INVALID_INPUT_MESSAGE,
): string {
  return error.issues[0]?.message ?? fallback;
}
