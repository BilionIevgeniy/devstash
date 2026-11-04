import type { EditorPreferences } from "@/features/editor/_internal/domain/preferences";

export interface SaveTracker {
  latestRequest: number;
  /** The last value the server accepted: null means the one first read. */
  confirmed: EditorPreferences | null;
}

interface SettledSave {
  request: number;
  next: EditorPreferences;
  succeeded: boolean;
}

type SaveOutcome =
  | { show: "nothing" }
  | { show: "saved" }
  | { show: "failed"; rollbackTo: EditorPreferences | null };

export const NEW_SAVE_TRACKER: SaveTracker = {
  latestRequest: 0,
  confirmed: null,
};

export function startSave(tracker: SaveTracker): SaveTracker {
  return { ...tracker, latestRequest: tracker.latestRequest + 1 };
}

// Every save carries all the preferences and Server Actions run one at a time,
// so the latest save alone decides what the screen and the toast say: an
// earlier failure is overwritten by the save that follows it.
export function settleSave(
  tracker: SaveTracker,
  { request, next, succeeded }: SettledSave,
): { tracker: SaveTracker; outcome: SaveOutcome } {
  const settled = succeeded ? { ...tracker, confirmed: next } : tracker;

  if (request !== tracker.latestRequest) {
    return { tracker: settled, outcome: { show: "nothing" } };
  }
  if (succeeded) return { tracker: settled, outcome: { show: "saved" } };
  return {
    tracker: settled,
    outcome: { show: "failed", rollbackTo: settled.confirmed },
  };
}
