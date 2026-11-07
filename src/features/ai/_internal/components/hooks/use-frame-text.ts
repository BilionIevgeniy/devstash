import { useEffect, useRef, useState } from "react";

import { readStreamText } from "@/features/ai/domain/text-stream";

// The text of a stream, shown once per animation frame: a delta is a few
// characters, and each render parses the whole Markdown again.
export function useFrameText() {
  const [text, setText] = useState("");
  const rawRef = useRef("");
  const frameRef = useRef<number | null>(null);

  function cancelFrame() {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }

  useEffect(() => cancelFrame, []);

  /** Starts a new answer; the text on screen stays until its first piece. */
  function start() {
    cancelFrame();
    rawRef.current = "";
  }

  function append(piece: string) {
    rawRef.current += piece;
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      setText(readStreamText(rawRef.current).text);
    });
  }

  /** Shows all of it now; whether the stream reached its end mark. */
  function finish(): boolean {
    cancelFrame();
    const { text: whole, complete } = readStreamText(rawRef.current);
    setText(whole);
    return complete;
  }

  /** Drops the answer, on screen too. */
  function clear() {
    cancelFrame();
    rawRef.current = "";
    setText("");
  }

  return { text, start, append, finish, clear };
}
