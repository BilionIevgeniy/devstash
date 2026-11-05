import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

interface CheckListProps {
  items: string[];
  className?: string;
}

export function CheckList({ items, className }: CheckListProps) {
  return (
    <ul className={cn("grid gap-3", className)}>
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-muted-foreground">
          <Check className="mt-0.75 size-4.5 shrink-0 text-brand" />
          {item}
        </li>
      ))}
    </ul>
  );
}
