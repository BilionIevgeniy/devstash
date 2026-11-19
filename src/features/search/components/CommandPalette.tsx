"use client";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("search");
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
      {/* The ⌘K hint sits beside the button, not in it: the button's name is
          its visible label, and a hint inside would be part of that label
          (WCAG 2.5.3, Label in Name). aria-keyshortcuts says it instead. */}
      <div className="relative lg:w-full lg:max-w-md lg:min-w-0 lg:shrink">
        <Button
          ref={triggerRef}
          variant="outline"
          aria-haspopup="dialog"
          aria-keyshortcuts="Meta+K Control+K"
          aria-label={t("placeholder")}
          className="size-8 justify-center border-red-500 font-normal dark:border-red-500 text-muted-foreground lg:w-full lg:justify-start lg:pr-12"
          onClick={open}
        >
          <Search />
          {/* Icon-only below lg: beside an open sidebar at 768px the field had
              room for a few letters of its placeholder. The label stays. */}
          <span className="hidden truncate lg:inline">{t("placeholder")}</span>
        </Button>
        <kbd
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border px-1.5 text-xs text-muted-foreground lg:inline"
        >
          ⌘K
        </kbd>
      </div>
      <PaletteDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onReturnFocus={returnFocus}
      />
    </>
  );
}
