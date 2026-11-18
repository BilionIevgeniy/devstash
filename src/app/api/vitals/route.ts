import { fail } from "@/lib/errors/action-result";
import { jsonError, NO_STORE } from "@/lib/http/api-response";
import { refuseCrossSiteJson } from "@/lib/http/same-origin-json";
import { getClientIp } from "@/lib/http/client-ip";
import { logger } from "@/lib/observability/logger";
import {
  parseWebVital,
  WEB_VITALS_BY_IP,
} from "@/lib/observability/web-vitals";
import { consumeLocalRateLimit } from "@/lib/vendors/local-rate-limit";

// One real-user Web Vital, sent by the browser of a visitor who agreed to the
// measurement (ADR 0034): the metric, its value and the group of the page,
// never the URL. Logged, not stored: the log is where the numbers are read.
// Open to visitors, so no session; a foreign page is refused like on
// /api/locale (`refuseCrossSiteJson`).
//
// No feature service behind it: there is no product data, only a log line, so
// the route calls lib alone (the exception of rule 6 that ADR 0034 records).
// The rate limit counts in the memory of the instance and never in Upstash: a
// lost metric costs nothing, and a beacon per metric should neither cost an
// Upstash command nor fail with an outage.
export async function POST(request: Request): Promise<Response> {
  const refused = refuseCrossSiteJson(request);
  if (refused) return refused;

  const ip = getClientIp(request.headers);
  if (ip && !consumeLocalRateLimit(WEB_VITALS_BY_IP, ip, Date.now())) {
    return jsonError(fail("tooManyAttemptsNoTime"), 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(fail("invalidRequest"), 400);
  }
  const vital = parseWebVital(body);
  if (!vital) return jsonError(fail("invalidRequest"), 400);

  logger.info(`Web Vital ${vital.name} on ${vital.group}`, {
    numbers: { value: vital.value },
  });
  return new Response(null, { status: 204, headers: NO_STORE });
}
