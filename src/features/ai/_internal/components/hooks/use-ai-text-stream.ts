import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useFrameText } from "@/features/ai/_internal/components/hooks/use-frame-text";
import {
  AiStreamRequestError,
  streamAiText,
} from "@/features/ai/_internal/components/stream-ai-text";
import { AI_UNAVAILABLE_MESSAGE } from "@/features/ai/domain/messages";

export type AiStreamStatus =
  "idle" | "waiting" | "streaming" | "done" | "cut-short";
/** The item's own text, or the AI answer in its place. */
export type AiStreamView = "source" | "answer";

export interface AiStreamOptions {
  /** The streaming route, such as "/api/ai/explain". */
  url: string;
  /** Read out once when an answer ends. */
  doneAnnouncement: string;
  cutShortAnnouncement: string;
}

// One streamed answer, kept in state: switching views never calls again,
// only run() does. A new request aborts the last, as does leaving the item;
// an abort shows nothing. The last answer stays on screen until the new one
// writes its first words, so a failed retry loses nothing.
export function useAiTextStream(options: AiStreamOptions) {
  const [status, setStatus] = useState<AiStreamStatus>("idle");
  const [view, setView] = useState<AiStreamView>("source");
  // Set once per answer, for a live region that is mounted all along.
  const [announcement, setAnnouncement] = useState("");
  const { text, start, append, finish, clear } = useFrameText();
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  function settle(next: "done" | "cut-short") {
    setStatus(next);
    setAnnouncement(
      next === "done" ? options.doneAnnouncement : options.cutShortAnnouncement,
    );
  }

  async function run(body: unknown) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const before = status;
    const isFirst = text === "";
    let wrote = false;

    start();
    setAnnouncement("");
    setStatus("waiting");
    if (isFirst) setView("answer");

    try {
      await streamAiText(options.url, body, controller.signal, (piece) => {
        if (!wrote) {
          wrote = true;
          setStatus("streaming");
          setView("answer");
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
        error instanceof AiStreamRequestError
          ? error.message
          : AI_UNAVAILABLE_MESSAGE,
      );
      setStatus(isFirst ? "idle" : before);
      if (isFirst) setView("source");
    }
  }

  /** Back to the item's own text, the answer dropped. */
  function reset() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    clear();
    setStatus("idle");
    setView("source");
    setAnnouncement("");
  }

  return { status, view, text, announcement, run, setView, reset };
}
