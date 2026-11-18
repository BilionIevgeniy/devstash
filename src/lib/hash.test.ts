import { describe, expect, it } from "vitest";

import { hmacSha256Hex, sha256Hex } from "@/lib/hash";

describe("hmacSha256Hex", () => {
  it("matches the RFC 4231 test vector", () => {
    expect(hmacSha256Hex("Jefe", "what do ya want for nothing?")).toBe(
      "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    );
  });

  it("depends on the key, so the plain digest of a guess never matches", () => {
    const email = "ada@example.com";
    const digest = hmacSha256Hex("k".repeat(32), email);
    expect(digest).not.toBe(sha256Hex(email));
    expect(digest).not.toBe(hmacSha256Hex("j".repeat(32), email));
  });
});
