"use client";

import { useId, type ReactNode } from "react";

import { AiAnswerView } from "@/features/ai/_internal/components/AiAnswerView";
import { AiDataNote } from "@/features/ai/_internal/components/AiDataNote";
import { AiStreamButton } from "@/features/ai/_internal/components/AiStreamButton";
import { AiViewToggle } from "@/features/ai/_internal/components/AiViewToggle";
import { useAiTextStream } from "@/features/ai/_internal/components/hooks/use-ai-text-stream";
import { EXPLAIN_CODE_MAX, isCutForModel } from "@/features/ai/domain/input";
import { AI_EXPLAIN_CUT_SHORT_MESSAGE } from "@/features/ai/domain/messages";

export interface CodeExplanationSlots {
  /** The view toggle and the Explain button, for the editor's header. */
  headerActions: ReactNode;
  /** The explanation, shown in place of the code; undefined on the code. */
  view: ReactNode | undefined;
}

interface AiCodeExplanationProps {
  title: string;
  code: string;
  language: string | null;
  /** Pro: a Free user sees the upgrade link instead. */
  canUseAi: boolean;
  /** The code editor, given the header controls and the view. */
  children: (slots: CodeExplanationSlots) => ReactNode;
}

const STREAM = {
  url: "/api/ai/explain",
  doneAnnouncement: "Explanation ready",
  cutShortAnnouncement: "Explanation cut short",
};
const BUTTON_LABELS = {
  idle: "Explain",
  pending: "Explaining…",
  again: "Regenerate",
};
const VIEW_LABELS = { source: "Code", answer: "Explain" };
const CODE_CUT_MESSAGE = `Only the first ${EXPLAIN_CODE_MAX.toLocaleString("en-US")} characters were explained.`;

// Explain Code for a read-only editor. It knows nothing about the editor: it
// hands over its controls and its view, and the caller places them. The
// explanation is not saved; it lives here until the item closes. The live
// region stays mounted, so the end of an answer is heard on either view.
export function AiCodeExplanation({
  title,
  code,
  language,
  canUseAi,
  children,
}: AiCodeExplanationProps) {
  const { status, view, text, announcement, run, setView } =
    useAiTextStream(STREAM);
  const noteId = useId();
  const isPending = status === "waiting" || status === "streaming";
  const hasAnswer = text !== "";

  const headerActions = (
    <>
      {(hasAnswer || isPending) && (
        <AiViewToggle view={view} onChange={setView} labels={VIEW_LABELS} />
      )}
      <AiStreamButton
        labels={BUTTON_LABELS}
        canUseAi={canUseAi}
        describedBy={noteId}
        hasAnswer={hasAnswer}
        isPending={isPending}
        onClick={() => void run({ title, code, language })}
      />
    </>
  );

  return (
    <>
      {children({
        headerActions,
        view:
          view === "answer" ? (
            <AiAnswerView
              text={text}
              pendingLabel={BUTTON_LABELS.pending}
              isCutShort={status === "cut-short"}
              cutShortMessage={AI_EXPLAIN_CUT_SHORT_MESSAGE}
              inputCutMessage={
                isCutForModel(code, EXPLAIN_CODE_MAX) ? CODE_CUT_MESSAGE : null
              }
            />
          ) : undefined,
      })}
      {canUseAi && <AiDataNote id={noteId} className="mt-2" />}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}
