"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { probeError, readProbeSecrets } from "../probe";

// A render error, caught by the error boundary, and an event handler error,
// caught by the SDK's global handlers.
export function ClientThrows() {
  const params = useSearchParams();
  const [fail, setFail] = useState(false);
  if (fail) throw probeError("Render", readProbeSecrets(params));

  return (
    <div>
      <button type="button" onClick={() => setFail(true)}>
        Throw while rendering
      </button>
      <button
        type="button"
        onClick={() => {
          throw probeError("Handler", readProbeSecrets(params));
        }}
      >
        Throw in a handler
      </button>
    </div>
  );
}
