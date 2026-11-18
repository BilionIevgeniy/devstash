"use client";

import { CustomTypesSection } from "@/features/item-types/components/CustomTypesSection";
import type { CustomTypeRow } from "@/features/item-types/types";
import { useSyncItemQueries } from "@/features/items/components/hooks/use-item-queries";

interface CustomTypesSettingsProps {
  types: CustomTypeRow[];
  isPro: boolean;
}

// item-types sits below items, so the cache sync of items is handed to its
// section from here: a rename or a new colour shows in every cached item.
export function CustomTypesSettings({
  types,
  isPro,
}: CustomTypesSettingsProps) {
  const syncItems = useSyncItemQueries();
  return (
    <CustomTypesSection
      types={types}
      isPro={isPro}
      sync={() => syncItems({ kind: "types" })}
    />
  );
}
