import type { PrismaClient } from "../src/generated/prisma/client";
import { createVerifiedTestUser } from "./test-database";

// The user of the screenshots and the accessibility scans (e2e/visual.spec.ts,
// e2e/a11y.spec.ts): fixed titles, content and dates, and nothing writes to
// it, so a page looks the same in every run. The dates are in a past year, so
// their format never changes with the clock. Its email follows the run's, so
// the sidebar's user area is masked in the screenshots.
export const VISUAL_USER_NAME = "Visual Tester";
export const VISUAL_DRAWER_ITEM = "Release checklist";

interface VisualItem {
  type: string;
  title: string;
  content?: string;
  url?: string;
  language?: string;
  description?: string;
  isFavorite?: boolean;
  isPinned?: boolean;
  collection?: "React Patterns" | "Ops";
}

const ITEMS: VisualItem[] = [
  {
    type: "snippet",
    title: "useDebounce hook",
    language: "typescript",
    description: "Waits until the value has stopped changing.",
    content:
      "export function useDebounce<T>(value: T, delay = 300): T {\n  const [debounced, setDebounced] = useState(value);\n  useEffect(() => {\n    const id = setTimeout(() => setDebounced(value), delay);\n    return () => clearTimeout(id);\n  }, [value, delay]);\n  return debounced;\n}",
    isFavorite: true,
    isPinned: true,
    collection: "React Patterns",
  },
  {
    type: "prompt",
    title: "Code review prompt",
    description: "A review that names the risk first.",
    content:
      "Review this diff. List bugs first, then security issues, then style.",
  },
  {
    type: "command",
    title: "Reset a branch",
    content: "git fetch origin && git reset --hard origin/main",
    collection: "Ops",
  },
  {
    type: "note",
    title: VISUAL_DRAWER_ITEM,
    description: "What a release needs before it ships.",
    content:
      "## Before the release\n\n- Run the tests\n- Read the diff\n- Write the changelog",
    isFavorite: true,
  },
  {
    type: "link",
    title: "Next.js docs",
    url: "https://nextjs.org/docs",
    description: "The framework's reference.",
  },
  {
    type: "snippet",
    title: "Fetch with retry",
    language: "typescript",
    content:
      "async function fetchWithRetry(url: string, tries = 3) {\n  for (let i = 0; i < tries; i++) {\n    const response = await fetch(url);\n    if (response.ok) return response;\n  }\n  throw new Error(`Failed: ${url}`);\n}",
    collection: "React Patterns",
  },
];

// One hour apart in 2025, newest last.
const START = Date.UTC(2025, 2, 3, 9, 0);
const HOUR_MS = 60 * 60 * 1000;

export async function seedVisualUser(
  prisma: PrismaClient,
  email: string,
  passwordHash: string,
): Promise<void> {
  const userId = await createVerifiedTestUser(prisma, { email, passwordHash });
  await prisma.user.update({
    where: { id: userId },
    data: { name: VISUAL_USER_NAME },
  });
  const types = await prisma.itemType.findMany({
    where: { isSystem: true },
    select: { id: true, name: true },
  });
  const typeId = (name: string) =>
    types.find((type) => type.name === name)?.id ?? "";
  const collections = new Map<string, string>();
  for (const name of ["React Patterns", "Ops"] as const) {
    const created = await prisma.collection.create({
      data: { userId, name, description: `${name} of the visual user` },
      select: { id: true },
    });
    collections.set(name, created.id);
  }

  for (const [index, item] of ITEMS.entries()) {
    const at = new Date(START + index * HOUR_MS);
    const collectionId = item.collection && collections.get(item.collection);
    await prisma.item.create({
      data: {
        userId,
        typeId: typeId(item.type),
        contentType: item.url ? "URL" : "TEXT",
        title: item.title,
        content: item.content ?? null,
        url: item.url ?? null,
        language: item.language ?? null,
        description: item.description ?? null,
        isFavorite: item.isFavorite ?? false,
        favoritedAt: item.isFavorite ? at : null,
        isPinned: item.isPinned ?? false,
        createdAt: at,
        updatedAt: at,
        ...(collectionId && {
          collections: { create: { collectionId, addedAt: at } },
        }),
      },
    });
  }
}
