import { useTranslations } from "next-intl";

import { errorTextFrom, type ErrorText } from "@/i18n/error-text";

// The words of a failure for a component or a hook, in the locale of the
// nearest I18nProvider: `errorText(result)` or `errorText("generic")`. A plain
// helper (`callAction`, `rejectInvalidContent`) takes the function from its
// caller instead of calling this.
export function useErrorText(): ErrorText {
  return errorTextFrom(useTranslations("errors"));
}
