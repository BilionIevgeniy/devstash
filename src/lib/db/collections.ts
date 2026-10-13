import { cache } from "react";

import { DEMO_USER_EMAIL } from "@/lib/db/demo-user";
import { prisma } from "@/lib/prisma";
import type {
  CollectionStats,
  CollectionType,
  DashboardCollection,
} from "@/types/collections";

const DEFAULT_TYPE_ICON = "File";

const demoUserCollections = { user: { email: DEMO_USER_EMAIL } };

interface RawItemType {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

function rankTypesByUsage(itemTypes: RawItemType[]): CollectionType[] {
  const usage = new Map<string, { type: RawItemType; count: number }>();
  for (const type of itemTypes) {
    const entry = usage.get(type.id);
    if (entry) {
      entry.count += 1;
    } else {
      usage.set(type.id, { type, count: 1 });
    }
  }

  return [...usage.values()]
    .sort((a, b) => b.count - a.count || a.type.name.localeCompare(b.type.name))
    .map(({ type }) => ({
      id: type.id,
      name: type.name,
      icon: type.icon ?? DEFAULT_TYPE_ICON,
      color: type.color ?? undefined,
    }));
}

async function fetchRecentCollections(): Promise<DashboardCollection[]> {
  const collections = await prisma.collection.findMany({
    where: demoUserCollections,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      isFavorite: true,
      items: {
        select: {
          item: {
            select: {
              type: {
                select: { id: true, name: true, icon: true, color: true },
              },
            },
          },
        },
      },
    },
  });

  return collections.map(({ items, ...collection }) => ({
    ...collection,
    itemCount: items.length,
    types: rankTypesByUsage(items.map(({ item }) => item.type)),
  }));
}

// The layout (sidebar) and the page both read this; cache() shares one query per request.
export const getRecentCollections = cache(fetchRecentCollections);

export async function getCollectionStats(): Promise<CollectionStats> {
  const [total, favorites] = await Promise.all([
    prisma.collection.count({ where: demoUserCollections }),
    prisma.collection.count({
      where: { ...demoUserCollections, isFavorite: true },
    }),
  ]);
  return { total, favorites };
}
