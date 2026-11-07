import { unstable_rethrow } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

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
  const [isPending, startTransition] = useTransition();

  function suggest(title: string, content: string) {
    startTransition(async () => {
      try {
        const result = await generateAutoTags({ title, content });
        if (!result.success || !result.data) {
          toast.error(result.error ?? AI_UNAVAILABLE_MESSAGE);
          return;
        }
        const fresh = result.data.filter((tag) => !hasTag(tag));
        if (fresh.length === 0) toast.info(NO_NEW_TAGS_MESSAGE);
        setSuggestions(fresh);
        setAnnouncement(
          fresh.length === 1
            ? "1 tag suggested"
            : `${fresh.length} tags suggested`,
        );
      } catch (error) {
        // A signed-out caller's redirect arrives here too, and must go on.
        unstable_rethrow(error);
        toast.error(AI_UNAVAILABLE_MESSAGE);
      }
    });
  }

  function remove(tag: string) {
    setSuggestions((current) => current.filter((item) => item !== tag));
  }

  return { suggestions, announcement, isPending, suggest, remove };
}
