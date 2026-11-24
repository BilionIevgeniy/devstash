import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonVariant = NonNullable<
  Parameters<typeof buttonVariants>[0]
>["variant"];

export interface SessionActionProps {
  /**
   * What a visitor who is not signed in gets, such as a link to register.
   * `hidden` is true while it does not apply: a link then sets
   * `prefetch={false}`, so nobody loads a page for a link nobody sees.
   */
  guest: (hidden: boolean) => ReactNode;
  /** What a signed-in visitor gets instead, such as a link to the dashboard. */
  member: (hidden: boolean) => ReactNode;
  /** The look of the placeholder: the variant of the buttons it stands for. */
  pendingVariant?: ButtonVariant;
  className?: string;
  /** The layout of each variant's cell. */
  cellClassName?: string;
}

// Not a control: nothing to reach with the keyboard, nothing for a screen
// reader, which hears of the action once there is one. The spinner fades in
// only after a moment, counted from the paint of the static page, so a fast
// answer never shows it.
function PendingPlaceholder({ variant }: { variant?: ButtonVariant }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        buttonVariants({ variant, size: "lg" }),
        "pointer-events-none col-start-1 row-start-1 h-auto self-stretch justify-self-stretch no-script:hidden",
      )}
    >
      <span className="size-4 animate-pending-spin rounded-full border-2 border-current border-t-transparent motion-reduce:size-1.5 motion-reduce:animate-pending-dot motion-reduce:border-0 motion-reduce:bg-current" />
    </span>
  );
}

interface SessionActionViewProps extends SessionActionProps {
  /** Null until the answer comes. */
  hasSession: boolean | null;
}

// Both variants and the placeholder sit in one grid cell, as wide as the wider
// variant, so the place and its size are kept whatever the answer. A variant
// that does not apply (both, until the answer) is `invisible`, which also takes
// it out of the tab order and the accessibility tree. With no script there is
// never an answer: the guest's variant shows.
export function SessionActionView({
  hasSession,
  guest,
  member,
  pendingVariant,
  className,
  cellClassName = "grid",
}: SessionActionViewProps) {
  const guestHidden = hasSession !== false;
  const memberHidden = hasSession !== true;
  const isPending = hasSession === null;

  return (
    <div className={cn("grid", className)}>
      <div
        className={cn(
          "col-start-1 row-start-1",
          cellClassName,
          guestHidden && "invisible",
          isPending && "no-script:visible",
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
      {isPending && <PendingPlaceholder variant={pendingVariant} />}
    </div>
  );
}
