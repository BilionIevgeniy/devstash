"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center gap-1 px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        {title}
        <ChevronDown
          className={cn("size-4 transition-transform", !isOpen && "-rotate-90")}
        />
      </button>
      {isOpen && <div className="mt-1">{children}</div>}
    </section>
  );
}
