import "server-only";

import { EMAIL_BY_IP } from "@/features/auth/domain/rate-limits";
import {
  consumeIpRateLimit,
  consumeRateLimit,
  RateLimitUnavailableError,
  type RateLimitPolicy,
} from "@/lib/rate-limit";

export type EmailSendCheck =
  | { status: "allowed" }
  | { status: "address-limited" }
  | { status: "ip-limited"; reset: number };

// A refusal for the address is answered with the same neutral result as a send
// so the response never reveals whether the address has an account. The IP
// check does not depend on the address, so an IP refusal can say so openly. The
// address is checked first so repeated clicks on "Resend" do not use up the IP's
// budget. When the limiter is unavailable nothing is sent and the neutral
// result is returned as well: registration only reaches this check for an
// existing pending account, so an error here would show which addresses exist.
export async function checkEmailSend(
  addressPolicy: RateLimitPolicy,
  email: string,
  ip: string | null,
): Promise<EmailSendCheck> {
  try {
    const address = await consumeRateLimit(addressPolicy, email);
    if (!address.success) return { status: "address-limited" };

    const ipCheck = await consumeIpRateLimit(EMAIL_BY_IP, ip);
    if (!ipCheck.success) return { status: "ip-limited", reset: ipCheck.reset };
    return { status: "allowed" };
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return { status: "address-limited" };
    }
    throw error;
  }
}
