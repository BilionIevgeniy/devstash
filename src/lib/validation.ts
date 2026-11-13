import type { ZodError } from "zod";

import {
  ERROR_PARAM_NAMES,
  isErrorCode,
  type ErrorCode,
  type ErrorParams,
} from "@/i18n/error-codes";
import { failFrom, type Failure } from "@/lib/action-result";

type Issue = ZodError["issues"][number];

// The bounds of a too_big or too_small issue, for the `{max}` or `{min}` of
// its message, and only when the message has one (`titleRequired` is a
// too_small with no number in it). Zod gives them as number or bigint; the
// params hold numbers.
function issueParams(issue: Issue, code: ErrorCode): ErrorParams | undefined {
  const names: readonly string[] =
    code in ERROR_PARAM_NAMES
      ? ERROR_PARAM_NAMES[code as keyof typeof ERROR_PARAM_NAMES]
      : [];
  if (issue.code === "too_big" && names.includes("max")) {
    return { max: Number(issue.maximum) };
  }
  if (issue.code === "too_small" && names.includes("min")) {
    return { min: Number(issue.minimum) };
  }
  return undefined;
}

// The failure of input a schema refused: the first issue, whose message is an
// error code (the schemas give one for each check). A message that is not a
// code (a Zod default for a check with none) gets the fallback. Zod never
// fails without an issue; the fallback also keeps the type honest. Runs in the
// browser too (parseImportFile), so no server-only.
export function firstIssue(
  error: ZodError,
  fallback: ErrorCode = "invalidInput",
): Failure {
  const issue = error.issues[0];
  if (!issue || !isErrorCode(issue.message))
    return failFrom({ error: fallback });
  return failFrom({
    error: issue.message,
    params: issueParams(issue, issue.message),
  });
}
