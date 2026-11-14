"use client";
import { useTranslations } from "next-intl";

import { useId, type ReactNode } from "react";

import { AiAnswerView } from "@/features/ai/_internal/components/AiAnswerView";
import { AiStreamControls } from "@/features/ai/_internal/components/AiStreamControls";
import { AiDataNote } from "@/features/ai/_internal/components/AiDataNote";
import { useAiTextStream } from "@/features/ai/_internal/components/hooks/use-ai-text-stream";
import { useAiStreamLabels } from "@/features/ai/_internal/components/hooks/use-ai-stream-labels";
import { EXPLAIN_CODE_MAX, isCutForModel } from "@/features/ai/domain/input";

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

const STREAM_URL = "/api/ai/explain";

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
  const t = useTranslations("ai.explain");
  const { stream, buttonLabels, viewLabels } = useAiStreamLabels(
    "ai.explain",
    STREAM_URL,
  );
  const { status, view, text, announcement, run, setView } =
    useAiTextStream(stream);
  const noteId = useId();
  const isPending = status === "waiting" || status === "streaming";
  const hasAnswer = text !== "";

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
      onRun={() => void run({ title, code, language })}
    />
  );

  return (
    <>
      {children({
        headerActions,
        view:
          view === "answer" ? (
            <AiAnswerView
              text={text}
              pendingLabel={buttonLabels.pending}
              isCutShort={status === "cut-short"}
              cutShortMessage={t("cutMessage")}
              inputCutMessage={
                isCutForModel(code, EXPLAIN_CODE_MAX)
                  ? t("codeCut", { max: EXPLAIN_CODE_MAX })
                  : null
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
