import { useRef, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { toast } from "sonner";

import { useErrorText } from "@/components/common/hooks/use-error-text";
import type { PlainErrorCode } from "@/i18n/error-codes";
import type { OperationResult } from "@/lib/action-result";

export interface RunOptions {
  /** Runs in the transition: the dialog closes in the commit of the fresh page. */
  onSuccess: () => void;
  /** Shown when the action throws; a refused result shows its own code. */
  failCode: PlainErrorCode;
}

/** The `run` of useSubmitDialog, for a helper that submits on its behalf. */
export type SubmitRun = (
  action: () => Promise<OperationResult<unknown>>,
  options: RunOptions,
) => void;

// The request of a dialog that waits for the server (the create, edit and
// delete dialogs). While it runs, `isPending` lets the dialog block Esc, the
// overlay and the X, so the input is not lost and nothing is sent twice. The
// success toast waits for the close: Sonner is outside the transition, so the
// dialog shows it from onCloseAutoFocus, once `takeDone()` says so. Each dialog
// keeps its own focus rule there.
export function useSubmitDialog() {
  const [isPending, startTransition] = useTransition();
  const doneRef = useRef(false);
  const errorText = useErrorText();

  const run: SubmitRun = (action, { onSuccess, failCode }) => {
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) {
          toast.error(errorText(result));
          return;
        }
        doneRef.current = true;
        // After the await this is no longer part of the transition, so it is
        // wrapped again: "…ing" stays until the commit that brings the page.
        startTransition(onSuccess);
      } catch (error) {
        // A signed-out caller's redirect arrives here too, and must go on. A
        // rejection left in the transition would reach an error page instead.
        unstable_rethrow(error);
        toast.error(errorText(failCode));
      }
    });
  };

  /** True once after a success, for the close handler's toast. */
  function takeDone(): boolean {
    const done = doneRef.current;
    doneRef.current = false;
    return done;
  }

  return { isPending, run, takeDone };
}
