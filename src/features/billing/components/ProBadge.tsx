import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Marks a feature of the Pro plan: the sidebar's file and image types, and
// the same types in the create dialog.
export function ProBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-4 px-1.5 text-[10px] uppercase tracking-wide text-muted-foreground",
        className,
      )}
    >
      PRO
    </Badge>
  );
}
