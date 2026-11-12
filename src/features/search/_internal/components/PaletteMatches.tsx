import type { ReactNode } from "react";

import {
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";
import type { SearchableCollection } from "@/features/collections/types";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { LOCKED_LABEL } from "@/features/items/domain/item-fields";
import type { PaletteItem, PaletteResults } from "@/features/search/types";
import { cn } from "@/lib/utils";

export interface MatchHandlers {
  onSelectItem: (item: PaletteItem) => void;
  onSelectCollection: (collection: SearchableCollection) => void;
}

interface PaletteMatchesProps extends MatchHandlers {
  results: PaletteResults;
  /** Rows of an older text, shown while the next answer is on its way. */
  isStale: boolean;
  /** After the items: the "show more" row. */
  footer?: ReactNode;
}

export function PaletteMatches({
  results: { items, collections },
  isStale,
  footer,
  onSelectItem,
  onSelectCollection,
}: PaletteMatchesProps) {
  return (
    <>
      {items.length > 0 && (
        <CommandGroup heading="Items">
          {items.map((item) => (
            <CommandItem
              key={item.id}
              value={`item-${item.id}`}
              disabled={isStale}
              onSelect={() => onSelectItem(item)}
              className={cn(item.isLocked && "opacity-50")}
            >
              <TypeIcon
                name={item.type.icon}
                className="text-muted-foreground"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate">
                  {item.title}
                  {item.isLocked && (
                    <span className="sr-only">
                      : {LOCKED_LABEL.toLowerCase()}
                    </span>
                  )}
                </p>
                {item.preview && (
                  <p className="truncate text-xs text-muted-foreground">
                    {item.preview}
                  </p>
                )}
              </div>
            </CommandItem>
          ))}
          {footer}
        </CommandGroup>
      )}
      {collections.length > 0 && (
        <CommandGroup heading="Collections">
          {collections.map((collection) => (
            <CommandItem
              key={collection.id}
              value={`collection-${collection.id}`}
              disabled={isStale}
              onSelect={() => onSelectCollection(collection)}
            >
              <span className="min-w-0 flex-1 truncate">{collection.name}</span>
              <CommandShortcut className="tracking-normal">
                {collection.itemCount}{" "}
                {collection.itemCount === 1 ? "item" : "items"}
              </CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      )}
    </>
  );
}
