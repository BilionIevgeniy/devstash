import { useLayoutEffect, useState } from "react";

// Next.js keeps a route the user left mounted but hidden (React's <Activity>,
// with Cache Components, ADR 0037): its state comes back with it, while its
// effects are cleaned up and run again. A part that must start fresh each time
// its route shows again takes this key. It changes when the route is hidden,
// so the part mounts anew while hidden and its effects first run on return:
// a key changed on return would come after the children's own effects, and a
// Monaco editor that its cleanup disposed throws in them. For a password
// typed and left, that editor, a sheet whose portal stayed hidden.
export function useRemountOnReveal(): number {
  const [generation, setGeneration] = useState(0);

  // The cleanup runs when the route is hidden, and when it unmounts for good,
  // where the update is dropped.
  useLayoutEffect(
    () => () => {
      setGeneration((current) => current + 1);
    },
    [],
  );

  return generation;
}
