import { useSyncExternalStore } from "react";

import { createStorageStore } from "@/components/common/hooks/storage-store";
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
// Storage, other tabs and the back-forward cache are the storage store's.
let reopened = false;
// The Privacy settings button that opened the banner again: it gets the focus
// back once the banner is answered and gone.
let opener: HTMLElement | null = null;
let snapshot: ConsentState | undefined;

const store = createStorageStore<ConsentChoice | null>({
  key: CONSENT_STORAGE_KEY,
  parse: parseConsent,
  // Never called with null: only an answer is written.
  serialize: (choice) => (choice ? serializeConsent(choice) : ""),
  // An answer given elsewhere closes a banner opened again here.
  onStoredChange: () => {
    reopened = false;
  },
});

/** The tab's consent, read from storage the first time it is asked for. */
export function readConsent(): ConsentState {
  const choice = store.read();
  if (snapshot?.choice !== choice || snapshot.reopened !== reopened) {
    snapshot = { choice, reopened };
  }
  return snapshot;
}

// The server and the first render of the browser know nothing, so nothing that
// depends on the answer renders until the store has been read after hydration.
function readServerConsent(): undefined {
  return undefined;
}

export function setConsent(choice: ConsentChoice): void {
  reopened = false;
  store.write(choice);
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
  reopened = true;
  store.notify();
}

/** Forgets the tab's state. For tests only. */
export function forgetConsent(): void {
  store.forget();
  reopened = false;
  opener = null;
  snapshot = undefined;
}

// Undefined until the stored answer has been read, so a component can render
// nothing instead of a guess: the banner never shows for one frame to a
// visitor who already answered.
export function useConsent(): ConsentState | undefined {
  return useSyncExternalStore(store.subscribe, readConsent, readServerConsent);
}
