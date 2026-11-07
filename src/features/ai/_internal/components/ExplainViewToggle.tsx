"use client";

import { Button } from "@/components/ui/button";
import type { ExplainView } from "@/features/ai/_internal/components/hooks/use-explain-code";

interface ExplainViewToggleProps {
  view: ExplainView;
  onChange: (view: ExplainView) => void;
}

const VIEWS: { value: ExplainView; label: string }[] = [
  { value: "code", label: "Code" },
  { value: "explain", label: "Explain" },
];

// Two pressed-state buttons, not tabs: the buttons sit in the editor's header
// and the panel in its body, so tab and panel could not point at each other.
export function ExplainViewToggle({ view, onChange }: ExplainViewToggleProps) {
  return (
    <div role="group" aria-label="View" className="flex rounded-md bg-muted">
      {VIEWS.map(({ value, label }) => (
        <Button
          key={value}
          type="button"
          variant={view === value ? "secondary" : "ghost"}
          size="xs"
          aria-pressed={view === value}
          onClick={() => onChange(value)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
