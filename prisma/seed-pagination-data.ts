import type { SeedCollection, SeedItem } from "./seed-data";

// The same rows as the demo_pagination_data migration, which does nothing on a
// fresh database: it runs before the seed creates the demo user.
const PAGINATION_COLLECTION = "Pagination Test";
const DESCRIPTION = "Sample data for checking pagination";

// Older than the real demo content, so that content stays on top.
function daysBeforeNewYear(days: number): Date {
  return new Date(Date.UTC(2023, 11, 31 - days));
}

function sampleNumbers(amount: number): string[] {
  return Array.from({ length: amount }, (_, index) =>
    String(index + 1).padStart(2, "0"),
  );
}

function sampleItems(
  typeName: string,
  amount: number,
  language: string,
  content: (number: string) => string,
): SeedItem[] {
  return sampleNumbers(amount).map((number) => {
    const date = daysBeforeNewYear(Number(number));
    return {
      title: `Pagination sample ${typeName} ${number}`,
      contentType: "TEXT",
      content: content(number),
      description: DESCRIPTION,
      isFavorite: false,
      isPinned: false,
      language,
      typeName,
      collectionNames: [PAGINATION_COLLECTION],
      tags: [],
      createdAt: date,
      updatedAt: date,
    };
  });
}

export const paginationCollections: SeedCollection[] = [
  {
    name: PAGINATION_COLLECTION,
    description: DESCRIPTION,
    isFavorite: false,
    updatedAt: daysBeforeNewYear(0),
  },
  ...sampleNumbers(18).map((number) => ({
    name: `Pagination Sample Collection ${number}`,
    description: DESCRIPTION,
    isFavorite: false,
    updatedAt: daysBeforeNewYear(Number(number)),
  })),
];

export const paginationItems: SeedItem[] = [
  ...sampleItems(
    "snippet",
    50,
    "typescript",
    (number) => `export const sample${number} = true;`,
  ),
  ...sampleItems(
    "command",
    24,
    "bash",
    (number) => `echo "pagination sample ${number}"`,
  ),
];
