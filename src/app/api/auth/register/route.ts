import {
  getRetryAfterSeconds,
  getTooManyAttemptsMessage,
  REGISTER_BY_IP,
} from "@/features/auth/domain/rate-limits";
import { registerSchema } from "@/features/auth/schemas";
import { registerAccount } from "@/features/auth/services/registration";
import { jsonError, jsonOk, SERVER_ERROR_MESSAGE } from "@/lib/api-response";
import { getAppOrigin } from "@/lib/app-url";
import { getClientIp } from "@/lib/client-ip";
import { logger } from "@/lib/logger";
import { consumeIpRateLimit } from "@/lib/rate-limit";
import { firstIssueMessage } from "@/lib/validation";

// New and already registered addresses get this same response, so the route
// cannot be used to find out who has an account.
function accepted() {
  return jsonOk(null, { status: 201 });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(firstIssueMessage(parsed.error), 400);
  }
  const { name, email, password } = parsed.data;

  try {
    const ip = getClientIp(request.headers);
    const limit = await consumeIpRateLimit(REGISTER_BY_IP, ip);
    if (!limit.success) {
      const now = Date.now();
      return jsonError(getTooManyAttemptsMessage(limit.reset, now), 429, {
        "Retry-After": String(getRetryAfterSeconds(limit.reset, now)),
      });
    }

    await registerAccount({ name, email, password }, getAppOrigin(), ip);
    return accepted();
  } catch (error) {
    await logger.error("Registration failed", { error });
    return jsonError(SERVER_ERROR_MESSAGE, 500);
  }
}
