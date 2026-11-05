"use client";

import { useState } from "react";
import { FilePlus, FolderPlus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateCollectionDialog } from "@/features/collections/components/CreateCollectionDialog";
import { CreateItemDialog } from "@/features/items/components/CreateItemDialog";

type CreateDialog = "item" | "collection";

interface CreateMenuProps {
  /** From getEntitlements on the server, for the item dialog. */
  isPro: boolean;
}

// The top bar's two create buttons in one, for a phone. The dialogs have no
// trigger of their own here, so they hand the focus back to the +.
export function CreateMenu({ isPro }: CreateMenuProps) {
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const [openDialog, setOpenDialog] = useState<CreateDialog | null>(null);

  function dialogState(name: CreateDialog) {
    return {
      open: openDialog === name,
      onOpenChange: (open: boolean) => setOpenDialog(open ? name : null),
      returnFocus: () => trigger?.focus(),
    };
  }

  // The dialog that opened takes the focus; the menu must not pull it back.
  function handleMenuCloseAutoFocus(event: Event) {
    if (openDialog) event.preventDefault();
  }

  return (
    <>
      {/* Not modal: a modal menu and the dialog it opens would both lock the page. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            ref={setTrigger}
            type="button"
            size="icon"
            aria-label="Create"
          >
            <Plus />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-auto"
          onCloseAutoFocus={handleMenuCloseAutoFocus}
        >
          <DropdownMenuItem onSelect={() => setOpenDialog("item")}>
            <FilePlus />
            New item
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setOpenDialog("collection")}>
            <FolderPlus />
            New collection
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateItemDialog isPro={isPro} controlled={dialogState("item")} />
      <CreateCollectionDialog controlled={dialogState("collection")} />
    </>
  );
}
