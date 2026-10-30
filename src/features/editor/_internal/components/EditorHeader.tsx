"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const COPIED_RESET_MS = 2000;
const COPIED_MESSAGE = "Copied to clipboard";
const COPY_FAILED_MESSAGE = "Couldn't copy to the clipboard";

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
      <CopyButton value={value} label={copyLabel} />
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

function CopyButton({ value, label }: { value: string; label: string }) {
  const [isCopied, setIsCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      toast.success(COPIED_MESSAGE);
      setTimeout(() => setIsCopied(false), COPIED_RESET_MS);
    } catch {
      toast.error(COPY_FAILED_MESSAGE);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7"
      aria-label={label}
      onClick={handleCopy}
    >
      {isCopied ? <Check /> : <Copy />}
    </Button>
  );
}
