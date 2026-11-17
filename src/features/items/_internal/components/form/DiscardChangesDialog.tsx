"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DiscardChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
}

// Asked before unsaved edits of an item are thrown away. Keep editing returns
// focus to where it was; Discard leaves focus to what closes next (the sheet
// returns it to its trigger), so it does not land on a vanishing field.
export function DiscardChangesDialog({
  open,
  onOpenChange,
  onDiscard,
}: DiscardChangesDialogProps) {
  const t = useTranslations();
  const discardedRef = useRef(false);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          if (!discardedRef.current) return;
          discardedRef.current = false;
          event.preventDefault();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{t("items.discard.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("items.discard.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {t("common.actions.keepEditing")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              discardedRef.current = true;
              onDiscard();
            }}
          >
            {t("common.actions.discard")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
