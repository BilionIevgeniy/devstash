import { useEffect, useState } from "react";

import { fetchCollectionOptions } from "@/features/items/_internal/components/fetch-collection-options";
import type { ItemCollectionRef } from "@/features/items/types";

export type CollectionOptionsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; collections: ItemCollectionRef[] };

// Read when the form mounts and aborted when it unmounts; an abort is not a
// failure, so it sets no error.
export function useCollectionOptions(): CollectionOptionsState {
  const [state, setState] = useState<CollectionOptionsState>({
    status: "loading",
  });

  useEffect(() => {
    const controller = new AbortController();

    fetchCollectionOptions(controller.signal)
      .then((collections) => {
        setState(
          collections ? { status: "ready", collections } : { status: "error" },
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error" });
      });

    return () => controller.abort();
  }, []);

  return state;
}
