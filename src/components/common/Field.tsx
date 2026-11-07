"use client";

import { useId, type ReactNode } from "react";

interface FieldProps {
  label: string;
  hint?: string;
  /** A control for the whole field, at the end of the label row. */
  action?: ReactNode;
  children: (id: string) => ReactNode;
}

const LABEL_CLASS = "block text-sm font-medium text-muted-foreground";

export function Field({ label, hint, action, children }: FieldProps) {
  const id = useId();
  const labelElement = (
    <label htmlFor={id} className={LABEL_CLASS}>
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
