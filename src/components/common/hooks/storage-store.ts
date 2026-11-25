import "client-only";

// One value of the browser's `localStorage`, kept for the tab, for a
// `useSyncExternalStore` (the consent's answer, ADR 0034; the theme,
// ADR 0039). The value is kept in memory too: with storage blocked or full, a
// write still holds for this tab. It follows another tab (the `storage` event,
// a `clear()` included) and reads storage again when the page comes back from
// the back-forward cache, which misses the events of the time it was frozen;
// not after a refused write, since storage would answer with what this tab
// already changed.

interface StorageStoreOptions<T> {
  key: string;
  /** The value for what storage holds; null is no entry or no storage. */
  parse: (stored: string | null) => T;
  serialize: (value: T) => string;
  /** Told before the listeners when the value changed outside this tab. */
  onStoredChange?: () => void;
  /**
   * More of the browser to follow while anyone listens (the system's colour
   * scheme): starts with the first listener, and its cleanup runs after the
   * last.
   */
  listenAlso?: (notify: () => void) => () => void;
}

export interface StorageStore<T> {
  /** The tab's value, read from storage the first time it is asked for. */
  read: () => T;
  write: (value: T) => void;
  subscribe: (listener: () => void) => () => void;
  /** Tells the listeners that something they derive from changed. */
  notify: () => void;
  /** Forgets the tab's state. For tests only. */
  forget: () => void;
}

export function createStorageStore<T>({
  key,
  parse,
  serialize,
  onStoredChange,
  listenAlso,
}: StorageStoreOptions<T>): StorageStore<T> {
  let current: { value: T } | undefined;
  let writeFailed = false;
  let stopAlso: (() => void) | undefined;
  const listeners = new Set<() => void>();

  function readStored(): T {
    try {
      return parse(window.localStorage.getItem(key));
    } catch {
      return parse(null);
    }
  }

  function notify(): void {
    for (const listener of listeners) listener();
  }

  function takeStored(value: T): void {
    current = { value };
    onStoredChange?.();
    notify();
  }

  function onStorage(event: StorageEvent): void {
    // A null key is a clear() of the whole storage.
    if (event.key !== key && event.key !== null) return;
    takeStored(parse(event.key === null ? null : event.newValue));
  }

  function onPageShow(event: PageTransitionEvent): void {
    if (!event.persisted || writeFailed) return;
    takeStored(readStored());
  }

  function start(): void {
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onPageShow);
    stopAlso = listenAlso?.(notify);
  }

  function stop(): void {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("pageshow", onPageShow);
    stopAlso?.();
    stopAlso = undefined;
  }

  return {
    read() {
      current ??= { value: readStored() };
      return current.value;
    },
    write(value) {
      try {
        window.localStorage.setItem(key, serialize(value));
        writeFailed = false;
      } catch {
        writeFailed = true;
      }
      current = { value };
      notify();
    },
    subscribe(listener) {
      if (listeners.size === 0) start();
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) stop();
      };
    },
    notify,
    forget() {
      current = undefined;
      writeFailed = false;
    },
  };
}
