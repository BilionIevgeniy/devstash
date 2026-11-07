"use client";

import { useEffect, useRef, type RefObject } from "react";
import { Check, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ACCEPT_CLASS,
  DISMISS_CLASS,
  SUGGESTION_FRAME_CLASS,
} from "@/features/ai/_internal/components/suggestion-classes";
import { cn } from "@/lib/utils";

interface TagSuggestionsProps {
  tags: string[];
  /** Changes once per answer; the focus then moves to the first badge. */
  answerId: number;
  onAccept: (tag: string) => void;
  onDismiss: (tag: string) => void;
  /** Takes the focus when there is no badge to take it. */
  fallbackFocusRef: RefObject<HTMLButtonElement | null>;
}

// The Generate button is disabled while it waits, which drops its focus, so a
// new answer moves the focus to the first badge, or back to the button when
// there is none. Accepting or dismissing removes the focused button with its
// badge, so the focus moves on to the badge that takes its place, or back to
// the button after the last one, instead of falling to the dialog.
export function TagSuggestions({
  tags,
  answerId,
  onAccept,
  onDismiss,
  fallbackFocusRef,
}: TagSuggestionsProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const focusIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (answerId === 0) return;
    const first =
      listRef.current?.querySelector<HTMLButtonElement>("[data-accept]");
    (first ?? fallbackFocusRef.current)?.focus();
  }, [answerId, fallbackFocusRef]);

  useEffect(() => {
    const index = focusIndexRef.current;
    if (index === null) return;
    focusIndexRef.current = null;

    const buttons =
      listRef.current?.querySelectorAll<HTMLButtonElement>("[data-accept]");
    const next = buttons?.[Math.min(index, buttons.length - 1)];
    (next ?? fallbackFocusRef.current)?.focus();
  }, [tags, fallbackFocusRef]);

  function handle(index: number, tag: string, action: (tag: string) => void) {
    focusIndexRef.current = index;
    action(tag);
  }

  if (tags.length === 0) return null;

  return (
    <ul
      ref={listRef}
      className="flex flex-wrap gap-2"
      aria-label="Suggested tags"
    >
      {tags.map((tag, index) => (
        <li
          key={tag}
          className={cn(
            "inline-flex h-7 items-center gap-1 pr-0.5 pl-2 text-xs",
            SUGGESTION_FRAME_CLASS,
          )}
        >
          <Sparkles
            className="size-3 text-violet-500 dark:text-violet-400"
            aria-hidden
          />
          <span>{tag}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            data-accept
            className={ACCEPT_CLASS}
            aria-label={`Add tag ${tag}`}
            onClick={() => handle(index, tag, onAccept)}
          >
            <Check />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className={DISMISS_CLASS}
            aria-label={`Dismiss tag ${tag}`}
            onClick={() => handle(index, tag, onDismiss)}
          >
            <X />
          </Button>
        </li>
      ))}
    </ul>
  );
}
