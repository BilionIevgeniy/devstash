import type { AbstractIntlMessages } from "next-intl";

interface FallbackInfo {
  key: string;
  namespace?: string;
}

function genericText(messages: AbstractIntlMessages): string | undefined {
  const errors = messages.errors;
  if (typeof errors !== "object") return undefined;
  return typeof errors.generic === "string" ? errors.generic : undefined;
}

// What a message that cannot be shown turns into, on the server and in the
// browser alike, built from the messages the caller already holds (so no
// errors file of its own reaches the browser bundle). An error code this
// build does not know (an open tab during a deploy) or one whose params are
// missing shows the generic error, never the raw key; a missing interface key
// (which tsc should have caught), or an error where no `errors` were sent,
// shows its path, so it is noticed instead of reading like a failure.
export function messageFallback(messages: AbstractIntlMessages) {
  const generic = genericText(messages);
  return ({ key, namespace }: FallbackInfo): string =>
    namespace === "errors" && generic !== undefined
      ? generic
      : [namespace, key].filter(Boolean).join(".");
}
