import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createStorageStore } from "@/components/common/hooks/storage-store";

const KEY = "storage-store-test";

// A store whose value is the stored text, or "none" for no entry.
function makeStore(
  options: {
    onStoredChange?: () => void;
    listenAlso?: (notify: () => void) => () => void;
  } = {},
) {
  return createStorageStore<string>({
    key: KEY,
    parse: (stored) => stored ?? "none",
    serialize: (value) => value,
    ...options,
  });
}

function fromAnotherTab(key: string | null, newValue: string | null = null) {
  window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
}

function backFromCache(persisted: boolean) {
  window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted }));
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createStorageStore", () => {
  it("reads storage once and keeps what it writes", () => {
    window.localStorage.setItem(KEY, "stored");
    const store = makeStore();
    expect(store.read()).toBe("stored");

    store.write("new");
    expect(store.read()).toBe("new");
    expect(window.localStorage.getItem(KEY)).toBe("new");
  });

  it("follows another tab, a clear() included, while anyone listens", () => {
    const onStoredChange = vi.fn();
    const store = makeStore({ onStoredChange });
    const listener = vi.fn();
    const stop = store.subscribe(listener);

    fromAnotherTab("other-key", "ignored");
    expect(listener).not.toHaveBeenCalled();

    fromAnotherTab(KEY, "there");
    expect(store.read()).toBe("there");
    fromAnotherTab(null);
    expect(store.read()).toBe("none");
    expect(onStoredChange).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledTimes(2);

    stop();
    fromAnotherTab(KEY, "after");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("reads storage again when the page comes back from the cache", () => {
    const store = makeStore();
    const stop = store.subscribe(vi.fn());
    store.read();
    window.localStorage.setItem(KEY, "while frozen");

    backFromCache(false);
    expect(store.read()).toBe("none");
    backFromCache(true);
    expect(store.read()).toBe("while frozen");
    stop();
  });

  // Playwright's Chromium never restores a page from the back-forward cache
  // (ADR 0037), so this case is proved here only.
  it("keeps a value storage refused, also after the cache", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    const store = makeStore();
    const stop = store.subscribe(vi.fn());

    store.write("in memory");
    backFromCache(true);
    expect(store.read()).toBe("in memory");
    stop();
  });

  it("follows more of the browser from the first listener to the last", () => {
    const stopAlso = vi.fn();
    const listenAlso = vi.fn(() => stopAlso);
    const store = makeStore({ listenAlso });

    const stopFirst = store.subscribe(vi.fn());
    const stopSecond = store.subscribe(vi.fn());
    expect(listenAlso).toHaveBeenCalledOnce();

    stopFirst();
    expect(stopAlso).not.toHaveBeenCalled();
    stopSecond();
    expect(stopAlso).toHaveBeenCalledOnce();
  });

  it("does not tell its own writes as changes from outside", () => {
    const onStoredChange = vi.fn();
    const store = makeStore({ onStoredChange });
    store.write("mine");
    expect(onStoredChange).not.toHaveBeenCalled();
  });
});
