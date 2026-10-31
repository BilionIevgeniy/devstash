import type { ReactNode } from "react";

import { CopyButton } from "@/components/common/CopyButton";

interface EditorHeaderProps {
  /** The text the copy button puts on the clipboard. */
  value: string;
  copyLabel: string;
  /** The language label or the tabs, between the dots and the copy button. */
  children: ReactNode;
}

// The header both editors share: window dots, a slot, the copy button.
export function EditorHeader({
  value,
  copyLabel,
  children,
}: EditorHeaderProps) {
  return (
    <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-1.5">
      <WindowDots />
      {children}
      <CopyButton value={value} label={copyLabel} className="size-7" />
    </div>
  );
}

function WindowDots() {
  return (
    <div className="flex gap-1.5" aria-hidden>
      <span className="size-3 rounded-full bg-[#ff5f57]" />
      <span className="size-3 rounded-full bg-[#febc2e]" />
      <span className="size-3 rounded-full bg-[#28c840]" />
    </div>
  );
}
