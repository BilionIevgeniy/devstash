"use client";

import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PromptAcceptBarProps {
  /** Why Accept is not offered, in the user's words; null offers it. */
  note: string | null;
  isSaving: boolean;
  onAccept: () => void;
  onDiscard: () => void;
}

// The question under a finished optimized prompt: use it, or go back to the
// original. Below the editor frame, so a long answer cannot scroll it away.
export function PromptAcceptBar({
  note,
  isSaving,
  onAccept,
  onDiscard,
}: PromptAcceptBarProps) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <p className="mr-auto text-xs text-muted-foreground">
        {note ?? "Use this prompt?"}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isSaving}
        onClick={onDiscard}
      >
        Discard
      </Button>
      {note === null && (
        <Button type="button" size="sm" disabled={isSaving} onClick={onAccept}>
          {isSaving ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <Check aria-hidden />
          )}
          {isSaving ? "Saving…" : "Use this prompt"}
        </Button>
      )}
    </div>
  );
}
