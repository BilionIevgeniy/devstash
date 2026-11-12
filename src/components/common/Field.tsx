"use client";

import { useId, type ReactNode } from "react";

interface FieldProps {
  label: string;
  hint?: string;
  /** A control for the whole field, at the end of the label row. */
  action?: ReactNode;
  /**
   * Runs when the label is clicked, for a control the label cannot reach by
   * `htmlFor`, such as an editor that owns its own textarea.
   */
  onLabelClick?: () => void;
  children: (id: string) => ReactNode;
}

const LABEL_CLASS = "block text-sm font-medium text-muted-foreground";

export function Field({
  label,
  hint,
  action,
  onLabelClick,
  children,
}: FieldProps) {
  const id = useId();
  const labelElement = (
    <label htmlFor={id} className={LABEL_CLASS} onClick={onLabelClick}>
      {label}
    </label>
  );

  return (
    <div className="space-y-2">
      {action ? (
        <div className="flex items-center justify-between gap-2">
          {labelElement}
          {action}
        </div>
      ) : (
        labelElement
      )}
      {children(id)}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
