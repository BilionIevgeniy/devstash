import { unstable_rethrow } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { useMountedRef } from "@/features/ai/_internal/components/hooks/use-mounted-ref";
import { generateAutoTags } from "@/features/ai/actions/auto-tags";
import { AI_UNAVAILABLE_MESSAGE } from "@/features/ai/domain/messages";

const NO_NEW_TAGS_MESSAGE = "No new tags to suggest";

// The suggestions of one form. They only change the form when accepted, so
// nothing here is saved and nothing is optimistic.
export function useTagSuggestions(hasTag: (tag: string) => boolean) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  // Set once per answer, so a screen reader hears of the suggestions once and
  // not again on each accept or dismiss.
  const [announcement, setAnnouncement] = useState("");
  // Counts the answers, so the list moves the focus once per answer.
  const [answerId, setAnswerId] = useState(0);
  const [isPending, startTransition] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const mountedRef = useMountedRef();

  function showAnswer(fresh: string[]) {
    if (fresh.length === 0) toast.info(NO_NEW_TAGS_MESSAGE);
    setSuggestions(fresh);
    setAnnouncement(
      fresh.length === 1 ? "1 tag suggested" : `${fresh.length} tags suggested`,
    );
    setAnswerId((current) => current + 1);
  }

  function suggest(title: string, content: string) {
    startTransition(async () => {
      try {
        const result = await generateAutoTags({ title, content });
        if (!mountedRef.current) return;
        if (!result.success || !result.data) {
          toast.error(result.error ?? AI_UNAVAILABLE_MESSAGE);
          return;
        }
        showAnswer(result.data.filter((tag) => !hasTag(tag)));
      } catch (error) {
        // A signed-out caller's redirect arrives here too, and must go on.
        unstable_rethrow(error);
        if (mountedRef.current) toast.error(AI_UNAVAILABLE_MESSAGE);
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
