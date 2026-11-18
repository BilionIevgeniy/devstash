"use client";

import type { ReactNode } from "react";

import { useHasSession } from "@/features/auth/components/hooks/use-has-session";
import { cn } from "@/lib/utils";

// `Button` fades every property, `visibility` included: when the answer flips,
// the variant that hides would stay drawn over the one that shows for 150 ms.
// The buttons of a session-aware action fade only what they need.
export const BUTTON_TRANSITION =
  "transition-[color,background-color,border-color,box-shadow,translate]";

interface SessionAwareActionProps {
  /**
   * What a visitor who is not signed in gets, such as a link to register.
   * `hidden` is true while it does not apply: a link then sets
   * `prefetch={false}`, so nobody loads a page for a link nobody sees.
   */
  guest: (hidden: boolean) => ReactNode;
  /** What a signed-in visitor gets instead, such as a link to the dashboard. */
  member: (hidden: boolean) => ReactNode;
  className?: string;
  /** The layout of each variant's cell. */
  cellClassName?: string;
}

// An action of the static homepage that knows the session: the navbar's
// buttons and the calls to action. Both variants sit in one grid cell, as wide
// as the wider of the two, so the place is kept whatever the answer, and the
// one that does not apply (both, until the answer comes after mount) is
// `invisible`, which also takes it out of the tab order and the accessibility
// tree. The page stays static; a signed-in visitor never sees a link to
// register flash.
export function SessionAwareAction({
  guest,
  member,
  className,
  cellClassName = "grid",
}: SessionAwareActionProps) {
  const hasSession = useHasSession();
  const guestHidden = hasSession !== false;
  const memberHidden = hasSession !== true;

  return (
    <div className={cn("grid", className)}>
      <div
        className={cn(
          "col-start-1 row-start-1",
          cellClassName,
          guestHidden && "invisible",
        )}
      >
        {guest(guestHidden)}
      </div>
      <div
        className={cn(
          "col-start-1 row-start-1",
          cellClassName,
          memberHidden && "invisible",
        )}
      >
        {member(memberHidden)}
      </div>
    </div>
  );
}
