import "server-only";

import { createErrorText, type ErrorText } from "@/i18n/error-text";
import { logger } from "@/lib/logger";

// A code this build does not know or a message that cannot be formatted is a
// bug of ours: the page shows the generic text and the log says so.
const errorText = createErrorText((error) => {
  logger.warn("Formatting an error message failed", { error });
});

// The words of a failure for a server component. Async because the locale
// will be read from the request here (feature 11, step 1); its callers stay.
export async function getErrorText(): Promise<ErrorText> {
  return errorText;
}
