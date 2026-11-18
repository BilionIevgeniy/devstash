"use client";

import { useState } from "react";

import type { ItemDeleteHandler } from "@/features/items/_internal/components/delete/DeleteItemDialog";
import { ItemDrawerContent } from "@/features/items/_internal/components/drawer/ItemDrawerContent";
import { savedRowFields } from "@/features/items/domain/item-detail";
import type {
  DashboardItem,
  ItemDetailJson,
  OpenedItemJson,
} from "@/features/items/types";

interface ItemDetailViewProps {
  item: DashboardItem;
  detail: ItemDetailJson;
  /** Pro: the edit form offers the AI features. */
  canUseAi: boolean;
  /** Over the Free limit the edit form changes the collections only. */
  editMode: OpenedItemJson["editMode"];
  variant: "sheet" | "page";
  onDelete: ItemDeleteHandler;
  /** Whether the edit form holds unsaved edits (see ItemEditForm). */
  onDirtyChange?: (isDirty: boolean) => void;
}

// The item routes get the detail from the server, so there is no loading
// state. A save updates the header and the detail here at once; the action's
// refresh updates the cards behind and the server copy. The favorite and the
// pin come from the props: that refresh brings them, and this state would keep
// the old ones.
export function ItemDetailView({
  item: initialItem,
  detail: initialDetail,
  canUseAi,
  editMode,
  variant,
  onDelete,
  onDirtyChange,
}: ItemDetailViewProps) {
  const [item, setItem] = useState(initialItem);
  const [detail, setDetail] = useState(initialDetail);
  const [isEditing, setIsEditing] = useState(false);

  function handleSaved(saved: ItemDetailJson) {
    setItem((current) => ({ ...current, ...savedRowFields(saved) }));
    setDetail(saved);
    setIsEditing(false);
  }

  return (
    <ItemDrawerContent
      item={{
        ...item,
        isFavorite: initialItem.isFavorite,
        isPinned: initialItem.isPinned,
      }}
      state={{ status: "ready", detail, canUseAi, editMode }}
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
