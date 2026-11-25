import { unstable_rethrow } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { useErrorText } from "@/components/common/hooks/use-error-text";
import { useMountedRef } from "@/components/common/hooks/use-mounted-ref";
import type { ActionResult } from "@/lib/errors/action-result";

/** The item as the form holds it, saved or not. */
export interface AiSuggestionInput {
  title: string;
  content: string;
}

// One AI answer for a form (its tags, its description). It only changes the
// form when accepted, so nothing here is saved and nothing is optimistic. An
// action cannot be aborted: an answer that comes after the form closed is
// dropped without a toast. `onAnswer` shows the answer and returns the words
// for the live region.
export function useAiSuggestion<T>(
  action: (input: AiSuggestionInput) => Promise<ActionResult<T>>,
  onAnswer: (data: T) => string,
) {
  // Set once per answer, so a screen reader hears of it once.
  const [announcement, setAnnouncement] = useState("");
  // Counts the answers, so what shows one takes the focus once per answer.
  const [answerId, setAnswerId] = useState(0);
  const [isPending, startTransition] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const mountedRef = useMountedRef();
  const errorText = useErrorText();

  function ask(input: AiSuggestionInput) {
    startTransition(async () => {
      try {
        const result = await action(input);
        if (!mountedRef.current) return;
        if (!result.success) {
          toast.error(errorText(result));
          return;
        }
        setAnnouncement(onAnswer(result.data));
        setAnswerId((current) => current + 1);
      } catch (error) {
        // A signed-out caller's redirect arrives here too, and must go on.
        unstable_rethrow(error);
        if (mountedRef.current) toast.error(errorText("aiUnavailable"));
      }
    });
  }

  /** Words that never change are only heard again once they were gone. */
  function clearAnnouncement() {
    setAnnouncement("");
  }

  return {
    announcement,
    answerId,
    isPending,
    buttonRef,
    ask,
    clearAnnouncement,
  };
}
