import "server-only";

import { headers } from "next/headers";
import { EMAIL_BY_IP } from "@/features/auth/domain/rate-limits";
import {
  consumeIpRateLimit,
  consumeRateLimit,
  type RateLimitPolicy,
} from "@/lib/rate-limit";

export type EmailSendCheck = "allowed" | "address-limited" | "ip-limited";

// A refusal for the address is answered with the same neutral result as a send
// so the response never reveals whether the address has an account. The IP
// check does not depend on the address, so an IP refusal can say so openly. The
// address is checked first so repeated clicks on "Resend" do not use up the IP's
// budget.
export async function checkEmailSend(
  addressPolicy: RateLimitPolicy,
  email: string,
): Promise<EmailSendCheck> {
  if (!(await consumeRateLimit(addressPolicy, email))) return "address-limited";
  if (!(await consumeIpRateLimit(EMAIL_BY_IP, await headers()))) {
    return "ip-limited";
  }
  return "allowed";
}
