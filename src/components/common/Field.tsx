"use client";

import { useId, type ReactNode } from "react";

/** What the control of a field with an error must carry. */
export interface FieldErrorProps {
  "aria-invalid"?: true;
  "aria-describedby"?: string;
}

interface FieldProps {
  label: string;
  hint?: string;
  /**
   * The field's own error, shown under it; the control gets it through the
   * second argument of `children`.
   */
  error?: string | null;
  /** A control for the whole field, at the end of the label row. */
  action?: ReactNode;
  /**
   * Runs when the label is clicked, for a control the label cannot reach by
   * `htmlFor`, such as an editor that owns its own textarea.
   */
  onLabelClick?: () => void;
  children: (id: string, errorProps: FieldErrorProps) => ReactNode;
}

const LABEL_CLASS = "block text-sm font-medium text-muted-foreground";

export function Field({
  label,
  hint,
  action,
  onLabelClick,
  error,
  children,
}: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const errorProps: FieldErrorProps = error
    ? { "aria-invalid": true, "aria-describedby": errorId }
    : {};
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
      {children(id, errorProps)}
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
