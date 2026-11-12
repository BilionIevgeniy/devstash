import { CredentialsSignin } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EmailNotVerifiedError,
  TooManyAttemptsError,
} from "@/features/auth/_internal/errors";
import { authLogger } from "@/features/auth/nextauth/auth-logger";
import { logger } from "@/lib/logger";

// `next-auth` does not load under Vitest ("Testing" in
// context/coding-standards.md). The class is all that is used of it: the
// errors of the auth feature extend it, and the logger checks `instanceof`.
vi.mock("next-auth", () => ({
  CredentialsSignin: class CredentialsSignin extends Error {
    type = "CredentialsSignin";
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// What Auth.js hands over when the adapter fails: its own error, with the error
// that was thrown in `cause.err`.
function adapterError(cause: Error): Error {
  return new Error("Read more at https://errors.authjs.dev#adaptererror", {
    cause: { err: cause, provider: "github" },
  });
}

// An Auth.js error as a production build shows it: the class name is minified
// ("C"), the `type` string is not.
function authJsError(name: string, type: string): Error {
  return Object.assign(new Error("Read more at https://errors.authjs.dev"), {
    name,
    type,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("authLogger.error", () => {
  it.each([
    ["a wrong password", new CredentialsSignin()],
    ["an unverified address", new EmailNotVerifiedError()],
    ["a throttled sign-in", new TooManyAttemptsError()],
  ])("writes %s as a line, not as a failure", (_, error) => {
    authLogger.error?.(error);

    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      "A sign-in was refused",
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("reports the error that was thrown inside Auth.js, not its wrapper", () => {
    const thrown = Object.assign(new Error("quoted alice@example.com"), {
      name: "PrismaClientKnownRequestError",
      code: "P2002",
    });

    authLogger.error?.(adapterError(thrown));

    expect(logger.error).toHaveBeenCalledExactlyOnceWith(
      "Auth.js reported an error",
      { error: thrown },
    );
  });

  it("reports an error that has no cause as it is", () => {
    const failure = new Error("misconfigured");

    authLogger.error?.(failure);

    expect(logger.error).toHaveBeenCalledExactlyOnceWith(
      "Auth.js reported an error",
      { error: failure },
    );
  });

  it("names a minified Auth.js error by its type, so the issues do not merge", () => {
    const minified = authJsError("C", "MissingSecret");

    authLogger.error?.(minified);

    expect(logger.error).toHaveBeenCalledOnce();
    const [message, context] = vi.mocked(logger.error).mock.calls[0];
    expect(message).toBe("Auth.js reported an error");
    expect(context?.error).toMatchObject({
      name: "MissingSecret",
      type: "MissingSecret",
      stack: minified.stack,
    });
  });

  it.each([
    "UnknownAction",
    "MissingCSRF",
    "InvalidCheck",
    "JWTSessionError",
    "OAuthAccountNotLinked",
  ])("writes the refused request %s as a line, not as a failure", (type) => {
    authLogger.error?.(authJsError("C", type));

    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      `Auth.js refused a request: ${type}`,
      { error: expect.objectContaining({ type }) },
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("keeps the class of the error behind a refused request in the line", () => {
    const cause = new TypeError("a callback threw");
    const refused = Object.assign(adapterError(cause), {
      type: "JWTSessionError",
    });

    authLogger.error?.(refused);

    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      "Auth.js refused a request: JWTSessionError",
      { error: cause },
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it.each(["MissingSecret", "UntrustedHost"])(
    "still reports the broken configuration %s",
    (type) => {
      authLogger.error?.(authJsError("C", type));

      expect(logger.error).toHaveBeenCalledOnce();
      expect(logger.warn).not.toHaveBeenCalled();
    },
  );
});

describe("authLogger.warn and debug", () => {
  it("writes a warning of Auth.js as a warning", () => {
    authLogger.warn?.("debug-enabled");

    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      "Auth.js warning: debug-enabled",
    );
  });

  it("writes no debug line", () => {
    authLogger.debug?.("a message", { token: "secret" });

    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
