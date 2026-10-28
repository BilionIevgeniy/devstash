import "server-only";

import { randomBytes } from "node:crypto";
import { sha256Hex } from "@/lib/hash";

const TOKEN_BYTES = 32;

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

// Only the hash is stored, so a leaked table cannot be used to open a link.
export function hashToken(token: string): string {
  return sha256Hex(token);
}
