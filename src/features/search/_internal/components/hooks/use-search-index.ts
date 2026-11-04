import { useEffect, useEffectEvent, useRef, useState } from "react";

import { fetchSearchIndex } from "@/features/search/_internal/components/fetch-search-index";
import type { SearchIndex } from "@/features/search/types";

export type SearchIndexState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; index: SearchIndex };

// A failed refresh is silent while there is an index to show.
function afterFailure(current: SearchIndexState): SearchIndexState {
  return current.status === "ready" ? current : { status: "error" };
}

// Read on app load and again from `refresh`, so the palette keeps up with
// changes made anywhere. A new read aborts the one before it, so a slow old
// answer never replaces a newer index; an abort is not a failure.
export function useSearchIndex() {
  const [state, setState] = useState<SearchIndexState>({ status: "loading" });
  const requestRef = useRef<AbortController | null>(null);

  function load() {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    fetchSearchIndex(controller.signal)
      .then((index) => {
        if (controller.signal.aborted) return;
        setState(index ? { status: "ready", index } : afterFailure);
      })
      .catch(() => {
        if (!controller.signal.aborted) setState(afterFailure);
      });
  }

  function refresh() {
    setState((current) =>
      current.status === "error" ? { status: "loading" } : current,
    );
    load();
  }

  const loadOnMount = useEffectEvent(load);

  useEffect(() => {
    loadOnMount();
    return () => requestRef.current?.abort();
  }, []);

  return { state, refresh };
}
