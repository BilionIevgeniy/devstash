// The mark of a session-aware action whose answer is on its way, for the
// placeholders of SessionActionView. It fades in only after a moment, counted
// from the paint of the static page, so a fast answer never shows it; under
// reduced motion it is a still dot.
export function PendingSpinner() {
  return (
    <span className="size-4 animate-pending-spin rounded-full border-2 border-current border-t-transparent motion-reduce:size-1.5 motion-reduce:animate-pending-dot motion-reduce:border-0 motion-reduce:bg-current" />
  );
}
