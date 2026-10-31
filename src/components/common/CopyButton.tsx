"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const COPIED_RESET_MS = 2000;
const COPIED_MESSAGE = "Copied to clipboard";
const COPY_FAILED_MESSAGE = "Couldn't copy to the clipboard";

interface CopyButtonProps {
  /** The text the button puts on the clipboard. */
  value: string;
  label: string;
  /** The size and color of the button, merged over the defaults. */
  className?: string;
}

// An icon button that copies a text, shows a check for a moment and confirms
// with a toast.
export function CopyButton({ value, label, className }: CopyButtonProps) {
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
      className={className}
      aria-label={label}
      onClick={handleCopy}
    >
      {isCopied ? <Check /> : <Copy />}
    </Button>
  );
}
