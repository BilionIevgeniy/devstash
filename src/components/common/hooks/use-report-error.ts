import { useEffect } from "react";

import { errorDigest } from "@/lib/error-summary";
import { logger } from "@/lib/logger";

// For an error boundary. An error that Next.js got from the server carries a
// digest, and the server already reported it (`onRequestError`), so reporting
// it here would make two events of one error. What arrives without a digest
// was thrown in the browser: that one is reported, with a message the boundary
// wrote. Returns the digest, for the page to show as a reference.
export function useReportError(
  error: unknown,
  message: string,
): string | undefined {
  const digest = errorDigest(error);

  useEffect(() => {
    if (digest !== undefined) return;
    void logger.error(message, { error });
  }, [error, digest, message]);

  return digest;
}
