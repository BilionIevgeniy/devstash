import { useState } from "react";
import { useTranslations } from "next-intl";

import { useAiSuggestion } from "@/features/ai/_internal/components/hooks/use-ai-suggestion";
import { generateSummary } from "@/features/ai/actions/summary";

// The summary of one form. A new answer replaces the last one.
export function useDescriptionSummary() {
  const t = useTranslations("ai.summary");
  const [summary, setSummary] = useState<string | null>(null);
  const {
    announcement,
    answerId,
    isPending,
    buttonRef,
    ask,
    clearAnnouncement,
  } = useAiSuggestion(generateSummary, (text) => {
    setSummary(text);
    return t("ready");
  });

  function generate(title: string, content: string) {
    ask({ title, content });
  }

  function clear() {
    setSummary(null);
    clearAnnouncement();
  }

  return {
    summary,
    announcement,
    answerId,
    isPending,
    buttonRef,
    generate,
    clear,
  };
}
