"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { ItemDeleteHandler } from "@/features/items/_internal/components/DeleteItemDialog";
import { ItemDrawerContent } from "@/features/items/_internal/components/ItemDrawerContent";
import type { DashboardItem, ItemDetailJson } from "@/features/items/types";

interface ItemDetailViewProps {
  item: DashboardItem;
  detail: ItemDetailJson;
  variant: "sheet" | "page";
  onDelete: ItemDeleteHandler;
  /** Whether the edit form holds unsaved edits (see ItemEditForm). */
  onDirtyChange?: (isDirty: boolean) => void;
}

// The item routes get the detail from the server, so there is no loading
// state. A save updates the header and the detail here at once; the refresh
// updates the cards behind and the server copy.
export function ItemDetailView({
  item: initialItem,
  detail: initialDetail,
  variant,
  onDelete,
  onDirtyChange,
}: ItemDetailViewProps) {
  const [item, setItem] = useState(initialItem);
  const [detail, setDetail] = useState(initialDetail);
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  function handleSaved(saved: ItemDetailJson) {
    router.refresh();
    setItem((current) => ({
      ...current,
      title: saved.title,
      description: saved.description,
      tags: saved.tags,
    }));
    setDetail(saved);
    setIsEditing(false);
  }

  return (
    <ItemDrawerContent
      item={item}
      state={{ status: "ready", detail }}
      isEditing={isEditing}
      onEdit={() => setIsEditing(true)}
      onCancelEdit={() => setIsEditing(false)}
      onSaved={handleSaved}
      onDelete={onDelete}
      onDirtyChange={onDirtyChange}
      variant={variant}
    />
  );
}
