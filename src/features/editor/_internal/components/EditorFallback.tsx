import type { Ref } from "react";

import { Textarea } from "@/components/ui/textarea";

interface EditorFallbackProps {
  value: string;
  readOnly: boolean;
  ariaLabel: string;
  onChange?: (value: string) => void;
  /** The textarea, so the editor's handle can focus it. */
  textareaRef?: Ref<HTMLTextAreaElement>;
}

// Shown when Monaco could not load: the code stays readable, and editable in a
// form, so a failed load costs the highlighting and not the user's work.
export function EditorFallback({
  value,
  readOnly,
  ariaLabel,
  onChange,
  textareaRef,
}: EditorFallbackProps) {
  return (
    <div className="space-y-2 p-3">
      <p role="status" className="text-xs text-muted-foreground">
        The code editor couldn&apos;t load. Reload the page to try again.
      </p>
      <Textarea
        ref={textareaRef}
        value={value}
        readOnly={readOnly}
        aria-label={ariaLabel}
        onChange={(event) => onChange?.(event.target.value)}
        className="max-h-100 font-mono"
      />
    </div>
  );
}
