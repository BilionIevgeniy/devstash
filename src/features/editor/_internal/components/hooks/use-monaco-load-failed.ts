import { useEffect, useState } from "react";
import { loader } from "@monaco-editor/react";

// The Editor only logs a failed load and keeps its loading state, and the
// loader holds one promise for the whole page, so after a failure every editor
// would stay a skeleton until a reload. init() here shares that same promise.
export function useMonacoLoadFailed() {
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    const load = loader.init();
    load.catch((error: { type?: string } | undefined) => {
      if (error?.type !== "cancelation") setHasFailed(true);
    });
    return () => load.cancel();
  }, []);

  return hasFailed;
}
