import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/lib/logger";
import { captureSafeError, flushSentry } from "@/lib/sentry";

vi.mock("@/lib/sentry", () => ({
  captureSafeError: vi.fn(),
  flushSentry: vi.fn(async () => {}),
}));

// The message of a Prisma error quotes the arguments of the failed call.
function prismaError(): Error {
  return Object.assign(
    new Error('Invalid invocation { data: { email: "alice@example.com" } }'),
    { name: "PrismaClientKnownRequestError", code: "P2002" },
  );
}

function lineOf(spy: { mock: { calls: unknown[][] } }, call = 0) {
  return String(spy.mock.calls[call][0]);
}

let info: ReturnType<typeof vi.spyOn>;
let warn: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  info = vi.spyOn(console, "info").mockImplementation(() => {});
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  error = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("logger.info and logger.warn", () => {
  it("write one JSON line with the level, the message and the ids", () => {
    logger.info("Usage read", { userId: "u1" });
    logger.warn("No client IP", { itemId: "i1", skippedId: undefined });

    expect(JSON.parse(lineOf(info))).toEqual({
      level: "info",
      message: "Usage read",
      userId: "u1",
    });
    expect(JSON.parse(lineOf(warn))).toEqual({
      level: "warn",
      message: "No client IP",
      itemId: "i1",
    });
  });

  it("never reach Sentry", () => {
    logger.info("Usage read");
    logger.warn("No client IP", { error: prismaError() });

    expect(captureSafeError).not.toHaveBeenCalled();
    expect(flushSentry).not.toHaveBeenCalled();
  });
});

describe("logger.error", () => {
  it("logs the class and the code of the error, never its message", async () => {
    await logger.error("Creating the item failed", {
      error: prismaError(),
      userId: "u1",
      itemId: "i1",
    });

    expect(JSON.parse(lineOf(error))).toEqual({
      level: "error",
      message: "Creating the item failed",
      userId: "u1",
      itemId: "i1",
      error: {
        name: "PrismaClientKnownRequestError",
        code: "P2002",
        frames: expect.any(Array),
      },
    });
    expect(lineOf(error)).not.toContain("alice");
  });

  it("reports to Sentry with the user apart from the other ids", async () => {
    const failure = prismaError();

    await logger.error("Updating the item failed", {
      error: failure,
      userId: "u1",
      itemId: "i1",
      collectionId: undefined,
    });

    expect(captureSafeError).toHaveBeenCalledOnce();
    expect(captureSafeError).toHaveBeenCalledWith(
      failure,
      "Updating the item failed",
      { userId: "u1", ids: { itemId: "i1" } },
    );
    expect(flushSentry).toHaveBeenCalledOnce();
  });

  it("writes numbers into the line and sends them nowhere", async () => {
    await logger.error("Revoking the GitHub authorization was refused", {
      numbers: { status: 502 },
    });

    expect(JSON.parse(lineOf(error))).toEqual({
      level: "error",
      message: "Revoking the GitHub authorization was refused",
      numbers: { status: 502 },
    });
    expect(captureSafeError).toHaveBeenCalledWith(
      undefined,
      "Revoking the GitHub authorization was refused",
      { userId: undefined, ids: {} },
    );
  });

  it("reports a failure that has no error object", async () => {
    await logger.error("The search index is empty");

    expect(captureSafeError).toHaveBeenCalledWith(
      undefined,
      "The search index is empty",
      { userId: undefined, ids: {} },
    );
  });

  it("does not resolve before the event is flushed", async () => {
    const flushed = Promise.withResolvers<void>();
    vi.mocked(flushSentry).mockReturnValueOnce(flushed.promise);
    let resolved = false;

    const pending = logger
      .error("Answering after the flush")
      .then(() => (resolved = true));
    await new Promise((resolve) => setImmediate(resolve));
    expect(resolved).toBe(false);

    flushed.resolve();
    await pending;
    expect(resolved).toBe(true);
  });
});

describe("logger.error: one report a minute for the same failure", () => {
  const FAILURE = "Reading a rate limit failed";

  it("logs every occurrence and reports the first one", async () => {
    vi.useFakeTimers();
    const failure = new Error("redis is down");

    await logger.error(FAILURE, { error: failure });
    vi.advanceTimersByTime(59_000);
    await logger.error(FAILURE, { error: failure });

    expect(error).toHaveBeenCalledTimes(2);
    expect(captureSafeError).toHaveBeenCalledTimes(1);
  });

  it("reports it again after a minute", async () => {
    vi.useFakeTimers();
    const failure = new Error("redis is down");

    await logger.error("Resetting a rate limit failed", { error: failure });
    vi.advanceTimersByTime(61_000);
    await logger.error("Resetting a rate limit failed", { error: failure });

    expect(captureSafeError).toHaveBeenCalledTimes(2);
  });

  it("counts another message or another class of error apart", async () => {
    vi.useFakeTimers();

    await logger.error("Sending the email failed", { error: new Error("a") });
    await logger.error("Saving the file failed", { error: new Error("a") });
    await logger.error("Sending the email failed", {
      error: new TypeError("a"),
    });

    expect(captureSafeError).toHaveBeenCalledTimes(3);
  });
});

describe("logger.error: what the line holds", () => {
  it("holds the frames of the error and never its message", async () => {
    const failure = new Error("quoted alice@example.com");
    failure.stack = [
      "Error: quoted alice@example.com",
      "    at createItem (/app/src/item.ts:41:9)",
    ].join("\n");

    await logger.error("The frames are logged", { error: failure });

    expect(JSON.parse(lineOf(error)).error.frames).toEqual([
      "    at createItem (/app/src/item.ts:41:9)",
    ]);
    expect(lineOf(error)).not.toContain("alice");
  });

  it("keeps ten frames at most", async () => {
    const failure = new Error("deep");
    failure.stack = [
      "Error: deep",
      ...Array.from(
        { length: 25 },
        (_, index) => `    at frame${index} (/app/src/f.ts:${index + 1}:1)`,
      ),
    ].join("\n");

    await logger.error("The stack is deep", { error: failure });

    expect(JSON.parse(lineOf(error)).error.frames).toHaveLength(10);
  });
});

describe("logger.error: it never rejects", () => {
  it("resolves when the SDK throws, and the line is written", async () => {
    vi.mocked(captureSafeError).mockImplementationOnce(() => {
      throw new Error("sdk broke");
    });

    await expect(
      logger.error("The SDK throws", { error: new Error("x") }),
    ).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledOnce();
  });

  it("resolves when the flush rejects", async () => {
    vi.mocked(flushSentry).mockRejectedValueOnce(new Error("flush broke"));

    await expect(
      logger.error("The flush rejects", { error: new Error("y") }),
    ).resolves.toBeUndefined();
  });

  it("still writes the message for an error value that cannot be read", async () => {
    const hostile = new Error("z");
    Object.defineProperty(hostile, "name", {
      get() {
        throw new Error("hostile getter");
      },
    });

    await expect(
      logger.error("The value is hostile", { error: hostile }),
    ).resolves.toBeUndefined();
    expect(JSON.parse(lineOf(error))).toEqual({
      level: "error",
      message: "The value is hostile",
    });
  });
});

describe("logger.error: the throttle tells failures apart by code", () => {
  it("reports two codes of one error class on their own", async () => {
    const duplicate = Object.assign(new Error("a"), {
      name: "PrismaClientKnownRequestError",
      code: "P2002",
    });
    const missing = Object.assign(new Error("a"), {
      name: "PrismaClientKnownRequestError",
      code: "P2025",
    });

    await logger.error("Updating the item failed in this test", {
      error: duplicate,
    });
    await logger.error("Updating the item failed in this test", {
      error: missing,
    });

    expect(captureSafeError).toHaveBeenCalledTimes(2);
  });
});
