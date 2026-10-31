import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import {
  BCRYPT_ROUNDS,
  DUMMY_PASSWORD_HASH,
  verifyPassword,
} from "@/features/auth/_internal/password";

describe("DUMMY_PASSWORD_HASH", () => {
  // A cheaper dummy would bring back the timing gap between a missing account
  // and a wrong password.
  it("costs the same rounds as a real password hash", () => {
    expect(bcrypt.getRounds(DUMMY_PASSWORD_HASH)).toBe(BCRYPT_ROUNDS);
  });
});

describe("verifyPassword", () => {
  it("never accepts a password when there is no hash", async () => {
    expect(await verifyPassword("anything", null)).toBe(false);
    expect(await verifyPassword("anything", undefined)).toBe(false);
  });

  it("checks a password against its hash", async () => {
    const hash = await bcrypt.hash("correct horse", 4);
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
