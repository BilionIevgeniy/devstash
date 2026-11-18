import { useSyncExternalStore } from "react";

import {
  CONSENT_STORAGE_KEY,
  parseConsent,
  serializeConsent,
  type ConsentChoice,
} from "@/lib/consent";

/** What the banner knows once the stored answer has been read. */
export interface ConsentState {
  /** Null until the visitor has answered this version of the banner. */
  choice: ConsentChoice | null;
  /** Privacy settings asked for the banner again, to change the answer. */
  reopened: boolean;
}

// One store for the tab, shared by the banner, the Privacy settings buttons
// and the Web Vitals gate, in whichever provider layout they are (ADR 0034).
// The answer is kept in memory too: with storage blocked, a click still takes
// effect for this tab. Another tab's answer arrives through the `storage`
// event.
let state: ConsentState | undefined;
// The Privacy settings button that opened the banner again: it gets the focus
// back once the banner is answered and gone.
let opener: HTMLElement | null = null;
const listeners = new Set<() => void>();

function readStoredChoice(): ConsentChoice | null {
  try {
    return parseConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

function update(next: ConsentState): void {
  state = next;
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent): void {
  if (event.key !== CONSENT_STORAGE_KEY) return;
  update({ choice: parseConsent(event.newValue), reopened: false });
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

/** The tab's consent, read from storage the first time it is asked for. */
export function readConsent(): ConsentState {
  state ??= { choice: readStoredChoice(), reopened: false };
  return state;
}

// The server and the first render of the browser know nothing, so nothing that
// depends on the answer renders until the store has been read after hydration.
function readServerConsent(): undefined {
  return undefined;
}

export function setConsent(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, serializeConsent(choice));
  } catch {
    // Storage is blocked: the answer holds for this tab only.
  }
  update({ choice, reopened: false });
  const trigger = opener;
  opener = null;
  if (trigger?.isConnected) trigger.focus();
}

/**
 * Shows the banner again, so the answer can be changed or withdrawn; the
 * trigger gets the focus back after the answer.
 */
export function reopenConsent(trigger?: HTMLElement): void {
  opener = trigger ?? null;
  update({ ...readConsent(), reopened: true });
}

/** Forgets the tab's state. For tests only. */
export function forgetConsent(): void {
  state = undefined;
  opener = null;
}

// Undefined until the stored answer has been read, so a component can render
// nothing instead of a guess: the banner never shows for one frame to a
// visitor who already answered.
export function useConsent(): ConsentState | undefined {
  return useSyncExternalStore(subscribe, readConsent, readServerConsent);
}
