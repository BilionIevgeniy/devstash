import {
  type RefObject,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";

import {
  fetchSearchResults,
  type SearchOutcome,
} from "@/features/search/_internal/components/fetch-search-results";
import { toSearchMatch } from "@/features/items/domain/search-text";
import type { PaletteResults } from "@/features/search/types";

/** A pause in typing this long sends the request. */
export const SEARCH_DEBOUNCE_MS = 250;

interface SettledSearch {
  query: string;
  outcome: SearchOutcome;
}

export interface PaletteSearch {
  /** The answer for the current text, or null while none has arrived. */
  outcome: SearchOutcome | null;
  /** Results to keep on screen, dimmed, while the answer for the text is pending. */
  previous: PaletteResults | null;
  isPending: boolean;
  isLoadingMore: boolean;
  /** The last "show more" failed; the loaded results stay. */
  loadMoreFailed: boolean;
  loadMore: () => void;
  retry: () => void;
}

// The next page joins the loaded one. Collections come with the first page
// only, so they stay; an item already loaded (its rank moved between pages) is
// not shown twice.
function appendPage(current: SettledSearch, more: SearchOutcome) {
  if (current.outcome.status !== "ready" || more.status !== "ready") {
    return current;
  }
  const { items, collections } = current.outcome.results;
  const loaded = new Set(items.map(({ id }) => id));
  const added = more.results.items.filter(({ id }) => !loaded.has(id));
  return {
    query: current.query,
    outcome: {
      status: "ready" as const,
      results: {
        items: [...items, ...added],
        collections,
        nextCursor: more.results.nextCursor,
      },
    },
  };
}

const readyResults = (outcome: SearchOutcome | null | undefined) =>
  outcome?.status === "ready" ? outcome.results : null;

// The request running when an effect cleans up, not the one when it ran: a
// later replaceRequest swaps the controller, and that one must be aborted.
function abortCurrent(ref: RefObject<AbortController | null>) {
  ref.current?.abort();
}

// Aborts the request held by the ref and starts the next one. null: aborted,
// so a newer request owns the answer; a network failure is an error.
function replaceRequest(
  ref: RefObject<AbortController | null>,
  query: string,
  cursor: string | null,
): Promise<SearchOutcome | null> {
  abortCurrent(ref);
  const controller = new AbortController();
  ref.current = controller;
  return fetchSearchResults(query, cursor, controller.signal)
    .catch((): SearchOutcome => ({ status: "error" }))
    .then((outcome) => (controller.signal.aborted ? null : outcome));
}

// The palette's search (ADR 0018). The recent list is read once when the
// palette opens, and an empty text (or one too short to match) shows it with
// no request. A typed text is
// sent after a pause; a new text or the unmount aborts the request before it,
// so a late answer for an old text never lands. An abort is not a failure.
export function usePaletteSearch(text: string): PaletteSearch {
  // A text that can match nothing ("r", "!!") is sent nowhere: the recent list
  // stays, as for an empty text.
  const query = toSearchMatch(text) === null ? "" : text.trim();
  const [recent, setRecent] = useState<SearchOutcome | null>(null);
  const [search, setSearch] = useState<SettledSearch | null>(null);
  const [moreFor, setMoreFor] = useState<string | null>(null);
  const [moreFailedFor, setMoreFailedFor] = useState<string | null>(null);
  const searchRef = useRef<AbortController | null>(null);
  const recentRef = useRef<AbortController | null>(null);

  function loadRecent() {
    void replaceRequest(recentRef, "", null).then(
      (outcome) => outcome && setRecent(outcome),
    );
  }

  function startSearch(forQuery: string, cursor: string | null) {
    void replaceRequest(searchRef, forQuery, cursor).then((outcome) => {
      if (!outcome) return;
      setMoreFor(null);
      setMoreFailedFor(
        cursor !== null && outcome.status !== "ready" ? forQuery : null,
      );
      setSearch((current) =>
        cursor !== null && current?.query === forQuery
          ? appendPage(current, outcome)
          : { query: forQuery, outcome },
      );
    });
  }

  const loadRecentOnMount = useEffectEvent(loadRecent);
  const searchAfterPause = useEffectEvent(startSearch);

  useEffect(() => {
    loadRecentOnMount();
    return () => abortCurrent(recentRef);
  }, []);

  useEffect(() => {
    if (query === "") return;
    const timer = setTimeout(
      () => searchAfterPause(query, null),
      SEARCH_DEBOUNCE_MS,
    );
    return () => {
      clearTimeout(timer);
      abortCurrent(searchRef);
    };
  }, [query]);

  const settled = search?.query === query ? search.outcome : null;
  const nextCursor = readyResults(settled)?.nextCursor ?? null;

  return {
    outcome: query === "" ? recent : settled,
    previous:
      query === ""
        ? null
        : (readyResults(search?.outcome) ?? readyResults(recent)),
    isPending: query !== "" && settled === null,
    isLoadingMore: moreFor === query,
    loadMoreFailed: moreFailedFor === query,
    loadMore() {
      if (nextCursor === null || moreFor === query) return;
      setMoreFor(query);
      startSearch(query, nextCursor);
    },
    // The failed answer leaves the screen, so the retry shows as pending.
    retry() {
      if (query === "") {
        setRecent(null);
        loadRecent();
      } else {
        setSearch((current) => (current?.query === query ? null : current));
        startSearch(query, null);
      }
    },
  };
}
