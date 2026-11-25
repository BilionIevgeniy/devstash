import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { PendingSpinner } from "./PendingSpinner";

interface NavActionPlaceholderProps {
  /** The label of the main button of each answer ("Get Started", "Dashboard"). */
  labels: string[];
}

// The navbar's placeholder while the session is unknown. Both answers end in
// one main button at the right, and the guest's "Sign In" before it is a ghost
// button, whose look without its text is the empty bar. So the placeholder is
// that main button: its look, at the right, as wide as the wider label (both,
// unseen, in one cell), in either language. SessionActionView's wrapper hides
// it from assistive technology and without script.
export function NavActionPlaceholder({ labels }: NavActionPlaceholderProps) {
  return (
    <span
      className={cn(
        buttonVariants({ size: "lg" }),
        "grid self-center justify-self-end px-3.5",
      )}
    >
      {labels.map((label, index) => (
        <span key={index} className="invisible col-start-1 row-start-1">
          {label}
        </span>
      ))}
      <span className="col-start-1 row-start-1 flex items-center justify-center">
        <PendingSpinner />
      </span>
    </span>
  );
}
