"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { typePagePath } from "@/features/item-types/domain/item-type";
import { ItemDrawerProvider } from "@/features/items/components/drawer/ItemDrawerProvider";

// The type comes from the URL in the browser: a layout that awaited its params
// would hold the navigation before its loading.tsx (instant validation,
// e2e/instant.spec.ts).
export function TypeDrawerProvider({ children }: { children: ReactNode }) {
  const { type } = useParams<{ type: string }>();
  return (
    <ItemDrawerProvider basePath={typePagePath(type)}>
      {children}
    </ItemDrawerProvider>
  );
}
