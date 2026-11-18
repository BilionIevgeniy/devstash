import "server-only";

import { sha256Hex } from "@/lib/hash";

interface Window {
  count: number;
  resetAt: number;
}

// The most keys one instance keeps: past it the oldest are dropped, so an
// attacker with many addresses cannot grow the memory without bound.
const MAX_KEYS = 10_000;

const windows = new Map<string, Window>();

// A fixed-window counter in the memory of this instance, for the § 312k form
// while Upstash is down (ADR 0032): the declaration is still taken, but not
// without any bound. Weaker than Upstash (one counter per instance, gone on a
// cold start) on purpose: it only covers an outage. Keys are hashed, so the
// memory holds no address.
export function consumeLocalLimit(
  policy: { name: string; limit: number; windowSeconds: number },
  identifier: string,
  now: number,
): boolean {
  const key = sha256Hex(`${policy.name}:${identifier}`);
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    if (windows.size >= MAX_KEYS) {
      const oldest = windows.keys().next().value;
      if (oldest !== undefined) windows.delete(oldest);
    }
    windows.set(key, { count: 1, resetAt: now + policy.windowSeconds * 1000 });
    return true;
  }
  current.count += 1;
  return current.count <= policy.limit;
}
