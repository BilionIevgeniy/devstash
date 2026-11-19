import type { NextRequest } from "next/server";
import { logger } from "@/lib/observability/logger";
import { probeError, readProbeSecrets } from "../probe";

// A caught error, logged the way the app logs one: a fixed message, an id and
// the error.
export async function GET(request: NextRequest): Promise<Response> {
  const error = probeError(
    "Route",
    readProbeSecrets(request.nextUrl.searchParams),
  );
  await logger.error("The end-to-end probe failed", {
    error,
    userId: "e2e-probe-user",
  });
  return new Response(null, { status: 500 });
}
