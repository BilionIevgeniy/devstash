"use client";

import { useEffect, useRef, type RefObject } from "react";
import { Check, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";

// Muted at rest; the action's colour shows on hover and keyboard focus, so
// the target is clear on the dark badge. The dark: variants override the
// ghost button's own dark hover.
const ACCEPT_CLASS =
  "text-muted-foreground hover:bg-emerald-500/15 hover:text-emerald-600 focus-visible:bg-emerald-500/15 focus-visible:text-emerald-600 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-400 dark:focus-visible:text-emerald-400";
const DISMISS_CLASS =
  "text-muted-foreground hover:bg-destructive/15 hover:text-destructive focus-visible:bg-destructive/15 focus-visible:text-destructive dark:hover:bg-destructive/15";

interface TagSuggestionsProps {
  tags: string[];
  onAccept: (tag: string) => void;
  onDismiss: (tag: string) => void;
  /** Takes the focus once the last suggestion is gone. */
  fallbackFocusRef: RefObject<HTMLButtonElement | null>;
}

// Accepting or dismissing removes the focused button with its badge, so the
// focus moves on to the badge that takes its place, or back to the Suggest
// button after the last one, instead of falling to the dialog.
export function TagSuggestions({
  tags,
  onAccept,
  onDismiss,
  fallbackFocusRef,
}: TagSuggestionsProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const focusIndexRef = useRef<number | null>(null);

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
          className="inline-flex h-7 items-center gap-1 rounded-md border border-dashed bg-muted/50 pr-0.5 pl-2 text-xs"
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
