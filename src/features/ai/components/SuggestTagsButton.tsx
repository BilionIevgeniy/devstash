"use client";

import { useRef } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TagSuggestions } from "@/features/ai/_internal/components/TagSuggestions";
import { useTagSuggestions } from "@/features/ai/_internal/components/hooks/use-tag-suggestions";

interface SuggestTagsButtonProps {
  title: string;
  content: string;
  /** Whether the form already holds the tag, in the form's own terms. */
  hasTag: (tag: string) => boolean;
  /** Adds the tag to the form; false when it could not be added. */
  onAccept: (tag: string) => boolean;
}

// Tag suggestions for a form. It knows nothing about the tags field: the form
// decides what is already there and how a tag is added. The button's row is
// always there, so the form does not move while a request runs.
export function SuggestTagsButton({
  title,
  content,
  hasTag,
  onAccept,
}: SuggestTagsButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { suggestions, announcement, isPending, suggest, remove } =
    useTagSuggestions(hasTag);
  const visible = suggestions.filter((tag) => !hasTag(tag));
  const isBlank = title.trim() === "" && content.trim() === "";

  function handleAccept(tag: string) {
    if (onAccept(tag)) remove(tag);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        ref={buttonRef}
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => suggest(title, content)}
        disabled={isPending || isBlank}
      >
        {isPending ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Sparkles className="text-violet-500 dark:text-violet-400" />
        )}
        {isPending ? "Suggesting…" : "Suggest tags with AI"}
      </Button>
      <TagSuggestions
        tags={visible}
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
