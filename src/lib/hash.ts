import "server-only";

import { createHash, createHmac } from "node:crypto";

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// Keyed, so a stored digest cannot be reversed by hashing a list of guesses
// (every email address, the whole IPv4 space) without the key.
export function hmacSha256Hex(key: string, value: string): string {
  return createHmac("sha256", key).update(value).digest("hex");
}
