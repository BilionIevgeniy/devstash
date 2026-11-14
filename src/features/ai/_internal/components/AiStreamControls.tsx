import type { Ref } from "react";

import {
  AiStreamButton,
  type AiStreamButtonLabels,
} from "@/features/ai/_internal/components/AiStreamButton";
import { AiViewToggle } from "@/features/ai/_internal/components/AiViewToggle";
import type { AiStreamView } from "@/features/ai/_internal/components/hooks/use-ai-text-stream";

interface AiStreamControlsProps {
  view: AiStreamView;
  onViewChange: (view: AiStreamView) => void;
  viewLabels: Record<AiStreamView, string>;
  buttonLabels: AiStreamButtonLabels;
  canUseAi: boolean;
  /** The id of the AiDataNote under the editor. */
  noteId: string;
  hasAnswer: boolean;
  isPending: boolean;
  /** A save of the answer runs: nothing here may start another request. */
  isBlocked?: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
  onRun: () => void;
}

// The header controls of a streamed AI answer in a read-only editor: the
// switch between the item and the answer once there is one, and the button
// that asks for it (Explain Code, prompt optimization).
export function AiStreamControls({
  view,
  onViewChange,
  viewLabels,
  buttonLabels,
  canUseAi,
  noteId,
  hasAnswer,
  isPending,
  isBlocked = false,
  buttonRef,
  onRun,
}: AiStreamControlsProps) {
  return (
    <>
      {(hasAnswer || isPending) && (
        <AiViewToggle
          view={view}
          onChange={onViewChange}
          labels={viewLabels}
          disabled={isBlocked}
        />
      )}
      <AiStreamButton
        ref={buttonRef}
        labels={buttonLabels}
        canUseAi={canUseAi}
        describedBy={noteId}
        hasAnswer={hasAnswer}
        isPending={isPending}
        isBlocked={isBlocked}
        onClick={onRun}
      />
    </>
  );
}
