import "server-only";

import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getClientIp } from "@/lib/client-ip";

export interface RateLimitPolicy {
  name: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

// Thrown when Upstash cannot answer. The limiter fails closed: the caller gets
// an error and the request is not let through unchecked.
export class RateLimitUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("Rate limiting is unavailable", options);
    this.name = "RateLimitUnavailableError";
  }
}

let hasWarnedAboutMissingIp = false;
let redis: Redis | undefined;

// One limiter per policy, kept at module level so its in-memory cache of
// blocked identifiers survives between requests on a warm instance.
const limiters = new Map<string, Ratelimit>();

// Created on first use so a build never needs the credentials.
function getRedis(): Redis {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set",
    );
  }
  redis = new Redis({ url, token });
  return redis;
}

function getLimiter(policy: RateLimitPolicy): Ratelimit {
  let limiter = limiters.get(policy.name);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(
        policy.limit,
        `${policy.windowSeconds} s`,
      ),
      // The library keys counters by prefix and identifier only, so without a
      // prefix per policy one email would share a counter across policies.
      prefix: `ratelimit:${policy.name}`,
    });
    limiters.set(policy.name, limiter);
  }
  return limiter;
}

function toIdentifier(identifier: string): string {
  // Hashed so Upstash never holds plain emails or IP addresses.
  return createHash("sha256").update(identifier).digest("hex");
}

// Sliding-window counter on Upstash, so parallel requests and separate
// serverless instances all count the same hit. The library lets a request
// through when Upstash times out; here that is treated as an outage, like an
// error thrown by the call.
export async function consumeRateLimit(
  policy: RateLimitPolicy,
  identifier: string,
): Promise<RateLimitResult> {
  try {
    const { success, remaining, reset, reason } = await getLimiter(
      policy,
    ).limit(toIdentifier(identifier));
    if (reason === "timeout") throw new Error("Upstash did not answer in time");

    return { success, remaining, reset };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    throw new RateLimitUnavailableError({ cause: error });
  }
}

// A failed reset only leaves the counter where it was, which is the stricter
// outcome, so it is logged and does not fail the caller.
export async function resetRateLimit(
  policy: RateLimitPolicy,
  identifier: string,
): Promise<void> {
  try {
    await getLimiter(policy).resetUsedTokens(toIdentifier(identifier));
  } catch (error) {
    console.error("Resetting a rate limit failed:", error);
  }
}

// Without a client address every request would share one counter and a single
// client could lock everyone out, so a request with no address skips the
// per-IP limits; the per-account limits still apply.
export async function consumeIpRateLimit(
  policy: RateLimitPolicy,
  headers: Pick<Headers, "get">,
): Promise<RateLimitResult> {
  const ip = getClientIp(headers);
  if (!ip) {
    if (!hasWarnedAboutMissingIp) {
      hasWarnedAboutMissingIp = true;
      console.warn("No client IP in the request headers; IP rate limits are skipped");
    }
    return { success: true, remaining: policy.limit, reset: Date.now() };
  }

  return consumeRateLimit(policy, ip);
}
