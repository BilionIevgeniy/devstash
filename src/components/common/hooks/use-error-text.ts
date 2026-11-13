import { createErrorText, type ErrorText } from "@/i18n/error-text";

// In the browser an unknown code or a broken message has nowhere to be
// reported: the generic text is shown and that is all.
const errorText = createErrorText();

// The words of a failure for a component or a hook: `errorText(result)` or
// `errorText("generic")`. A plain helper (`callAction`, `rejectInvalidContent`)
// takes the function from its caller instead of calling this. English only for
// now; the locale replaces the inside of this hook, not its callers.
export function useErrorText(): ErrorText {
  return errorText;
}
