"use client";

import { Button } from "@/components/ui/button";
import type { AiStreamView } from "@/features/ai/_internal/components/hooks/use-ai-text-stream";

interface AiViewToggleProps {
  view: AiStreamView;
  onChange: (view: AiStreamView) => void;
  /** "Code" and "Explain", or "Original" and "Optimized". */
  labels: Record<AiStreamView, string>;
  disabled?: boolean;
}

const VIEWS: AiStreamView[] = ["source", "answer"];

// Two pressed-state buttons, not tabs: the buttons sit in the editor's header
// and the panel in its body, so tab and panel could not point at each other.
export function AiViewToggle({
  view,
  onChange,
  labels,
  disabled = false,
}: AiViewToggleProps) {
  return (
    <div role="group" aria-label="View" className="flex rounded-md bg-muted">
      {VIEWS.map((value) => (
        <Button
          key={value}
          type="button"
          variant={view === value ? "secondary" : "ghost"}
          size="xs"
          aria-pressed={view === value}
          disabled={disabled}
          onClick={() => onChange(value)}
        >
          {labels[value]}
        </Button>
      ))}
    </div>
  );
}
