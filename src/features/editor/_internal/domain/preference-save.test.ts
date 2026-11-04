import { describe, expect, it } from "vitest";

import {
  NEW_SAVE_TRACKER,
  settleSave,
  startSave,
} from "@/features/editor/_internal/domain/preference-save";
import { DEFAULT_EDITOR_PREFERENCES } from "@/features/editor/_internal/domain/preferences";

const FIRST = { ...DEFAULT_EDITOR_PREFERENCES, fontSize: 16 };
const SECOND = { ...FIRST, theme: "monokai" as const };

describe("settleSave", () => {
  it("reports a single save that succeeded and confirms its value", () => {
    const tracker = startSave(NEW_SAVE_TRACKER);

    const result = settleSave(tracker, {
      request: 1,
      next: FIRST,
      succeeded: true,
    });

    expect(result.outcome).toEqual({ show: "saved" });
    expect(result.tracker.confirmed).toEqual(FIRST);
  });

  it("rolls back to the first read when nothing was ever confirmed", () => {
    const tracker = startSave(NEW_SAVE_TRACKER);

    const result = settleSave(tracker, {
      request: 1,
      next: FIRST,
      succeeded: false,
    });

    expect(result.outcome).toEqual({ show: "failed", rollbackTo: null });
  });

  it("ignores an earlier failure, so a later save is not rolled back", () => {
    const tracker = startSave(startSave(NEW_SAVE_TRACKER));

    const earlier = settleSave(tracker, {
      request: 1,
      next: FIRST,
      succeeded: false,
    });
    const later = settleSave(earlier.tracker, {
      request: 2,
      next: SECOND,
      succeeded: true,
    });

    expect(earlier.outcome).toEqual({ show: "nothing" });
    expect(later.outcome).toEqual({ show: "saved" });
    expect(later.tracker.confirmed).toEqual(SECOND);
  });

  it("rolls the latest failure back to an earlier save that succeeded", () => {
    const tracker = startSave(startSave(NEW_SAVE_TRACKER));

    const earlier = settleSave(tracker, {
      request: 1,
      next: FIRST,
      succeeded: true,
    });
    const later = settleSave(earlier.tracker, {
      request: 2,
      next: SECOND,
      succeeded: false,
    });

    expect(earlier.outcome).toEqual({ show: "nothing" });
    expect(later.outcome).toEqual({ show: "failed", rollbackTo: FIRST });
  });
});
