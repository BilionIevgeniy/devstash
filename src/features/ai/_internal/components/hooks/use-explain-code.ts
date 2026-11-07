import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useFrameText } from "@/features/ai/_internal/components/hooks/use-frame-text";
import {
  ExplainRequestError,
  streamExplanation,
} from "@/features/ai/_internal/components/stream-explanation";
import { AI_UNAVAILABLE_MESSAGE } from "@/features/ai/domain/messages";
import type { ExplainInput } from "@/features/ai/schemas";

export type ExplainStatus =
  "idle" | "waiting" | "streaming" | "done" | "cut-short";
export type ExplainView = "code" | "explain";

const ANNOUNCEMENTS: Partial<Record<ExplainStatus, string>> = {
  done: "Explanation ready",
  "cut-short": "Explanation cut short",
};

// One explanation of the code, kept in state: switching views never calls
// again, only Explain or Regenerate does. A new request aborts the last, as
// does leaving the item; an abort shows nothing. The last answer stays on
// screen until the new one writes its first words, so a failed Regenerate
// loses nothing.
export function useExplainCode() {
  const [status, setStatus] = useState<ExplainStatus>("idle");
  const [view, setView] = useState<ExplainView>("code");
  // Set once per answer, for a live region that is mounted all along.
  const [announcement, setAnnouncement] = useState("");
  const { text, start, append, finish } = useFrameText();
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  function settle(next: ExplainStatus) {
    setStatus(next);
    setAnnouncement(ANNOUNCEMENTS[next] ?? "");
  }

  async function explain(input: ExplainInput) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const before = status;
    const isFirst = text === "";
    let wrote = false;

    start();
    setAnnouncement("");
    setStatus("waiting");
    if (isFirst) setView("explain");

    try {
      await streamExplanation(input, controller.signal, (piece) => {
        if (!wrote) {
          wrote = true;
          setStatus("streaming");
          setView("explain");
        }
        append(piece);
      });
      settle(finish() ? "done" : "cut-short");
    } catch (error) {
      if (controller.signal.aborted) return;
      if (wrote) {
        finish();
        settle("cut-short");
        return;
      }
      toast.error(
        error instanceof ExplainRequestError
          ? error.message
          : AI_UNAVAILABLE_MESSAGE,
      );
      setStatus(isFirst ? "idle" : before);
      if (isFirst) setView("code");
    }
  }

  return { status, view, text, announcement, explain, setView };
}
