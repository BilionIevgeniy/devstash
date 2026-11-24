import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useAiSuggestion } from "@/features/ai/_internal/components/hooks/use-ai-suggestion";
import { generateAutoTags } from "@/features/ai/actions/auto-tags";

// The tag suggestions of one form, without the tags it already has.
export function useTagSuggestions(hasTag: (tag: string) => boolean) {
  const t = useTranslations("ai.tags");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { announcement, answerId, isPending, buttonRef, ask } = useAiSuggestion(
    generateAutoTags,
    (tags) => {
      const fresh = tags.filter((tag) => !hasTag(tag));
      if (fresh.length === 0) toast.info(t("none"));
      setSuggestions(fresh);
      return t("announce", { count: fresh.length });
    },
  );

  function suggest(title: string, content: string) {
    ask({ title, content });
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
