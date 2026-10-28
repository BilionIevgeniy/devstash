import { z } from "zod";
import {
  getRetryAfterSeconds,
  getTooManyAttemptsMessage,
  REGISTER_BY_IP,
} from "@/features/auth/domain/rate-limits";
import { registerAccount } from "@/features/auth/services/registration";
import { getAppOrigin } from "@/lib/app-url";
import { consumeIpRateLimit } from "@/lib/rate-limit";

const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email("Invalid email address")),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

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
    const limit = await consumeIpRateLimit(REGISTER_BY_IP, request.headers);
    if (!limit.success) {
      const now = Date.now();
      return failure(getTooManyAttemptsMessage(limit.reset, now), 429, {
        "Retry-After": String(getRetryAfterSeconds(limit.reset, now)),
      });
    }

    await registerAccount({ name, email, password }, getAppOrigin());
    return accepted();
  } catch (error) {
    console.error("Registration failed:", error);
    return failure("Something went wrong", 500);
  }
}
