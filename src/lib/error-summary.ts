// What may be said about a caught error: its class, its codes and the status of
// the response, never its message. The message of a Prisma, Stripe, Resend or
// OpenAI error can quote the arguments of the failed call (an email address, a
// title), and "Logging" in context/coding-standards.md keeps those out of every
// log and out of Sentry. Fields are read by name, so this file imports no vendor.

export interface ErrorSummary {
  name: string;
  code?: string;
  type?: string;
  status?: number;
  requestId?: string;
  /** Why a model gave no usable output: a short word such as content_filter. */
  reason?: string;
}

type Fields = Record<string, unknown>;

const MIN_HTTP_STATUS = 100;
const MAX_HTTP_STATUS = 599;
// A longer line is a message, not a frame, and keeps the patterns below cheap.
const MAX_FRAME_LINE = 500;

// Class names, codes and digests are short words. A value with a space, an at
// sign or a quote is text somebody wrote, so it is dropped, not logged.
const TOKEN = /^[\w.:-]{1,64}$/;
const IDENTIFIER = /^[\w-]{1,100}$/;

// A frame names a place in code: V8 ("at fn (path/file.js:1:2)", or a built-in
// such as "at new Promise (<anonymous>)"), Gecko and JavaScriptCore
// ("fn@https://host/file.js:1:2"). A line of a message that merely starts with
// "at" does not carry a path and a position, so it is not one, and neither is a
// line like "alice@example.com/x:5": after the at sign a Gecko frame has a
// scheme or a leading slash.
const FRAME_LINES: RegExp[] = [
  /^\s+at .*[\\/].*:\d+:\d+\)?$/,
  /^\s+at .*(?:<anonymous>|native)\)?$/,
  /^[^\s@]*@(?:[a-z][\w+.-]*:\/\/|\/)\S*:\d+(?::\d+)?$/i,
];

function asFields(value: unknown): Fields | null {
  return typeof value === "object" && value !== null ? (value as Fields) : null;
}

function readToken(
  fields: Fields,
  keys: string[],
  pattern: RegExp,
): string | undefined {
  for (const key of keys) {
    const value = fields[key];
    if (typeof value === "number" && Number.isInteger(value)) {
      return String(value);
    }
    if (typeof value === "string" && pattern.test(value)) return value;
  }
  return undefined;
}

function readStatus(fields: Fields): number | undefined {
  for (const key of ["status", "statusCode"]) {
    const value = fields[key];
    if (
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= MIN_HTTP_STATUS &&
      value <= MAX_HTTP_STATUS
    ) {
      return value;
    }
  }
  return undefined;
}

export function errorSummary(error: unknown): ErrorSummary {
  const fields = asFields(error);
  if (!fields) return { name: "NonError" };

  const code = readToken(fields, ["code"], TOKEN);
  const type = readToken(fields, ["type"], TOKEN);
  const status = readStatus(fields);
  const requestId = readToken(
    fields,
    ["requestID", "requestId", "request_id"],
    IDENTIFIER,
  );
  const reason = readToken(fields, ["reason"], TOKEN);
  return {
    name:
      readToken(fields, ["name"], TOKEN) ??
      (error instanceof Error ? "Error" : "NonError"),
    ...(code !== undefined && { code }),
    ...(type !== undefined && { type }),
    ...(status !== undefined && { status }),
    ...(requestId !== undefined && { requestId }),
    ...(reason !== undefined && { reason }),
  };
}

// The digest Next.js gives a server error, which the browser sees on the error
// that reaches an error boundary. It is how the two sides of one error match.
export function errorDigest(error: unknown): string | undefined {
  const fields = asFields(error);
  return fields ? readToken(fields, ["digest"], IDENTIFIER) : undefined;
}

// The frame lines of the stack of a caught error: where it was thrown, and
// nothing of what it said.
export function errorFrames(error: unknown): string[] {
  const stack = asFields(error)?.stack;
  if (typeof stack !== "string") return [];
  return stack
    .split("\n")
    .filter(
      (line) =>
        line.length <= MAX_FRAME_LINE &&
        FRAME_LINES.some((pattern) => pattern.test(line)),
    );
}

// A stand-in for a caught error that is safe to send to a third party: the
// class name of the original, a message that the calling code wrote, and the
// original's frames. The original stack is never sliced: its first lines carry
// the message, which can run over many lines, so only lines that are frames are
// kept.
export function safeError(error: unknown, message: string): Error {
  const frames = errorFrames(error);
  const standIn = new Error(message);
  standIn.name = errorSummary(error).name;
  if (frames.length > 0) {
    standIn.stack = [`${standIn.name}: ${message}`, ...frames].join("\n");
  }
  return standIn;
}
