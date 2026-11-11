"use client";

import { useId, type ReactNode } from "react";

import { AiDataNote } from "@/features/ai/_internal/components/AiDataNote";
import { GenerateWithAiButton } from "@/features/ai/_internal/components/GenerateWithAiButton";
import { SummaryPreview } from "@/features/ai/_internal/components/SummaryPreview";
import { useDescriptionSummary } from "@/features/ai/_internal/components/hooks/use-description-summary";

interface AiDescriptionSummaryProps {
  title: string;
  content: string;
  /** The field's text now: Accept replaces it, and the preview says so. */
  currentValue: string;
  /** Puts the summary in the field. Nothing is saved. */
  onAccept: (summary: string) => void;
  /** The description field, with the Generate button for its label row. */
  children: (action: ReactNode) => ReactNode;
}

// A summary of the form's title and content for its description. It knows
// nothing about the field: the form places the button in the field's label
// row and decides how the summary goes in. The preview shows under the field;
// the live region stays mounted, so a screen reader hears each answer.
export function AiDescriptionSummary({
  title,
  content,
  currentValue,
  onAccept,
  children,
}: AiDescriptionSummaryProps) {
  const {
    summary,
    announcement,
    answerId,
    isPending,
    buttonRef,
    generate,
    clear,
  } = useDescriptionSummary();
  const noteId = useId();
  const isBlank = title.trim() === "" && content.trim() === "";

  function handleAccept() {
    if (summary === null) return;
    onAccept(summary);
    clear();
  }

  return (
    <div className="space-y-2">
      {children(
        <GenerateWithAiButton
          ref={buttonRef}
          target="for description"
          describedBy={noteId}
          isPending={isPending}
          disabled={isBlank}
          onClick={() => generate(title, content)}
        />,
      )}
      <AiDataNote id={noteId} />
      {summary !== null && (
        <SummaryPreview
          summary={summary}
          replaces={currentValue.trim() !== ""}
          isPending={isPending}
          answerId={answerId}
          onAccept={handleAccept}
          onDismiss={clear}
          fallbackFocusRef={buttonRef}
        />
      )}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
