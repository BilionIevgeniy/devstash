import { describe, expect, it } from "vitest";
import {
  errorDigest,
  errorFrames,
  errorSummary,
  safeError,
} from "@/lib/error-summary";

function errorWith(name: string, fields: Record<string, unknown>): Error {
  return Object.assign(new Error("quoted alice@example.com"), { name }, fields);
}

describe("errorSummary", () => {
  it("names the class and leaves the message out", () => {
    const summary = errorSummary(new TypeError("alice@example.com"));

    expect(summary).toEqual({ name: "TypeError" });
    expect(JSON.stringify(summary)).not.toContain("alice");
  });

  it("keeps the code of a Prisma error and leaves its meta out", () => {
    const error = errorWith("PrismaClientKnownRequestError", {
      code: "P2002",
      meta: { target: ["email"] },
    });

    expect(errorSummary(error)).toEqual({
      name: "PrismaClientKnownRequestError",
      code: "P2002",
    });
  });

  it("keeps status, code, type and request id of a vendor error", () => {
    const stripe = errorWith("StripeCardError", {
      type: "card_error",
      code: "card_declined",
      statusCode: 402,
      requestId: "req_123",
    });
    const openai = errorWith("RateLimitError", {
      status: 429,
      code: "rate_limit_exceeded",
      requestID: "req_abc",
    });

    expect(errorSummary(stripe)).toEqual({
      name: "StripeCardError",
      type: "card_error",
      code: "card_declined",
      status: 402,
      requestId: "req_123",
    });
    expect(errorSummary(openai)).toEqual({
      name: "RateLimitError",
      code: "rate_limit_exceeded",
      status: 429,
      requestId: "req_abc",
    });
  });

  it("drops a code that is text and a status that is not one", () => {
    const error = errorWith("Error", {
      code: "alice@example.com",
      type: "a title with spaces",
      status: 99999,
      requestID: "has space",
    });

    expect(errorSummary(error)).toEqual({ name: "Error" });
  });

  it("keeps the short reason of an answer that was cut short", () => {
    const error = errorWith("AiOutputError", { reason: "content_filter" });

    expect(errorSummary(error)).toEqual({
      name: "AiOutputError",
      reason: "content_filter",
    });
  });

  it("drops a reason that is a sentence", () => {
    const error = errorWith("Error", { reason: "quoted alice@example.com" });

    expect(errorSummary(error)).toEqual({ name: "Error" });
  });

  it("describes a value that is not an error", () => {
    expect(errorSummary("boom alice@example.com")).toEqual({
      name: "NonError",
    });
    expect(errorSummary(null)).toEqual({ name: "NonError" });
    expect(errorSummary(undefined)).toEqual({ name: "NonError" });
    expect(errorSummary({ message: "x" })).toEqual({ name: "NonError" });
  });
});

describe("errorDigest", () => {
  it("reads the digest of a server error", () => {
    expect(errorDigest(errorWith("Error", { digest: "1234567890" }))).toBe(
      "1234567890",
    );
  });

  it("is undefined for an error with no digest or an unusable one", () => {
    expect(errorDigest(new Error("x"))).toBeUndefined();
    expect(errorDigest({ digest: "has space" })).toBeUndefined();
    expect(errorDigest("digest")).toBeUndefined();
    expect(errorDigest(null)).toBeUndefined();
  });
});

describe("safeError", () => {
  const V8_STACK = [
    "PrismaClientValidationError: ",
    "Invalid `prisma.item.create()` invocation:",
    '{ data: { title: "Secret plan", email: "alice@example.com" } }',
    "    at createItem (/app/src/features/items/services/item.ts:41:9)",
    "    at async POST (/app/src/app/api/items/route.ts:12:3)",
    "    at new Promise (<anonymous>)",
  ].join("\n");

  function prismaError(stack: string | undefined): Error {
    const error = new Error("Invalid invocation, email alice@example.com");
    error.name = "PrismaClientValidationError";
    error.stack = stack;
    return error;
  }

  it("keeps the frames of a V8 stack and nothing of the message", () => {
    const standIn = safeError(
      prismaError(V8_STACK),
      "Creating the item failed",
    );

    expect(standIn.name).toBe("PrismaClientValidationError");
    expect(standIn.message).toBe("Creating the item failed");
    expect(standIn.stack).toContain(
      "at createItem (/app/src/features/items/services/item.ts:41:9)",
    );
    expect(standIn.stack).toContain("at async POST");
    expect(standIn.stack).toContain("at new Promise (<anonymous>)");
    expect(standIn.stack).not.toContain("alice");
    expect(standIn.stack).not.toContain("Secret plan");
    expect(standIn.stack).not.toContain("invocation");
  });

  it("keeps the frames of a Gecko or JavaScriptCore stack", () => {
    const stack = [
      "createItem@https://app.test/_next/static/chunks/a.js:1:2345",
      "alice@example.com:5",
      "@https://app.test/_next/static/chunks/b.js:3:4",
    ].join("\n");

    const standIn = safeError(prismaError(stack), "Static message");

    expect(standIn.stack).toContain("createItem@https://app.test/");
    expect(standIn.stack).toContain("b.js:3:4");
    expect(standIn.stack).not.toContain("alice");
  });

  it("does not take an email-shaped line for a Gecko frame", () => {
    const stack = [
      "alice@example.com/x:5",
      "createItem@https://app.test/a.js:1:2",
    ].join("\n");

    const standIn = safeError(prismaError(stack), "Static message");

    expect(standIn.stack).not.toContain("alice");
    expect(standIn.stack).toContain("createItem@https://app.test/a.js:1:2");
  });

  it("does not take a line of the message for a frame", () => {
    const stack = [
      "Error: failed at row 3",
      "    at row 3 of alice@example.com",
      "    at createItem (/app/src/item.ts:1:2)",
    ].join("\n");

    const standIn = safeError(prismaError(stack), "Static message");

    expect(standIn.stack).not.toContain("alice");
    expect(standIn.stack).not.toContain("row 3");
    expect(standIn.stack).toContain("at createItem");
  });

  it("drops a very long line even if it is shaped like a frame", () => {
    const longLine = `    at ${"x".repeat(600)}/y.js:1:2`;

    const standIn = safeError(prismaError(longLine), "Static message");

    expect(standIn.stack).not.toContain("xxxxx");
  });

  it("makes a stand-in for a value that is not an error", () => {
    const standIn = safeError("boom alice@example.com", "Static message");

    expect(standIn.name).toBe("NonError");
    expect(standIn.message).toBe("Static message");
    expect(standIn.stack).not.toContain("alice");
  });

  it("keeps a usable stack for an error that has none", () => {
    const standIn = safeError(prismaError(undefined), "Static message");

    expect(standIn.stack).toContain("Static message");
    expect(standIn.stack).not.toContain("alice");
  });
});

describe("errorFrames", () => {
  it("returns the frame lines of a stack and nothing of its message", () => {
    const error = new Error("quoted alice@example.com");
    error.stack = [
      "Error: quoted alice@example.com",
      "    at createItem (/app/src/item.ts:41:9)",
    ].join("\n");

    expect(errorFrames(error)).toEqual([
      "    at createItem (/app/src/item.ts:41:9)",
    ]);
  });

  it("is empty for a value that has no stack", () => {
    expect(errorFrames("boom")).toEqual([]);
    expect(errorFrames(null)).toEqual([]);
  });
});
