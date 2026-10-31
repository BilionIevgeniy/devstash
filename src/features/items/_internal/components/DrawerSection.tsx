import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface DrawerSectionProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
}

export function DrawerSection({
  title,
  icon: Icon,
  children,
}: DrawerSectionProps) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {Icon && <Icon className="size-4" />}
        {title}
      </h3>
      {children}
    </section>
  );
}
