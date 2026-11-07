"use client";

import type { ReactNode } from "react";

import { ExplainButton } from "@/features/ai/_internal/components/ExplainButton";
import { ExplainViewToggle } from "@/features/ai/_internal/components/ExplainViewToggle";
import { ExplanationView } from "@/features/ai/_internal/components/ExplanationView";
import { useExplainCode } from "@/features/ai/_internal/components/hooks/use-explain-code";
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
  const { status, view, text, announcement, explain, setView } =
    useExplainCode();
  const isPending = status === "waiting" || status === "streaming";
  const hasAnswer = text !== "";
  const showsToggle = hasAnswer || isPending;

  const headerActions = (
    <>
      {showsToggle && <ExplainViewToggle view={view} onChange={setView} />}
      <ExplainButton
        canUseAi={canUseAi}
        hasAnswer={hasAnswer}
        isPending={isPending}
        onClick={() => void explain({ title, code, language })}
      />
    </>
  );

  return (
    <>
      {children({
        headerActions,
        view:
          view === "explain" ? (
            <ExplanationView
              text={text}
              isCutShort={status === "cut-short"}
              isCodeCut={isCutForModel(code, EXPLAIN_CODE_MAX)}
            />
          ) : undefined,
      })}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}
