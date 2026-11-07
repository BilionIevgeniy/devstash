"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

// Loaded on its own, as MarkdownEditor does: the Markdown parser is fetched
// only when an answer first renders, not with every drawer.
const MarkdownPreview = dynamic(
  () =>
    import("@/features/editor/components/MarkdownPreview").then(
      (mod) => mod.MarkdownPreview,
    ),
  { loading: () => <Skeleton className="h-16 w-full" /> },
);

interface AiAnswerViewProps {
  text: string;
  /** Read by a screen reader while the spinner shows: "Explaining…". */
  pendingLabel: string;
  /** The answer stopped before its end. */
  isCutShort: boolean;
  cutShortMessage: string;
  /** Set when the model read only the start of the item. */
  inputCutMessage: string | null;
}

// A spinner until the first words, then the text growing in place. No live
// region here: the growing text would be read out piece by piece, so the
// composite announces once when it ends. Images are dropped: the text comes
// from the model, and an image URL could carry data out without a click.
export function AiAnswerView({
  text,
  pendingLabel,
  isCutShort,
  cutShortMessage,
  inputCutMessage,
}: AiAnswerViewProps) {
  if (text === "") {
    return (
      <div className="flex h-24 items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        <span className="sr-only">{pendingLabel}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 text-sm">
      {inputCutMessage && (
        <p className="text-xs text-muted-foreground">{inputCutMessage}</p>
      )}
      <MarkdownPreview value={text} images="drop" />
      {isCutShort && (
        <p className="text-xs text-destructive">{cutShortMessage}</p>
      )}
    </div>
  );
}
