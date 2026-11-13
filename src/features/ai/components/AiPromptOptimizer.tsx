"use client";
import { useTranslations } from "next-intl";

import { useId, type ReactNode } from "react";

import { AiAnswerView } from "@/features/ai/_internal/components/AiAnswerView";
import { AiStreamControls } from "@/features/ai/_internal/components/AiStreamControls";
import { AiDataNote } from "@/features/ai/_internal/components/AiDataNote";
import { PromptAcceptBar } from "@/features/ai/_internal/components/PromptAcceptBar";
import { useAiTextStream } from "@/features/ai/_internal/components/hooks/use-ai-text-stream";
import { useAiStreamLabels } from "@/features/ai/_internal/components/hooks/use-ai-stream-labels";
import {
  usePromptAccept,
  type AcceptPrompt,
} from "@/features/ai/_internal/components/hooks/use-prompt-accept";
import {
  isCutForModel,
  PROMPT_OPTIMIZE_CONTENT_MAX,
} from "@/features/ai/domain/input";
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

const STREAM_URL = "/api/ai/optimize-prompt";
// Every blocker has a note, so none of them can fall through to Accept.
const BLOCKER_NOTES = {
  incomplete: "cutMessage",
  empty: "cutMessage",
  "prompt-cut": "promptCut",
  unchanged: "unchanged",
  image: "image",
} as const satisfies Record<AcceptBlocker, string>;

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
  const t = useTranslations("ai.optimize");
  const { stream, buttonLabels, viewLabels } = useAiStreamLabels(
    "ai.optimize",
    STREAM_URL,
  );
  const { status, view, text, announcement, run, setView, reset } =
    useAiTextStream(stream);
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
    <AiStreamControls
      view={view}
      onViewChange={setView}
      viewLabels={viewLabels}
      buttonLabels={buttonLabels}
      canUseAi={canUseAi}
      noteId={noteId}
      hasAnswer={hasAnswer}
      isPending={isPending}
      isBlocked={isSaving}
      buttonRef={buttonRef}
      onRun={() => void run({ title, prompt })}
    />
  );

  return (
    <>
      {children({
        headerActions,
        view: showsAnswer ? (
          <AiAnswerView
            text={text}
            pendingLabel={buttonLabels.pending}
            isCutShort={status === "cut-short"}
            cutShortMessage={t("cutMessage")}
            inputCutMessage={null}
          />
        ) : undefined,
        copyValue: showsAnswer && hasAnswer ? text.trim() : undefined,
        copyLabel: showsAnswer && hasAnswer ? t("copy") : undefined,
      })}
      {canUseAi && <AiDataNote id={noteId} className="mt-2" />}
      {showsAnswer && status === "done" && (
        <PromptAcceptBar
          note={blocker ? t(BLOCKER_NOTES[blocker]) : null}
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
