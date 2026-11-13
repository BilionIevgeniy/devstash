"use client";

import { unstable_rethrow } from "next/navigation";
import { toast } from "sonner";

import { AiPromptOptimizer } from "@/features/ai/components/AiPromptOptimizer";
import { MarkdownEditor } from "@/features/editor/components/MarkdownEditor";
import { replaceItemContent } from "@/features/items/actions/item";
import type { ItemDetailJson } from "@/features/items/types";

const SAVED_MESSAGE = "Prompt updated";
const SAVE_FAILED_MESSAGE = "Couldn't save the prompt";

// null after a failure, with the toast already shown. A signed-out caller's
// redirect rejects too, and must go on.
async function savePrompt(
  itemId: string,
  prompt: string,
): Promise<ItemDetailJson | null> {
  try {
    const result = await replaceItemContent(itemId, prompt);
    if (result.success) return result.data;
    toast.error(result.error);
  } catch (error) {
    unstable_rethrow(error);
    toast.error(SAVE_FAILED_MESSAGE);
  }
  return null;
}

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
  async function handleAccept(optimized: string) {
    const saved = await savePrompt(itemId, optimized);
    if (!saved) return null;
    toast.success(SAVED_MESSAGE);
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
