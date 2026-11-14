import { useTranslations } from "next-intl";

import type { AiStreamOptions } from "@/features/ai/_internal/components/hooks/use-ai-text-stream";

// The words of a streamed AI answer in the locale: what the live region says
// when it ends, the button in its three states and the two views. Explain
// Code and prompt optimization have the same keys in their namespaces.
export function useAiStreamLabels(
  namespace: "ai.explain" | "ai.optimize",
  url: string,
) {
  const t = useTranslations(namespace);
  const stream: AiStreamOptions = {
    url,
    doneAnnouncement: t("done"),
    cutShortAnnouncement: t("cutShort"),
  };
  const buttonLabels = {
    idle: t("idle"),
    pending: t("pending"),
    again: t("again"),
  };
  const viewLabels = { source: t("source"), answer: t("answer") };
  return { stream, buttonLabels, viewLabels };
}
