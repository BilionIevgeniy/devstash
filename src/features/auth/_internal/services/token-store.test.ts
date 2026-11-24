import { beforeEach, describe, expect, it, vi } from "vitest";

const { transaction, deleteMany, create } = vi.hoisted(() => ({
  transaction: vi.fn(),
  deleteMany: vi.fn(),
  create: vi.fn(),
}));
vi.mock("@/lib/postgres/prisma", () => ({
  prisma: {
    $transaction: transaction,
    verificationToken: { deleteMany, create },
  },
}));

import { replaceToken } from "@/features/auth/_internal/services/token-store";
import { hashToken } from "@/features/auth/_internal/token";
import { addressTokenIdentifiers } from "@/features/auth/domain/token-identifiers";
import { getPasswordResetIdentifier } from "@/features/auth/domain/password-reset";

const EMAIL = "ada@example.com";
const IDENTIFIER = getPasswordResetIdentifier(EMAIL);
const NOW = new Date("2026-11-24T12:00:00Z");
const EXPIRES = new Date("2026-11-24T13:00:00Z");

describe("replaceToken", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    transaction.mockResolvedValue([]);
  });

  it("returns the token and stores only its hash", async () => {
    const token = await replaceToken(IDENTIFIER, EMAIL, EXPIRES, NOW);

    expect(create).toHaveBeenCalledWith({
      data: {
        identifier: IDENTIFIER,
        token: hashToken(token),
        expires: EXPIRES,
      },
    });
    expect(JSON.stringify(create.mock.calls)).not.toContain(token);
  });

  it("gives a new token each time", async () => {
    const first = await replaceToken(IDENTIFIER, EMAIL, EXPIRES, NOW);
    const second = await replaceToken(IDENTIFIER, EMAIL, EXPIRES, NOW);

    expect(first).not.toBe(second);
  });

  // An earlier link of the same kind must die, one of another kind must not
  // unless it has expired.
  it("replaces the same kind and drops only the expired ones of the address", async () => {
    await replaceToken(IDENTIFIER, EMAIL, EXPIRES, NOW);

    expect(deleteMany.mock.calls).toEqual([
      [{ where: { identifier: IDENTIFIER } }],
      [
        {
          where: {
            identifier: { in: addressTokenIdentifiers(EMAIL) },
            expires: { lt: NOW },
          },
        },
      ],
    ]);
  });

  it("does it in one transaction, the create last", async () => {
    deleteMany.mockReturnValueOnce("same kind").mockReturnValueOnce("expired");
    create.mockReturnValue("create");

    await replaceToken(IDENTIFIER, EMAIL, EXPIRES, NOW);

    expect(transaction).toHaveBeenCalledExactlyOnceWith([
      "same kind",
      "expired",
      "create",
    ]);
  });
});
