import { Pin } from "lucide-react";

import { cn } from "@/lib/utils";

interface PinMarkProps {
  /** The colour of the item's type; a custom type may have none. */
  color?: string;
}

// The static mark of a pinned item on its card or row.
export function PinMark({ color }: PinMarkProps) {
  return (
    <Pin
      className={cn(
        "size-3.5 shrink-0 fill-current",
        !color && "text-muted-foreground",
      )}
      style={color ? { color } : undefined}
    />
  );
}
