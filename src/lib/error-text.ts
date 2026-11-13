import "server-only";

import { getTranslations } from "next-intl/server";

import { errorTextFrom, type ErrorText } from "@/i18n/error-text";

// The words of a failure for a server component, in the locale of the request
// (lib/i18n-request.ts). An unknown code or a message that cannot be formatted
// shows the generic text; the request config logs it.
export async function getErrorText(): Promise<ErrorText> {
  return errorTextFrom(await getTranslations("errors"));
}
