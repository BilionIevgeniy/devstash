import { useRef } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ItemDrawerProvider } from "@/features/items/components/ItemDrawerProvider";
import { PaletteResults } from "@/features/search/_internal/components/PaletteResults";
import type { SearchIndexState } from "@/features/search/_internal/components/hooks/use-search-index";

interface PaletteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  indexState: SearchIndexState;
  /** The dialog has no Radix trigger, so it hands the focus back here. */
  onReturnFocus: () => void;
}

// The palette and the drawer it opens. The provider is its own, not the page's:
// it gives every page the same drawer, and it sits inside this lazy file so the
// drawer's code stays out of the shell's bundle. It stays mounted while closed,
// so the drawer outlives the palette.
export function PaletteDialog({
  isOpen,
  onClose,
  indexState,
  onReturnFocus,
}: PaletteDialogProps) {
  const drawerHasFocusRef = useRef(false);

  function handlePaletteCloseAutoFocus(event: Event) {
    event.preventDefault();
    if (drawerHasFocusRef.current) {
      drawerHasFocusRef.current = false;
      return;
    }
    onReturnFocus();
  }

  function handleDrawerCloseAutoFocus(event: Event) {
    event.preventDefault();
    onReturnFocus();
  }

  return (
    <ItemDrawerProvider onSheetCloseAutoFocus={handleDrawerCloseAutoFocus}>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          showCloseButton={false}
          className="top-1/3 translate-y-0 overflow-hidden rounded-xl! p-0 sm:max-w-xl"
          onCloseAutoFocus={handlePaletteCloseAutoFocus}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Search</DialogTitle>
            <DialogDescription>
              Search your items and collections
            </DialogDescription>
          </DialogHeader>
          <PaletteResults
            indexState={indexState}
            onClose={onClose}
            onDrawerOpen={() => {
              drawerHasFocusRef.current = true;
            }}
          />
        </DialogContent>
      </Dialog>
    </ItemDrawerProvider>
  );
}
