import "server-only";

import { headers } from "next/headers";
import { EMAIL_BY_IP } from "@/features/auth/domain/rate-limits";
import {
  consumeIpRateLimit,
  consumeRateLimit,
  RateLimitUnavailableError,
  type RateLimitPolicy,
} from "@/lib/rate-limit";

export type EmailSendCheck = "allowed" | "address-limited" | "ip-limited";

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
): Promise<EmailSendCheck> {
  try {
    const address = await consumeRateLimit(addressPolicy, email);
    if (!address.success) return "address-limited";

    const ip = await consumeIpRateLimit(EMAIL_BY_IP, await headers());
    if (!ip.success) return "ip-limited";
    return "allowed";
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) return "address-limited";
    throw error;
  }
}
