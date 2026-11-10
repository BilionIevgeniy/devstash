"use client";

import { useId, type ReactNode } from "react";

import { AiAnswerView } from "@/features/ai/_internal/components/AiAnswerView";
import { AiDataNote } from "@/features/ai/_internal/components/AiDataNote";
import { AiStreamButton } from "@/features/ai/_internal/components/AiStreamButton";
import { AiViewToggle } from "@/features/ai/_internal/components/AiViewToggle";
import { PromptAcceptBar } from "@/features/ai/_internal/components/PromptAcceptBar";
import { useAiTextStream } from "@/features/ai/_internal/components/hooks/use-ai-text-stream";
import {
  usePromptAccept,
  type AcceptPrompt,
} from "@/features/ai/_internal/components/hooks/use-prompt-accept";
import {
  isCutForModel,
  PROMPT_OPTIMIZE_CONTENT_MAX,
} from "@/features/ai/domain/input";
import {
  AI_OPTIMIZE_CUT_SHORT_MESSAGE,
  AI_OPTIMIZE_IMAGE_MESSAGE,
  AI_OPTIMIZE_PROMPT_CUT_MESSAGE,
  AI_OPTIMIZE_UNCHANGED_MESSAGE,
} from "@/features/ai/domain/messages";
import {
  acceptBlocker,
  type AcceptBlocker,
} from "@/features/ai/domain/prompt-optimizer";

export interface PromptOptimizerSlots {
  /** The view toggle and the Optimize button, for the editor's header. */
  headerActions: ReactNode;
  /** The optimized prompt, shown in place of the original; undefined on it. */
  view: ReactNode | undefined;
  /** What Copy takes while the optimized prompt shows. */
  copyValue: string | undefined;
  copyLabel: string | undefined;
}

interface AiPromptOptimizerProps {
  title: string;
  prompt: string;
  /** Pro: a Free user sees the upgrade link instead. */
  canUseAi: boolean;
  /**
   * Saves the prompt. Resolves to what shows the saved item, run in the same
   * commit as this view's reset, or null after a failure it has reported.
   */
  onAccept: AcceptPrompt;
  /** The Markdown editor, given the header controls and the view. */
  children: (slots: PromptOptimizerSlots) => ReactNode;
}

const STREAM = {
  url: "/api/ai/optimize-prompt",
  doneAnnouncement: "Optimized prompt ready",
  cutShortAnnouncement: "Optimized prompt cut short",
};
const BUTTON_LABELS = {
  idle: "Optimize",
  pending: "Optimizing…",
  again: "Regenerate",
};
const VIEW_LABELS = { source: "Original", answer: "Optimized" };
// Every blocker has a note, so none of them can fall through to Accept.
const BLOCKER_NOTES: Record<AcceptBlocker, string> = {
  incomplete: AI_OPTIMIZE_CUT_SHORT_MESSAGE,
  empty: AI_OPTIMIZE_CUT_SHORT_MESSAGE,
  "prompt-cut": AI_OPTIMIZE_PROMPT_CUT_MESSAGE,
  unchanged: AI_OPTIMIZE_UNCHANGED_MESSAGE,
  image: AI_OPTIMIZE_IMAGE_MESSAGE,
};

// Prompt optimization for a read-only prompt. Like AiCodeExplanation it hands
// its controls and view to the caller; the question whether to use the
// result sits below the editor. Nothing is written until the user accepts,
// and while that save runs every control here waits for it.
export function AiPromptOptimizer({
  title,
  prompt,
  canUseAi,
  onAccept,
  children,
}: AiPromptOptimizerProps) {
  const { status, view, text, announcement, run, setView, reset } =
    useAiTextStream(STREAM);
  const { isSaving, buttonRef, accept, backToOriginal } = usePromptAccept(
    onAccept,
    reset,
  );
  const noteId = useId();
  const isPending = status === "waiting" || status === "streaming";
  const hasAnswer = text !== "";
  const isPromptCut = isCutForModel(prompt, PROMPT_OPTIMIZE_CONTENT_MAX);
  const showsAnswer = view === "answer";
  const blocker = acceptBlocker({
    complete: status === "done",
    isPromptCut,
    text,
    original: prompt,
  });

  const headerActions = (
    <>
      {(hasAnswer || isPending) && (
        <AiViewToggle
          view={view}
          onChange={setView}
          labels={VIEW_LABELS}
          disabled={isSaving}
        />
      )}
      <AiStreamButton
        ref={buttonRef}
        labels={BUTTON_LABELS}
        canUseAi={canUseAi}
        describedBy={noteId}
        hasAnswer={hasAnswer}
        isPending={isPending}
        isBlocked={isSaving}
        onClick={() => void run({ title, prompt })}
      />
    </>
  );

  return (
    <>
      {children({
        headerActions,
        view: showsAnswer ? (
          <AiAnswerView
            text={text}
            pendingLabel={BUTTON_LABELS.pending}
            isCutShort={status === "cut-short"}
            cutShortMessage={AI_OPTIMIZE_CUT_SHORT_MESSAGE}
            inputCutMessage={null}
          />
        ) : undefined,
        copyValue: showsAnswer && hasAnswer ? text.trim() : undefined,
        copyLabel:
          showsAnswer && hasAnswer ? "Copy optimized prompt" : undefined,
      })}
      {canUseAi && <AiDataNote id={noteId} className="mt-2" />}
      {showsAnswer && status === "done" && (
        <PromptAcceptBar
          note={blocker ? BLOCKER_NOTES[blocker] : null}
          isSaving={isSaving}
          onAccept={() => accept(text.trim())}
          onDiscard={backToOriginal}
        />
      )}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}
