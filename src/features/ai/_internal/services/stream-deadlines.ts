import "server-only";

export interface StreamDeadlineSettings {
  /** Until the first words. */
  firstTextMs: number;
  /** The whole answer. */
  totalMs: number;
}

export interface StreamDeadlines {
  /** Aborts the OpenAI call: the client, a cancel, or a deadline. */
  signal: AbortSignal;
  /** The client went away: nothing to answer and nothing to log. */
  clientGone: () => boolean;
  /** A deadline fired, not the client or a cancel. */
  timedOut: () => boolean;
  /** The first words came: only the total deadline is left. */
  textStarted: () => void;
  /** The response stream was cancelled: stop the call. */
  cancel: () => void;
  /** The answer is over: no timer may fire after it. */
  clear: () => void;
}

// OpenAI sends its headers at once, so the SDK's own timeout ends before any
// text: these bound the wait for the first words and for the whole answer,
// and tell a deadline apart from the client closing the drawer.
export function createStreamDeadlines(
  clientSignal: AbortSignal,
  settings: StreamDeadlineSettings,
): StreamDeadlines {
  const cancelled = new AbortController();
  const deadline = new AbortController();
  const expire = () => deadline.abort();
  const firstText = setTimeout(expire, settings.firstTextMs);
  const total = setTimeout(expire, settings.totalMs);

  const clear = () => {
    clearTimeout(firstText);
    clearTimeout(total);
  };

  return {
    signal: AbortSignal.any([clientSignal, cancelled.signal, deadline.signal]),
    clientGone: () => clientSignal.aborted,
    timedOut: () =>
      deadline.signal.aborted &&
      !clientSignal.aborted &&
      !cancelled.signal.aborted,
    textStarted: () => clearTimeout(firstText),
    cancel: () => {
      clear();
      cancelled.abort();
    },
    clear,
  };
}
