import { cn } from "@/lib/utils";

const TEST_MODE_HINT =
  "Demo mode: no real charges. Pay with card 4242 4242 4242 4242, any future date and any CVC.";

export function TestModeHint({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {TEST_MODE_HINT}
    </p>
  );
}
