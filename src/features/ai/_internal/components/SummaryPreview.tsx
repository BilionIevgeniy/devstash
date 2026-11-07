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

interface SummaryPreviewProps {
  summary: string;
  /** The field has text, which Accept would replace. */
  replaces: boolean;
  /** A new summary is on its way: this one cannot be accepted any more. */
  isPending: boolean;
  /** Changes once per answer; the focus then moves to Accept. */
  answerId: number;
  onAccept: () => void;
  onDismiss: () => void;
  /** Takes the focus back after Accept or Dismiss. */
  fallbackFocusRef: RefObject<HTMLButtonElement | null>;
}

// The summary before it goes into the field. The Generate button is disabled
// while it waits, which drops its focus, so a new answer moves the focus to
// Accept; Accept and Dismiss remove the preview and give it back to Generate.
export function SummaryPreview({
  summary,
  replaces,
  isPending,
  answerId,
  onAccept,
  onDismiss,
  fallbackFocusRef,
}: SummaryPreviewProps) {
  const acceptRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    acceptRef.current?.focus();
  }, [answerId]);

  function handle(action: () => void) {
    action();
    fallbackFocusRef.current?.focus();
  }

  return (
    <section
      aria-label="Suggested description"
      className={cn("space-y-2 p-3 text-sm", SUGGESTION_FRAME_CLASS)}
    >
      <p className="flex gap-2">
        <Sparkles
          className="mt-0.5 size-3.5 shrink-0 text-violet-500 dark:text-violet-400"
          aria-hidden
        />
        <span>{summary}</span>
      </p>
      <div className="flex flex-wrap items-center justify-end gap-1">
        {replaces && (
          <p className="mr-auto text-xs text-muted-foreground">
            Accept replaces the current description
          </p>
        )}
        <Button
          ref={acceptRef}
          type="button"
          variant="ghost"
          size="xs"
          className={ACCEPT_CLASS}
          disabled={isPending}
          onClick={() => handle(onAccept)}
        >
          <Check aria-hidden />
          Accept
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className={DISMISS_CLASS}
          onClick={() => handle(onDismiss)}
        >
          <X aria-hidden />
          Dismiss
        </Button>
      </div>
    </section>
  );
}
