"use client";

import {
  createContext,
  use,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { updateEditorPreferences } from "@/features/editor/_internal/actions/preferences";
import {
  NEW_SAVE_TRACKER,
  settleSave,
  startSave,
} from "@/features/editor/_internal/domain/preference-save";
import {
  SAVE_FAILED_MESSAGE,
  type EditorPreferences,
} from "@/features/editor/_internal/domain/preferences";
import { isNavigationError } from "@/lib/navigation-error";

const SAVED_MESSAGE = "Editor preferences saved";
// One toast for all saves, so quick changes replace it instead of stacking.
const TOAST_ID = "editor-preferences";

interface EditorPreferencesContextValue {
  /** The read started by the layout, used until the user changes something. */
  loaded: Promise<EditorPreferences>;
  /** What the user last chose this session: null means use `loaded`. */
  current: EditorPreferences | null;
  update: (next: EditorPreferences) => void;
}

interface EditorPreferencesProviderProps {
  /** Not awaited by the layout, so the shell does not wait for the read. */
  preferences: Promise<EditorPreferences>;
  children: ReactNode;
}

const EditorPreferencesContext =
  createContext<EditorPreferencesContextValue | null>(null);

// Suspends while the read is pending, so a caller needs a Suspense above it.
export function useEditorPreferences() {
  const context = useContext(EditorPreferencesContext);
  if (!context) {
    throw new Error(
      "useEditorPreferences must be used inside EditorPreferencesProvider",
    );
  }
  return {
    preferences: context.current ?? use(context.loaded),
    update: context.update,
  };
}

export function EditorPreferencesProvider({
  preferences,
  children,
}: EditorPreferencesProviderProps) {
  const [current, setCurrent] = useState<EditorPreferences | null>(null);
  const tracker = useRef(NEW_SAVE_TRACKER);

  async function update(next: EditorPreferences) {
    tracker.current = startSave(tracker.current);
    const request = tracker.current.latestRequest;
    setCurrent(next);

    let error: string | null;
    try {
      const result = await updateEditorPreferences(next);
      error = result.success ? null : result.error;
    } catch (thrown) {
      // A session that ended: the router is leaving, nothing to roll back.
      if (isNavigationError(thrown)) return;
      error = SAVE_FAILED_MESSAGE;
    }

    const settled = settleSave(tracker.current, {
      request,
      next,
      succeeded: !error,
    });
    tracker.current = settled.tracker;

    if (settled.outcome.show === "saved") {
      toast.success(SAVED_MESSAGE, { id: TOAST_ID });
    } else if (settled.outcome.show === "failed") {
      setCurrent(settled.outcome.rollbackTo);
      toast.error(error ?? SAVE_FAILED_MESSAGE, { id: TOAST_ID });
    }
  }

  return (
    <EditorPreferencesContext.Provider
      value={{ loaded: preferences, current, update }}
    >
      {children}
    </EditorPreferencesContext.Provider>
  );
}
