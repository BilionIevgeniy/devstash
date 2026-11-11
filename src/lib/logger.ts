import { errorFrames, errorSummary } from "@/lib/error-summary";
import { captureSafeError, flushSentry } from "@/lib/sentry";

// The one place that writes a log line. One JSON object per line, so Vercel's
// log search can filter on a field, and the caught errors of the app reach
// Sentry through `error`.
//
// What a line may hold is fixed by the types, not by care at each call: a
// message that is a fixed sentence, the error as its class, its codes and the
// frames of its stack (`errorSummary` and `errorFrames`, never its message) and
// ids. A literal key must end in `Id` (`userId`, `itemId`), so an email or a
// title does not fit in by mistake. "Logging" in context/coding-standards.md
// says the same in words.

export type LogContext = {
  error?: unknown;
  /** Numbers only (a status, a count, a size): they cannot carry text. */
  numbers?: Record<string, number>;
} & { [key: `${string}Id`]: string | undefined };

type Level = "info" | "warn" | "error";

// A dependency that is down fails every request, and each failure would be an
// event. The same failure is sent once a minute per server instance; every
// occurrence is still in the log.
const REPORT_INTERVAL_MS = 60_000;
const MAX_TRACKED_FAILURES = 200;
const MAX_LOGGED_FRAMES = 10;
const lastReported = new Map<string, number>();

function describeError(error: unknown) {
  const frames = errorFrames(error).slice(0, MAX_LOGGED_FRAMES);
  return { ...errorSummary(error), ...(frames.length > 0 && { frames }) };
}

function write(level: Level, message: string, context: LogContext): void {
  try {
    const { error, numbers, ...ids } = context;
    const line = {
      level,
      message,
      ...ids,
      ...(numbers && { numbers }),
      ...(error !== undefined && { error: describeError(error) }),
    };
    console[level](JSON.stringify(line));
  } catch {
    // An error value that cannot be read must not turn a log call into a
    // throw: the message alone is still a line.
    console[level](JSON.stringify({ level, message }));
  }
}

function shouldReport(message: string, error: unknown): boolean {
  const { name, code, status } = errorSummary(error);
  const key = `${message}|${name}|${code ?? ""}|${status ?? ""}`;
  const now = Date.now();
  const last = lastReported.get(key);
  if (last !== undefined && now - last < REPORT_INTERVAL_MS) return false;
  if (lastReported.size >= MAX_TRACKED_FAILURES) lastReported.clear();
  lastReported.set(key, now);
  return true;
}

// The ids go to Sentry as tags, apart from the user, who is the one person an
// event may name.
function splitIds(context: LogContext) {
  const ids: Record<string, string> = {};
  let userId: string | undefined;
  for (const [key, value] of Object.entries(context)) {
    if (!key.endsWith("Id") || typeof value !== "string") continue;
    if (key === "userId") userId = value;
    else ids[key] = value;
  }
  return { userId, ids };
}

export const logger = {
  info(message: string, context: LogContext = {}): void {
    write("info", message, context);
  },

  warn(message: string, context: LogContext = {}): void {
    write("warn", message, context);
  },

  // Await it where the function answers right after logging (a route, an
  // action): the event is sent before the instance can freeze. It never
  // rejects: most callers await it inside a catch whose job is to answer, or to
  // stay quiet, and a failing monitor must not change that.
  async error(message: string, context: LogContext = {}): Promise<void> {
    write("error", message, context);
    try {
      if (!shouldReport(message, context.error)) return;
      captureSafeError(context.error, message, splitIds(context));
      await flushSentry();
    } catch {
      // The line above is the record.
    }
  },
};
