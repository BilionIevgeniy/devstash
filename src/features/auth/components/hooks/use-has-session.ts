import { useEffect, useSyncExternalStore } from "react";

import { fetchHasSession } from "@/features/auth/_internal/components/fetch-has-session";

// The last answer of this tab, shared by every caller: the homepage's navbar
// remounts when `/` and `/de` swap layouts, and a fresh start from "unknown"
// would flash the guest buttons for a signed-in user. A reload starts empty,
// like the server render, so hydration always agrees.
let lastAnswer: boolean | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readAnswer(): boolean | null {
  return lastAnswer;
}

function readServerAnswer(): null {
  return null;
}

function remember(answer: boolean): void {
  lastAnswer = answer;
  for (const listener of listeners) listener();
}

// The check that is running, shared by every caller mounted while it runs:
// the homepage asks from the navbar and from each call to action, and they
// should not send one request each. Aborted when its last caller unmounts.
interface RunningCheck {
  controller: AbortController;
  callers: number;
}
let running: RunningCheck | null = null;

function startCheck(): RunningCheck {
  const controller = new AbortController();
  const check = { controller, callers: 0 };
  fetchHasSession(controller.signal)
    .then(remember)
    .catch(() => {
      if (!controller.signal.aborted && lastAnswer === null) remember(false);
    })
    .finally(() => {
      if (running === check) running = null;
    });
  return check;
}

function joinCheck(): () => void {
  running ??= startCheck();
  const check = running;
  check.callers += 1;
  return () => {
    check.callers -= 1;
    if (check.callers > 0) return;
    check.controller.abort();
    if (running === check) running = null;
  };
}

/** Forgets the tab's answer. For tests only. */
export function forgetSessionAnswer(): void {
  lastAnswer = null;
  running = null;
}

// For a page that stays static: whether the visitor is signed in, learnt
// after mount; null until the first answer, so a caller can keep the place
// of what depends on it instead of showing the wrong thing. A known answer is
// used at once and checked again in the background. Only for what the
// visitor sees, never for access. Callers mounted together share one request,
// aborted when the last of them unmounts; an abort is not a failure, and a
// failure with no answer yet means a guest.
export function useHasSession(): boolean | null {
  const hasSession = useSyncExternalStore(
    subscribe,
    readAnswer,
    readServerAnswer,
  );

  useEffect(() => joinCheck(), []);

  return hasSession;
}
