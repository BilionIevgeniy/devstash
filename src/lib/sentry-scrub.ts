import type { ErrorEvent, Exception, StackFrame } from "@sentry/nextjs";

// The last stop before an event leaves for Sentry (`beforeSend`). It does not
// delete what is known to be bad, it builds a new event from the fields that
// are known to be safe, so a field the SDK adds later stays out until it is
// listed here. Pure, so it is tested without the SDK: only types come from it.
//
// Dropped: request headers, cookies, bodies and query strings (the reset and
// verification links carry a one-time token in the query), breadcrumbs, extra
// data, the server's host name, package versions, the source lines and the
// variables of every stack frame, and every user field but the id.

// Set by `captureSafeError` in lib/sentry.ts on an event whose message the
// calling code wrote. Any other message may quote data (a Prisma error quotes
// the arguments of the call, JSON.parse quotes its input), so it is blanked.
export const SAFE_MESSAGE_TAG = "safeMessage";

const SAFE_CONTEXTS = ["browser", "os", "runtime"] as const;

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

type Contexts = NonNullable<ErrorEvent["contexts"]>;
type Tags = NonNullable<ErrorEvent["tags"]>;

function redact(text: string): string {
  return text.replace(EMAIL, "[email]");
}

function cleanText(text: string | undefined): string | undefined {
  return text === undefined ? undefined : redact(text);
}

function pickText(value: unknown): string | undefined {
  return typeof value === "string" ? redact(value) : undefined;
}

// A URL or a path up to its query string or fragment.
export function stripQuery(url: string): string;
export function stripQuery(url: string | undefined): string | undefined;
export function stripQuery(url: string | undefined): string | undefined {
  return url === undefined
    ? undefined
    : redact(url.replace(/[?#][\s\S]*$/, ""));
}

function scrubFrame(frame: StackFrame): StackFrame {
  return {
    filename: stripQuery(frame.filename),
    abs_path: stripQuery(frame.abs_path),
    function: cleanText(frame.function),
    module: cleanText(frame.module),
    platform: frame.platform,
    lineno: frame.lineno,
    colno: frame.colno,
    in_app: frame.in_app,
    debug_id: frame.debug_id,
  };
}

function scrubException(value: Exception, keepMessage: boolean): Exception {
  const { mechanism, stacktrace } = value;
  return {
    type: cleanText(value.type),
    value: keepMessage ? cleanText(value.value) : undefined,
    mechanism: mechanism && {
      type: mechanism.type,
      handled: mechanism.handled,
      source: mechanism.source,
      is_exception_group: mechanism.is_exception_group,
      exception_id: mechanism.exception_id,
      parent_id: mechanism.parent_id,
    },
    stacktrace: stacktrace && { frames: stacktrace.frames?.map(scrubFrame) },
  };
}

function scrubRequest(request: ErrorEvent["request"]): ErrorEvent["request"] {
  if (!request) return undefined;
  return { method: request.method, url: stripQuery(request.url) };
}

// `captureRequestError` of the SDK describes the failed request here, with its
// path including the query string.
function scrubNextContext(context: Record<string, unknown>) {
  return {
    request_path: stripQuery(pickText(context.request_path)),
    router_kind: pickText(context.router_kind),
    router_path: pickText(context.router_path),
    route_type: pickText(context.route_type),
  };
}

function scrubContexts(
  contexts: ErrorEvent["contexts"],
): ErrorEvent["contexts"] {
  if (!contexts) return undefined;
  const kept: Contexts = {};
  for (const key of SAFE_CONTEXTS) {
    if (contexts[key]) kept[key] = contexts[key];
  }
  if (contexts.nextjs) kept.nextjs = scrubNextContext(contexts.nextjs);
  return kept;
}

function scrubTags(tags: ErrorEvent["tags"]): ErrorEvent["tags"] {
  if (!tags) return undefined;
  const kept: Tags = {};
  for (const [key, value] of Object.entries(tags)) {
    if (key === SAFE_MESSAGE_TAG) continue;
    if (typeof value === "string") kept[key] = redact(value);
    else if (typeof value === "number" || typeof value === "boolean") {
      kept[key] = value;
    }
  }
  return kept;
}

function scrubUser(user: ErrorEvent["user"]): ErrorEvent["user"] {
  return user?.id === undefined ? undefined : { id: user.id };
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const keepMessage = event.tags?.[SAFE_MESSAGE_TAG] === "1";
  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    level: event.level,
    platform: event.platform,
    release: event.release,
    environment: event.environment,
    sdk: event.sdk,
    fingerprint: event.fingerprint,
    // Source maps are matched to a build by the debug ids in here.
    debug_meta: event.debug_meta,
    // Deleted by the SDK when it builds the envelope, after reading the
    // sampling context from it.
    sdkProcessingMetadata: event.sdkProcessingMetadata,
    transaction: stripQuery(event.transaction),
    message: keepMessage ? cleanText(event.message) : undefined,
    exception: event.exception && {
      values: event.exception.values?.map((value) =>
        scrubException(value, keepMessage),
      ),
    },
    request: scrubRequest(event.request),
    contexts: scrubContexts(event.contexts),
    tags: scrubTags(event.tags),
    user: scrubUser(event.user),
  };
}
