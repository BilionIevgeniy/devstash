import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Command, CommandInput, CommandList } from "@/components/ui/command";
import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";
import type { SearchableCollection } from "@/features/collections/types";
import { useItemDrawer } from "@/features/items/components/hooks/use-item-drawer";
import { usePaletteSearch } from "@/features/search/_internal/components/hooks/use-palette-search";
import { PaletteBody } from "@/features/search/_internal/components/PaletteBody";
import { isItemPage } from "@/features/search/domain/item-page";
import type { PaletteItem } from "@/features/search/types";

interface PaletteResultsProps {
  onClose: () => void;
  /** Called when the drawer takes over, so closing does not move the focus. */
  onDrawerOpen: () => void;
}

// Holds the query and the search, so both start fresh each time the palette
// opens: the dialog unmounts this when it closes.
export function PaletteResults({ onClose, onDrawerOpen }: PaletteResultsProps) {
  const [query, setQuery] = useState("");
  const search = usePaletteSearch(query);
  const pathname = usePathname();
  const router = useRouter();
  const drawer = useItemDrawer();

  function selectItem(item: PaletteItem) {
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
        <PaletteBody
          search={search}
          onSelectItem={selectItem}
          onSelectCollection={selectCollection}
        />
      </CommandList>
    </Command>
  );
}
