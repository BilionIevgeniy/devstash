import { describe, expect, it } from "vitest";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/features/auth/domain/password-reset";
import { NAME_MAX } from "@/features/auth/domain/registration";
import {
  changePasswordSchema,
  credentialsSchema,
  emailLinkParamsSchema,
  emailSchema,
  registerSchema,
  resetPasswordSchema,
  signInSchema,
} from "@/features/auth/schemas";

interface ParseOutcome {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}

function messagesAt(outcome: ParseOutcome, path: string): string[] {
  return (
    outcome.error?.issues
      .filter((issue) => issue.path.join(".") === path)
      .map((issue) => issue.message) ?? []
  );
}

const TOO_SHORT = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
const TOO_LONG = `Password must be at most ${MAX_PASSWORD_LENGTH} characters`;
const MISMATCH = "Passwords do not match";
const PASSWORD = "correct-horse-1";

describe("emailSchema", () => {
  it("trims and lowercases the address", () => {
    expect(emailSchema.parse("  Ada@Example.COM ")).toBe("ada@example.com");
  });

  it.each(["not-an-email", "", "   ", "ada@", "@example.com"])(
    "rejects %j",
    (value) => {
      const result = emailSchema.safeParse(value);
      expect(result.success).toBe(false);
      expect(messagesAt(result, "")).toContain("Invalid email address");
    },
  );

  it("rejects an address longer than SMTP can deliver to", () => {
    const local = "a".repeat(64);
    const domain = `${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(63)}.dev`;
    expect(emailSchema.safeParse(`${local}@${domain}`).success).toBe(false);
  });
});

describe("registerSchema", () => {
  const valid = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    password: PASSWORD,
    confirmPassword: PASSWORD,
  };

  it("accepts a complete registration", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("bounds the name", () => {
    expect(
      registerSchema.safeParse({ ...valid, name: "n".repeat(NAME_MAX) }).success,
    ).toBe(true);
    expect(
      registerSchema.safeParse({ ...valid, name: "n".repeat(NAME_MAX + 1) })
        .success,
    ).toBe(false);
  });

  it("trims the name and normalises the email", () => {
    const result = registerSchema.parse({
      ...valid,
      name: "  Ada Lovelace ",
      email: " Ada@Example.COM ",
    });
    expect(result.name).toBe("Ada Lovelace");
    expect(result.email).toBe("ada@example.com");
  });

  it("requires a name that is not only spaces", () => {
    const result = registerSchema.safeParse({ ...valid, name: "   " });
    expect(messagesAt(result, "name")).toContain("Name is required");
  });

  it("keeps spaces in the password exactly as typed", () => {
    const password = "  spaced pass  ";
    const result = registerSchema.parse({
      ...valid,
      password,
      confirmPassword: password,
    });
    expect(result.password).toBe(password);
  });

  it("accepts a password of exactly the minimum length", () => {
    const password = "a".repeat(MIN_PASSWORD_LENGTH);
    expect(
      registerSchema.safeParse({
        ...valid,
        password,
        confirmPassword: password,
      }).success,
    ).toBe(true);
  });

  it("rejects a password one character too short", () => {
    const password = "a".repeat(MIN_PASSWORD_LENGTH - 1);
    const result = registerSchema.safeParse({
      ...valid,
      password,
      confirmPassword: password,
    });
    expect(messagesAt(result, "password")).toContain(TOO_SHORT);
  });

  it("accepts a password of exactly the maximum length", () => {
    const password = "a".repeat(MAX_PASSWORD_LENGTH);
    expect(
      registerSchema.safeParse({
        ...valid,
        password,
        confirmPassword: password,
      }).success,
    ).toBe(true);
  });

  it("rejects a password one character too long", () => {
    const password = "a".repeat(MAX_PASSWORD_LENGTH + 1);
    const result = registerSchema.safeParse({
      ...valid,
      password,
      confirmPassword: password,
    });
    expect(messagesAt(result, "password")).toContain(TOO_LONG);
  });

  it("puts a mismatch on the confirmation field", () => {
    const result = registerSchema.safeParse({
      ...valid,
      confirmPassword: "something-else-1",
    });
    expect(result.success).toBe(false);
    expect(messagesAt(result, "confirmPassword")).toEqual([MISMATCH]);
  });
});

describe("resetPasswordSchema", () => {
  const valid = {
    email: "ada@example.com",
    token: "abc123",
    password: PASSWORD,
    confirmPassword: PASSWORD,
  };

  it("accepts a complete reset and normalises the email", () => {
    const result = resetPasswordSchema.parse({
      ...valid,
      email: " ADA@example.com",
    });
    expect(result.email).toBe("ada@example.com");
  });

  it("requires a token", () => {
    const result = resetPasswordSchema.safeParse({ ...valid, token: "" });
    expect(messagesAt(result, "token")).not.toHaveLength(0);
  });

  it("applies the same length rules as registration", () => {
    const short = "a".repeat(MIN_PASSWORD_LENGTH - 1);
    const result = resetPasswordSchema.safeParse({
      ...valid,
      password: short,
      confirmPassword: short,
    });
    expect(messagesAt(result, "password")).toContain(TOO_SHORT);
  });

  it("puts a mismatch on the confirmation field", () => {
    const result = resetPasswordSchema.safeParse({
      ...valid,
      confirmPassword: "something-else-1",
    });
    expect(messagesAt(result, "confirmPassword")).toEqual([MISMATCH]);
  });
});

describe("changePasswordSchema", () => {
  const valid = {
    currentPassword: "old-password-1",
    newPassword: PASSWORD,
    confirmPassword: PASSWORD,
  };

  it("accepts a complete change", () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it("requires the current password", () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      currentPassword: "",
    });
    expect(messagesAt(result, "currentPassword")).toContain(
      "Current password is required",
    );
  });

  it("applies the length rules to the new password", () => {
    const short = "a".repeat(MIN_PASSWORD_LENGTH - 1);
    const long = "a".repeat(MAX_PASSWORD_LENGTH + 1);
    expect(
      messagesAt(
        changePasswordSchema.safeParse({
          ...valid,
          newPassword: short,
          confirmPassword: short,
        }),
        "newPassword",
      ),
    ).toContain(TOO_SHORT);
    expect(
      messagesAt(
        changePasswordSchema.safeParse({
          ...valid,
          newPassword: long,
          confirmPassword: long,
        }),
        "newPassword",
      ),
    ).toContain(TOO_LONG);
  });

  it("puts a mismatch on the confirmation field", () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      confirmPassword: "something-else-1",
    });
    expect(messagesAt(result, "confirmPassword")).toEqual([MISMATCH]);
  });
});

describe("credentialsSchema", () => {
  it("normalises the email and keeps the password as typed", () => {
    const result = credentialsSchema.parse({
      email: " Ada@Example.COM ",
      password: " pass ",
    });
    expect(result).toEqual({ email: "ada@example.com", password: " pass " });
  });

  it("requires a password", () => {
    const result = credentialsSchema.safeParse({
      email: "ada@example.com",
      password: "",
    });
    expect(messagesAt(result, "password")).not.toHaveLength(0);
  });

  it("refuses a password longer than the maximum", () => {
    const result = credentialsSchema.safeParse({
      email: "ada@example.com",
      password: "a".repeat(MAX_PASSWORD_LENGTH + 1),
    });
    expect(messagesAt(result, "password")).not.toHaveLength(0);
  });
});

describe("signInSchema", () => {
  it("asks for a password when it is empty", () => {
    const result = signInSchema.safeParse({
      email: "ada@example.com",
      password: "",
    });
    expect(messagesAt(result, "password")).toContain("Password is required");
  });
});

describe("emailLinkParamsSchema", () => {
  it("normalises the email of an emailed link", () => {
    const result = emailLinkParamsSchema.parse({
      token: "abc123",
      email: " Ada@Example.COM",
    });
    expect(result).toEqual({ token: "abc123", email: "ada@example.com" });
  });

  it("rejects a link without a token", () => {
    const result = emailLinkParamsSchema.safeParse({
      token: "",
      email: "ada@example.com",
    });
    expect(result.success).toBe(false);
  });
});
