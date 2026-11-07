// Ends a stream that finished: plain text has no end of its own, so a stream
// cut by a proxy could otherwise look whole. The model never writes it.
export const STREAM_END_MARK = "\u0000";

export interface StreamText {
  text: string;
  /** The stream ended with STREAM_END_MARK. */
  complete: boolean;
}

// The text a client shows, without the end mark.
export function readStreamText(raw: string): StreamText {
  const complete = raw.endsWith(STREAM_END_MARK);
  const text = raw.replaceAll(STREAM_END_MARK, "");
  return { text, complete };
}
