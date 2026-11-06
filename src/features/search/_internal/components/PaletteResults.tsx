import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";
import type { SearchableCollection } from "@/features/collections/types";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { useItemDrawer } from "@/features/items/components/hooks/use-item-drawer";
import { LOCKED_LABEL } from "@/features/items/domain/item-fields";
import {
  createPaletteSearch,
  type PaletteSearch,
} from "@/features/search/_internal/components/fuzzy-search";
import type { SearchIndexState } from "@/features/search/_internal/components/hooks/use-search-index";
import { isItemPage } from "@/features/search/domain/item-page";
import type { IndexedItem, SearchIndex } from "@/features/search/types";
import { cn } from "@/lib/utils";

const LOADING_ROWS = [0, 1, 2, 3, 4];

interface PaletteResultsProps {
  indexState: SearchIndexState;
  onClose: () => void;
  /** Called when the drawer takes over, so closing does not move the focus. */
  onDrawerOpen: () => void;
}

interface MatchHandlers {
  query: string;
  onSelectItem: (item: IndexedItem) => void;
  onSelectCollection: (collection: SearchableCollection) => void;
}

interface PaletteMatchesProps extends MatchHandlers {
  search: PaletteSearch;
}

interface IndexedMatchesProps extends MatchHandlers {
  index: SearchIndex;
}

function PaletteMatches({
  search,
  query,
  onSelectItem,
  onSelectCollection,
}: PaletteMatchesProps) {
  const { items, collections } = search(query);

  return (
    <>
      <CommandEmpty>No results found.</CommandEmpty>
      {items.length > 0 && (
        <CommandGroup heading="Items">
          {items.map((item) => (
            <CommandItem
              key={item.id}
              value={`item-${item.id}`}
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
        </CommandGroup>
      )}
      {collections.length > 0 && (
        <CommandGroup heading="Collections">
          {collections.map((collection) => (
            <CommandItem
              key={collection.id}
              value={`collection-${collection.id}`}
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

// A component of its own so the compiler memoizes the search on the index: built
// and called in one component, it would be built again for every query.
function IndexedMatches({ index, ...matches }: IndexedMatchesProps) {
  const search = createPaletteSearch(index);
  return <PaletteMatches search={search} {...matches} />;
}

function PaletteLoading() {
  return (
    <div className="space-y-1 p-1" role="status" aria-label="Loading search">
      {LOADING_ROWS.map((row) => (
        <Skeleton key={row} className="h-11 w-full rounded-lg" />
      ))}
    </div>
  );
}

// Holds the query, so it is empty again each time the palette opens: the dialog
// unmounts this when it closes.
export function PaletteResults({
  indexState,
  onClose,
  onDrawerOpen,
}: PaletteResultsProps) {
  const [query, setQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const drawer = useItemDrawer();

  function selectItem(item: IndexedItem) {
    if (item.isLocked) {
      onClose();
      router.push(UPGRADE_PATH);
      return;
    }
    if (!isItemPage(pathname, item)) {
      onDrawerOpen();
      drawer.open(item);
    }
    onClose();
  }

  function selectCollection({ id }: SearchableCollection) {
    onClose();
    router.push(`/collections/${id}`);
  }

  return (
    <Command label="Search" shouldFilter={false}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search items and collections..."
      />
      <CommandList className="h-72">
        {indexState.status === "loading" && <PaletteLoading />}
        {indexState.status === "error" && (
          <p className="py-6 text-center text-sm text-destructive">
            Couldn&apos;t load search. Close this and try again.
          </p>
        )}
        {indexState.status === "ready" && (
          <IndexedMatches
            index={indexState.index}
            query={query}
            onSelectItem={selectItem}
            onSelectCollection={selectCollection}
          />
        )}
      </CommandList>
    </Command>
  );
}
