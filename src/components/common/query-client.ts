import { QueryClient } from "@tanstack/react-query";

import { RouteError } from "@/lib/route-error";

// Well under the signed-URL window of an upload (one hour, files/domain/
// file-rules.ts), so a detail kept for a later open never holds a dead link.
const GC_TIME_MS = 5 * 60 * 1000;

// A refusal (signed out, missing, locked, someone else's) answers the same
// the second time; only a failure is tried once more.
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof RouteError && error.status < 500) return false;
  return failureCount < 1;
}

// The one place the defaults live, used by QueryProvider and by the test
// wrapper (test/intl.tsx), so the tests run with the rules that ship.
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        refetchOnWindowFocus: false,
        gcTime: GC_TIME_MS,
      },
    },
  });
}
