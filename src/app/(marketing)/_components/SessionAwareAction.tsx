"use client";

import { useHasSession } from "@/features/auth/components/hooks/use-has-session";

import {
  SessionActionView,
  type SessionActionProps,
} from "./SessionActionView";

// `Button` fades every property, `visibility` included: when the answer flips,
// the variant that hides would stay drawn over the one that shows for 150 ms.
// The buttons of a session-aware action fade only what they need.
export const BUTTON_TRANSITION =
  "transition-[color,background-color,border-color,box-shadow,translate]";

// An action of the static homepage that knows the session: the navbar's
// buttons and the calls to action. The page stays static, and a signed-in
// visitor never sees a link to register flash: until the answer comes after
// mount, a placeholder stands in the action's place.
export function SessionAwareAction(props: SessionActionProps) {
  return <SessionActionView {...props} hasSession={useHasSession()} />;
}
