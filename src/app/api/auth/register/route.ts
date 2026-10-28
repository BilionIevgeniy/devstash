import {
  getRetryAfterSeconds,
  getTooManyAttemptsMessage,
  REGISTER_BY_IP,
} from "@/features/auth/domain/rate-limits";
import { registerSchema } from "@/features/auth/schemas";
import { registerAccount } from "@/features/auth/services/registration";
import { getAppOrigin } from "@/lib/app-url";
import { getClientIp } from "@/lib/client-ip";
import { consumeIpRateLimit } from "@/lib/rate-limit";

// New and already registered addresses get this same response, so the route
// cannot be used to find out who has an account.
function accepted() {
  return Response.json(
    { success: true, data: null, error: null },
    { status: 201 },
  );
}

function failure(error: string, status: number, headers?: HeadersInit) {
  return Response.json(
    { success: false, data: null, error },
    { status, headers },
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure("Invalid JSON body", 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return failure(parsed.error.issues[0].message, 400);
  }
  const { name, email, password } = parsed.data;

  try {
    const ip = getClientIp(request.headers);
    const limit = await consumeIpRateLimit(REGISTER_BY_IP, ip);
    if (!limit.success) {
      const now = Date.now();
      return failure(getTooManyAttemptsMessage(limit.reset, now), 429, {
        "Retry-After": String(getRetryAfterSeconds(limit.reset, now)),
      });
    }

    await registerAccount({ name, email, password }, getAppOrigin(), ip);
    return accepted();
  } catch (error) {
    console.error("Registration failed:", error);
    return failure("Something went wrong", 500);
  }
}
