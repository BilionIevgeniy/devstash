import type { Prisma } from "@/generated/prisma/client";
import { DEMO_USER_EMAIL } from "@/lib/db/demo-user";
import { prisma } from "@/lib/prisma";
import type {
  CollectionStats,
  CollectionType,
  DashboardCollection,
  SidebarCollections,
} from "@/types/collections";

const DEFAULT_TYPE_ICON = "File";
const DASHBOARD_COLLECTIONS_LIMIT = 6;
const SIDEBAR_RECENT_LIMIT = 4;

const demoUserCollections = { user: { email: DEMO_USER_EMAIL } };

const collectionSelect = {
  id: true,
  name: true,
  description: true,
  isFavorite: true,
  _count: { select: { items: true } },
  items: { select: { item: { select: { typeId: true } } } },
} satisfies Prisma.CollectionSelect;

async function fetchTypesById(
  typeIds: string[],
): Promise<Map<string, CollectionType>> {
  const types = await prisma.itemType.findMany({
    where: { id: { in: typeIds } },
    select: { id: true, name: true, icon: true, color: true },
  });

  return new Map(
    types.map((type) => [
      type.id,
      {
        id: type.id,
        name: type.name,
        icon: type.icon ?? DEFAULT_TYPE_ICON,
        color: type.color ?? undefined,
      },
    ]),
  );
}

function rankTypesByUsage(
  typeIds: string[],
  typesById: Map<string, CollectionType>,
): CollectionType[] {
  const counts = new Map<string, number>();
  for (const id of typeIds) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const ranked: { type: CollectionType; count: number }[] = [];
  for (const [id, count] of counts) {
    const type = typesById.get(id);
    if (type) {
      ranked.push({ type, count });
    }
  }

  return ranked
    .sort((a, b) => b.count - a.count || a.type.name.localeCompare(b.type.name))
    .map(({ type }) => type);
}

async function fetchCollections(
  where: Prisma.CollectionWhereInput,
  take?: number,
): Promise<DashboardCollection[]> {
  const collections = await prisma.collection.findMany({
    where: { ...demoUserCollections, ...where },
    orderBy: { updatedAt: "desc" },
    take,
    select: collectionSelect,
  });

  const typeIds = new Set(
    collections.flatMap(({ items }) => items.map(({ item }) => item.typeId)),
  );
  const typesById = await fetchTypesById([...typeIds]);

  return collections.map(({ items, _count, ...collection }) => ({
    ...collection,
    itemCount: _count.items,
    types: rankTypesByUsage(
      items.map(({ item }) => item.typeId),
      typesById,
    ),
  }));
}

export function getRecentCollections(): Promise<DashboardCollection[]> {
  return fetchCollections({}, DASHBOARD_COLLECTIONS_LIMIT);
}

export async function getSidebarCollections(): Promise<SidebarCollections> {
  const [favorites, recent] = await Promise.all([
    fetchCollections({ isFavorite: true }),
    fetchCollections({}, SIDEBAR_RECENT_LIMIT),
  ]);
  return { favorites, recent };
}

export async function getCollectionStats(): Promise<CollectionStats> {
  const [total, favorites] = await Promise.all([
    prisma.collection.count({ where: demoUserCollections }),
    prisma.collection.count({
      where: { ...demoUserCollections, isFavorite: true },
    }),
  ]);
  return { total, favorites };
}
