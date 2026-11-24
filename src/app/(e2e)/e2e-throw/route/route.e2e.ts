import type { NextRequest } from "next/server";
import { probeError, readProbeSecrets } from "../probe";

// A Route Handler that throws.
export function GET(request: NextRequest): Response {
  throw probeError("Route", readProbeSecrets(request.nextUrl.searchParams));
}
