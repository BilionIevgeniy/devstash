"use client";
import { useTranslations } from "next-intl";

import { toast } from "sonner";

import { useErrorText } from "@/components/common/hooks/use-error-text";
import { AiPromptOptimizer } from "@/features/ai/components/AiPromptOptimizer";
import { MarkdownEditor } from "@/features/editor/components/MarkdownEditor";
import { callAction } from "@/features/items/_internal/components/call-action";
import { replaceItemContent } from "@/features/items/actions/item";
import { useSyncItemQueries } from "@/features/items/components/hooks/use-item-queries";
import type { ItemDetailJson } from "@/features/items/types";

interface PromptContentProps {
  itemId: string;
  title: string;
  prompt: string;
  /** Pro: a working Optimize button, Free an upgrade link. */
  canUseAi: boolean;
  /** Shows the saved detail, as after the edit form's save. */
  onSaved: (detail: ItemDetailJson) => void;
}

// The read view of a prompt with Optimize. An accepted rewrite is saved as
// the content, and the drawer shows the saved detail in the optimizer's own
// transition.
export function PromptContent({
  itemId,
  title,
  prompt,
  canUseAi,
  onSaved,
}: PromptContentProps) {
  const t = useTranslations("items.toasts");
  const errorText = useErrorText();
  const syncItems = useSyncItemQueries();
  async function handleAccept(optimized: string) {
    const saved = await callAction(
      () => replaceItemContent(itemId, optimized),
      "promptSaveFailed",
      errorText,
    );
    if (!saved) return null;
    await syncItems({ kind: "saved", detail: saved });
    toast.success(t("promptUpdated"));
    return () => onSaved(saved);
  }

  return (
    <AiPromptOptimizer
      title={title}
      prompt={prompt}
      canUseAi={canUseAi}
      onAccept={handleAccept}
    >
      {({ headerActions, view, copyValue, copyLabel }) => (
        <MarkdownEditor
          value={prompt}
          readOnly
          headerActions={headerActions}
          view={view}
          copyValue={copyValue}
          copyLabel={copyLabel}
        />
      )}
    </AiPromptOptimizer>
  );
}
