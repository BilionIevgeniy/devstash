import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { AiGeneratedLabel } from "@/features/ai/components/AiGeneratedLabel";
import { aiMarkProps } from "@/features/ai/domain/marking";

interface DrawerSectionProps {
  title: string;
  icon?: LucideIcon;
  /** The value shown is an accepted AI output: the label and the attribute (ADR 0027). */
  aiGenerated?: boolean;
  children: ReactNode;
}

export function DrawerSection({
  title,
  icon: Icon,
  aiGenerated = false,
  children,
}: DrawerSectionProps) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {Icon && <Icon className="size-4" />}
        {title}
        {/* The space keeps the heading's name two words for a screen reader;
            a flex container drops it from the layout. */}
        {aiGenerated && (
          <>
            {" "}
            <AiGeneratedLabel />
          </>
        )}
      </h3>
      <div {...aiMarkProps(aiGenerated)}>{children}</div>
    </section>
  );
}
