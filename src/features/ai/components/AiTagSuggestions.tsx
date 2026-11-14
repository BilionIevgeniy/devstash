"use client";
import { useTranslations } from "next-intl";

import { useId, type ReactNode } from "react";

import { AiDataNote } from "@/features/ai/_internal/components/AiDataNote";
import { GenerateWithAiButton } from "@/features/ai/_internal/components/GenerateWithAiButton";
import { TagSuggestions } from "@/features/ai/_internal/components/TagSuggestions";
import { useTagSuggestions } from "@/features/ai/_internal/components/hooks/use-tag-suggestions";

interface AiTagSuggestionsProps {
  title: string;
  content: string;
  /** Whether the form already holds the tag, in the form's own terms. */
  hasTag: (tag: string) => boolean;
  /** Adds the tag to the form; false when it could not be added. */
  onAccept: (tag: string) => boolean;
  /** The tags field, with the Generate button for its label row. */
  children: (action: ReactNode) => ReactNode;
}

// Tag suggestions for a form. It knows nothing about the tags field: the form
// decides what is already there and how a tag is added, and places the button
// in the field's label row. The badges show under the field; the live region
// stays mounted, so a screen reader hears each answer.
export function AiTagSuggestions({
  title,
  content,
  hasTag,
  onAccept,
  children,
}: AiTagSuggestionsProps) {
  const t = useTranslations("ai.generate");
  const {
    suggestions,
    announcement,
    answerId,
    isPending,
    buttonRef,
    suggest,
    remove,
  } = useTagSuggestions(hasTag);
  const noteId = useId();
  const visible = suggestions.filter((tag) => !hasTag(tag));
  const isBlank = title.trim() === "" && content.trim() === "";

  function handleAccept(tag: string) {
    if (onAccept(tag)) remove(tag);
  }

  return (
    <div className="space-y-2">
      {children(
        <GenerateWithAiButton
          ref={buttonRef}
          target={t("forTags")}
          describedBy={noteId}
          isPending={isPending}
          disabled={isBlank}
          onClick={() => suggest(title, content)}
        />,
      )}
      <AiDataNote id={noteId} />
      <TagSuggestions
        tags={visible}
        answerId={answerId}
        onAccept={handleAccept}
        onDismiss={remove}
        fallbackFocusRef={buttonRef}
      />
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
