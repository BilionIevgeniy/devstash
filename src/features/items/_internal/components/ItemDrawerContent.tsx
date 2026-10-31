import { Tag } from "lucide-react";

import type { ItemDeleteHandler } from "@/features/items/_internal/components/DeleteItemDialog";
import { DrawerSection } from "@/features/items/_internal/components/DrawerSection";
import { ItemActionBar } from "@/features/items/_internal/components/ItemActionBar";
import { ItemBody } from "@/features/items/_internal/components/ItemBody";
import { ItemDrawerHeader } from "@/features/items/_internal/components/ItemDrawerHeader";
import { ItemDrawerSkeleton } from "@/features/items/_internal/components/ItemDrawerSkeleton";
import { ItemEditForm } from "@/features/items/_internal/components/ItemEditForm";
import { ItemMeta } from "@/features/items/_internal/components/ItemMeta";
import type { ItemDetailState } from "@/features/items/_internal/components/hooks/use-item-sheet";
import type { DashboardItem, ItemDetailJson } from "@/features/items/types";

interface ItemDrawerContentProps {
  item: DashboardItem;
  state: ItemDetailState;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaved: (detail: ItemDetailJson) => void;
  onDelete: ItemDeleteHandler;
  /** Whether the edit form holds unsaved edits (see ItemEditForm). */
  onDirtyChange?: (isDirty: boolean) => void;
  /** "page" renders outside a Sheet, where SheetTitle cannot be used. */
  variant?: "sheet" | "page";
}

// The header and tags come from the card the user clicked, so they show at
// once; the rest waits for GET /api/items/[id]. On the item routes the server
// passes the detail in, so the state starts ready.
export function ItemDrawerContent({
  item,
  state,
  isEditing,
  onEdit,
  onCancelEdit,
  onSaved,
  onDelete,
  onDirtyChange,
  variant = "sheet",
}: ItemDrawerContentProps) {
  const detail = state.status === "ready" ? state.detail : null;

  if (isEditing && detail) {
    return (
      <>
        <ItemDrawerHeader
          item={item}
          language={detail.language}
          variant={variant}
        />
        <ItemEditForm
          item={item}
          detail={detail}
          onCancel={onCancelEdit}
          onSaved={onSaved}
          onDirtyChange={onDirtyChange}
        >
          <ItemMeta detail={detail} />
        </ItemEditForm>
      </>
    );
  }

  return (
    <>
      <ItemDrawerHeader
        item={item}
        language={detail?.language ?? null}
        variant={variant}
      />
      <ItemActionBar
        itemId={item.id}
        title={item.title}
        isFavorite={item.isFavorite}
        isPinned={item.isPinned}
        canEdit={detail !== null}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
        {item.description && (
          <DrawerSection title="Description">
            <p>{item.description}</p>
          </DrawerSection>
        )}
        {state.status === "loading" && (
          <ItemDrawerSkeleton typeName={item.type.name} />
        )}
        {state.status === "error" && (
          <p className="text-destructive">Couldn&apos;t load this item.</p>
        )}
        {detail && <ItemBody typeName={item.type.name} detail={detail} />}
        {item.tags.length > 0 && (
          <DrawerSection title="Tags" icon={Tag}>
            <ul className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </DrawerSection>
        )}
        {detail && <ItemMeta detail={detail} />}
      </div>
    </>
  );
}
