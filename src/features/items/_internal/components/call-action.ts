import "client-only";

import { unstable_rethrow } from "next/navigation";
import { toast } from "sonner";

import type { PlainErrorCode } from "@/i18n/error-codes";
import type { ErrorText } from "@/i18n/error-text";
import type { ActionResult } from "@/lib/action-result";

// Calls a Server Action whose success always carries data, from a transition:
// the data, or null after a failure with its toast already shown (the server's
// code, or `failCode` when the call threw), in the words of the caller's
// `errorText` (useErrorText: a plain function cannot call the hook). A signed-out caller's redirect
// rejects too, and must go on; any other rejection left in the transition
// would replace the form, with the user's edits, by an error page.
export async function callAction<T>(
  action: () => Promise<ActionResult<T>>,
  failCode: PlainErrorCode,
  errorText: ErrorText,
): Promise<T | null> {
  try {
    const result = await action();
    if (result.success) return result.data;
    toast.error(errorText(result));
  } catch (error) {
    unstable_rethrow(error);
    toast.error(errorText(failCode));
  }
  return null;
}
