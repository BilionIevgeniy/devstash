"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { AI_EXPLAIN_CUT_SHORT_MESSAGE } from "@/features/ai/domain/messages";
import { EXPLAIN_CODE_MAX } from "@/features/ai/domain/input";

// Loaded on its own, as MarkdownEditor does: the Markdown parser is fetched
// only when an explanation first renders, not with every drawer.
const MarkdownPreview = dynamic(
  () =>
    import("@/features/editor/components/MarkdownPreview").then(
      (mod) => mod.MarkdownPreview,
    ),
  { loading: () => <Skeleton className="h-16 w-full" /> },
);

const CODE_CUT_MESSAGE = `Only the first ${EXPLAIN_CODE_MAX.toLocaleString("en-US")} characters were explained.`;

interface ExplanationViewProps {
  text: string;
  /** The answer stopped before its end. */
  isCutShort: boolean;
  /** The code was longer than what the model read. */
  isCodeCut: boolean;
}

// A spinner until the first words, then the text growing in place. No live
// region here: the growing text would be read out piece by piece, so the
// composite announces once when it ends. Images are dropped: the text comes
// from the model, and an image URL could carry data out without a click.
export function ExplanationView({
  text,
  isCutShort,
  isCodeCut,
}: ExplanationViewProps) {
  if (text === "") {
    return (
      <div className="flex h-24 items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        <span className="sr-only">Explaining…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 text-sm">
      {isCodeCut && (
        <p className="text-xs text-muted-foreground">{CODE_CUT_MESSAGE}</p>
      )}
      <MarkdownPreview value={text} images="drop" />
      {isCutShort && (
        <p className="text-xs text-destructive">
          {AI_EXPLAIN_CUT_SHORT_MESSAGE}
        </p>
      )}
    </div>
  );
}
