import { useTranslations } from "next-intl";
import type { MouseEvent, ReactNode, RefObject } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

interface MobileDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** The button that opens it, which gets the focus back. */
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  children: ReactNode;
}

// The sidebar of a phone. The sheet has no trigger of its own, so Radix has
// nothing to give the focus back to.
export function MobileDrawer({
  isOpen,
  onOpenChange,
  returnFocusRef,
  children,
}: MobileDrawerProps) {
  const t = useTranslations("shell");

  // A link to the page already shown does not change the pathname, so a
  // click on any link closes the drawer too.
  function handleClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest("a[href]")) {
      onOpenChange(false);
    }
  }

  function handleCloseAutoFocus(event: Event) {
    event.preventDefault();
    returnFocusRef.current?.focus();
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="data-[side=left]:w-64 gap-0 p-0"
        showCloseButton={false}
        onClickCapture={handleClick}
        onCloseAutoFocus={handleCloseAutoFocus}
      >
        <SheetTitle className="sr-only">{t("navigation")}</SheetTitle>
        <SheetDescription className="sr-only">
          {t("navigationDescription")}
        </SheetDescription>
        {children}
      </SheetContent>
    </Sheet>
  );
}
