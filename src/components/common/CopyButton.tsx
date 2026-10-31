"use client";

import { useState } from "react";
import { Check, Copy, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const COPIED_RESET_MS = 2000;
const COPIED_MESSAGE = "Copied to clipboard";
const COPY_FAILED_MESSAGE = "Couldn't copy to the clipboard";

type CopySource =
  /** The text the button puts on the clipboard. */
  | { value: string; getValue?: never }
  /** Reads the text on click, for a value the page does not hold. */
  | { getValue: () => Promise<string>; value?: never };

type CopyButtonProps = CopySource & {
  label: string;
  /** The size and color of the button, merged over the defaults. */
  className?: string;
};

// The write starts inside the click, so Safari keeps the user gesture while
// the text is still on its way. ClipboardItem takes a promise of a Blob in
// every current browser; a browser without it gets writeText once the text
// has arrived, reusing the same request.
async function writeLater(text: Promise<string>): Promise<void> {
  if (typeof ClipboardItem !== "undefined") {
    try {
      const blob = text.then(
        (value) => new Blob([value], { type: "text/plain" }),
      );
      await navigator.clipboard.write([
        new ClipboardItem({ "text/plain": blob }),
      ]);
      return;
    } catch {
      // Falls through to writeText, which rethrows if the text itself failed.
    }
  }
  await navigator.clipboard.writeText(await text);
}

// An icon button that copies a text, shows a check for a moment and confirms
// with a toast. With getValue it is disabled while the text is read.
export function CopyButton({
  value,
  getValue,
  label,
  className,
}: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  async function handleCopy() {
    setIsCopying(true);
    try {
      if (getValue) await writeLater(getValue());
      else await navigator.clipboard.writeText(value);
      setIsCopied(true);
      toast.success(COPIED_MESSAGE);
      setTimeout(() => setIsCopied(false), COPIED_RESET_MS);
    } catch {
      toast.error(COPY_FAILED_MESSAGE);
    } finally {
      setIsCopying(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      aria-label={label}
      aria-busy={isCopying}
      disabled={isCopying}
      onClick={handleCopy}
    >
      {isCopying ? (
        <Loader2Icon className="animate-spin" />
      ) : isCopied ? (
        <Check />
      ) : (
        <Copy />
      )}
    </Button>
  );
}
