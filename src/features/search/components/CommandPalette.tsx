"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePaletteHotkey } from "@/features/search/_internal/components/hooks/use-palette-hotkey";

// Always rendered, so its chunk loads after hydration and the first Cmd+K shows
// at once; the top bar is on every page and most of them have no drawer code.
const PaletteDialog = dynamic(
  () =>
    import("@/features/search/_internal/components/PaletteDialog").then(
      (mod) => mod.PaletteDialog,
    ),
  { ssr: false },
);

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const [openPathname, setOpenPathname] = useState(pathname);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Back or Forward changes the page under the palette, so it closes, adjusted
  // during render as the shell's mobile drawer does.
  if (pathname !== openPathname) {
    setOpenPathname(pathname);
    setIsOpen(false);
  }

  function open() {
    const active = document.activeElement;
    returnFocusRef.current =
      active instanceof HTMLElement && active !== document.body ? active : null;
    setIsOpen(true);
  }

  function toggle() {
    if (isOpen) setIsOpen(false);
    else open();
  }

  // The element may be gone by now, after a navigation.
  function returnFocus() {
    const target = returnFocusRef.current;
    if (target?.isConnected) target.focus();
    else triggerRef.current?.focus();
  }

  usePaletteHotkey(isOpen, toggle);

  return (
    <>
      <Button
        ref={triggerRef}
        variant="outline"
        aria-haspopup="dialog"
        aria-label="Search items and collections"
        className="w-full min-w-0 max-w-md shrink justify-start font-normal text-muted-foreground"
        onClick={open}
      >
        <Search />
        <span className="truncate">Search items and collections...</span>
        <kbd className="ml-auto hidden rounded border px-1.5 text-xs sm:inline">
          ⌘K
        </kbd>
      </Button>
      <PaletteDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onReturnFocus={returnFocus}
      />
    </>
  );
}
