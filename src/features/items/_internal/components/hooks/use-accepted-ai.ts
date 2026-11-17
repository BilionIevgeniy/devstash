import { useState } from "react";

import {
  acceptedAiClaims,
  NOTHING_ACCEPTED,
  type AcceptedAi,
  type AiGeneratedClaims,
} from "@/features/items/domain/ai-marks";

export interface AcceptedAiHandlers {
  /** The summary as it was put in the field. */
  acceptDescription: (value: string) => void;
  acceptTag: (tag: string) => void;
}

// What a form accepted from the AI since it opened, kept apart from its
// values: at the save, claims() tells the server which values are still the
// AI's own (ADR 0027).
export function useAcceptedAi(): AcceptedAiHandlers & {
  claims: (values: { description: string; tags: string }) => AiGeneratedClaims;
} {
  const [accepted, setAccepted] = useState<AcceptedAi>(NOTHING_ACCEPTED);
  return {
    acceptDescription: (value) =>
      setAccepted((current) => ({ ...current, description: value })),
    acceptTag: (tag) =>
      setAccepted((current) => ({ ...current, tags: [...current.tags, tag] })),
    claims: (values) => acceptedAiClaims(values, accepted),
  };
}
