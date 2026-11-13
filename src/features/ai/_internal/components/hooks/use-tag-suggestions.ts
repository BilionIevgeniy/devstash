import { unstable_rethrow } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useMountedRef } from "@/features/ai/_internal/components/hooks/use-mounted-ref";
import { generateAutoTags } from "@/features/ai/actions/auto-tags";
import { useErrorText } from "@/components/common/hooks/use-error-text";

// The suggestions of one form. They only change the form when accepted, so
// nothing here is saved and nothing is optimistic.
export function useTagSuggestions(hasTag: (tag: string) => boolean) {
  const t = useTranslations("ai.tags");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  // Set once per answer, so a screen reader hears of the suggestions once and
  // not again on each accept or dismiss.
  const [announcement, setAnnouncement] = useState("");
  // Counts the answers, so the list moves the focus once per answer.
  const [answerId, setAnswerId] = useState(0);
  const [isPending, startTransition] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const mountedRef = useMountedRef();
  const errorText = useErrorText();

  function showAnswer(fresh: string[]) {
    if (fresh.length === 0) toast.info(t("none"));
    setSuggestions(fresh);
    setAnnouncement(t("announce", { count: fresh.length }));
    setAnswerId((current) => current + 1);
  }

  function suggest(title: string, content: string) {
    startTransition(async () => {
      try {
        const result = await generateAutoTags({ title, content });
        if (!mountedRef.current) return;
        if (!result.success) {
          toast.error(errorText(result));
          return;
        }
        showAnswer(result.data.filter((tag) => !hasTag(tag)));
      } catch (error) {
        // A signed-out caller's redirect arrives here too, and must go on.
        unstable_rethrow(error);
        if (mountedRef.current) toast.error(errorText("aiUnavailable"));
      }
    });
  }

  function remove(tag: string) {
    setSuggestions((current) => current.filter((item) => item !== tag));
  }

  return {
    suggestions,
    announcement,
    answerId,
    isPending,
    buttonRef,
    suggest,
    remove,
  };
}
