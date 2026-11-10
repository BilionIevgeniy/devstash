"use client";

import type { RefObject } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

interface GenerateWithAiButtonProps {
  /** What it generates, heard only by a screen reader: "for tags". */
  target: string;
  /** The id of the `AiDataNote` that says where the content goes. */
  describedBy: string;
  isPending: boolean;
  disabled: boolean;
  onClick: () => void;
  ref: RefObject<HTMLButtonElement | null>;
}

// The AI button in a field's label row. The visible text is the same for every
// field; the hidden suffix tells a screen reader which one, and keeps the
// visible text at the start of the name for voice control. The negative
// margin keeps the row at the label's height.
export function GenerateWithAiButton({
  target,
  describedBy,
  isPending,
  disabled,
  onClick,
  ref,
}: GenerateWithAiButtonProps) {
  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="xs"
      className="-my-0.5"
      aria-describedby={describedBy}
      onClick={onClick}
      disabled={isPending || disabled}
    >
      {isPending ? (
        <Loader2 className="animate-spin" aria-hidden />
      ) : (
        <Sparkles
          className="text-violet-500 dark:text-violet-400"
          aria-hidden
        />
      )}
      {isPending ? "Generating…" : "Generate with AI"}
      <span className="sr-only"> {target}</span>
    </Button>
  );
}
