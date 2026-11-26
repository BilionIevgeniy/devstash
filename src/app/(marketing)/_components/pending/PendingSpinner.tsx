import { cn } from "@/lib/utils";

interface PendingSpinnerProps {
  /** After a click: in after 100 ms, when the label has begun to leave. */
  soon?: boolean;
}

// The mark of an answer on its way: for the placeholders of SessionActionView
// and the links of PendingLinkLabel. It fades in only after a moment, counted
// from the paint of the static page or from the click, so a fast answer never
// shows it; under reduced motion it is a still dot.
export function PendingSpinner({ soon = false }: PendingSpinnerProps) {
  return (
    <span
      className={cn(
        "size-4 rounded-full border-2 border-current border-t-transparent motion-reduce:size-1.5 motion-reduce:border-0 motion-reduce:bg-current",
        soon
          ? "animate-pending-spin-soon motion-reduce:animate-pending-dot-soon"
          : "animate-pending-spin motion-reduce:animate-pending-dot",
      )}
    />
  );
}
