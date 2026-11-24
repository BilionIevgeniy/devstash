import type { NextRequest } from "next/server";
import { logger } from "@/lib/observability/logger";
import { probeError, readProbeSecrets } from "../probe";

// A caught error, logged the way the app logs one: a fixed message, an id and
// the error. The logger sends one failure (message, class, code) once a
// minute per instance, so the run's code (`run`, no secret) keeps a repeated
// test from meeting its own earlier report.
export async function GET(request: NextRequest): Promise<Response> {
  const params = request.nextUrl.searchParams;
  const error = Object.assign(probeError("Logged", readProbeSecrets(params)), {
    code: params.get("run") ?? "E2E_PROBE",
  });
  await logger.error("The end-to-end probe failed", {
    error,
    userId: "e2e-probe-user",
  });
  return new Response(null, { status: 500 });
}
