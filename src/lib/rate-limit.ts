import "server-only";

import { createHash } from "node:crypto";
import { getClientIp } from "@/lib/client-ip";
import { prisma } from "@/lib/prisma";

export interface RateLimitPolicy {
  name: string;
  limit: number;
  windowSeconds: number;
}

const PRUNE_PROBABILITY = 0.01;
const PRUNE_AFTER_MS = 24 * 60 * 60 * 1000;

let hasWarnedAboutMissingIp = false;

function toKey(policy: RateLimitPolicy, identifier: string): string {
  // Hashed so the table never holds plain emails or IP addresses.
  const hash = createHash("sha256").update(identifier).digest("hex");
  return `${policy.name}:${hash}`;
}

async function pruneExpired(): Promise<void> {
  try {
    await prisma.rateLimit.deleteMany({
      where: { windowStart: { lt: new Date(Date.now() - PRUNE_AFTER_MS) } },
    });
  } catch (error) {
    console.error("Pruning rate limits failed:", error);
  }
}

// Fixed-window counter in a single atomic upsert on the database clock, so
// parallel requests and separate serverless instances all count the same hit
// once. Returns false once the policy's limit for the window is used up.
export async function consumeRateLimit(
  policy: RateLimitPolicy,
  identifier: string,
): Promise<boolean> {
  const key = toKey(policy, identifier);
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart")
    VALUES (${key}, 1, timezone('utc', now()))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimit"."windowStart" <= timezone('utc', now()) - make_interval(secs => ${policy.windowSeconds}::double precision)
        THEN 1
        ELSE "RateLimit"."count" + 1
      END,
      "windowStart" = CASE
        WHEN "RateLimit"."windowStart" <= timezone('utc', now()) - make_interval(secs => ${policy.windowSeconds}::double precision)
        THEN timezone('utc', now())
        ELSE "RateLimit"."windowStart"
      END
    RETURNING "count"
  `;

  if (Math.random() < PRUNE_PROBABILITY) await pruneExpired();

  return rows[0].count <= policy.limit;
}

export async function resetRateLimit(
  policy: RateLimitPolicy,
  identifier: string,
): Promise<void> {
  await prisma.rateLimit.deleteMany({
    where: { key: toKey(policy, identifier) },
  });
}

// Without a client address every request would share one counter and a single
// client could lock everyone out, so a request with no address skips the
// per-IP limits; the per-account limits still apply.
export async function consumeIpRateLimit(
  policy: RateLimitPolicy,
  headers: Pick<Headers, "get">,
): Promise<boolean> {
  const ip = getClientIp(headers);
  if (!ip) {
    if (!hasWarnedAboutMissingIp) {
      hasWarnedAboutMissingIp = true;
      console.warn("No client IP in the request headers; IP rate limits are skipped");
    }
    return true;
  }

  return consumeRateLimit(policy, ip);
}
