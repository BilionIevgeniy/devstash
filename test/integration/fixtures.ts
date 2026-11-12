import bcrypt from "bcryptjs";
import { vi } from "vitest";
import { resetTestDatabase } from "../../scripts/test-database";
import {
  createUserCollection,
  setUserCollectionFavorite,
} from "@/features/collections/services/collection";
// The test harness may reach into a feature's `_internal/`: it seeds data the
// way the app does, through the services. Not a precedent for `src/`.
import { saveEditorPreferences } from "@/features/editor/_internal/services/preferences";
import { createItemSchema } from "@/features/items/schemas";
import { createUserItem } from "@/features/items/services/create-item";
import {
  setUserItemFavorite,
  setUserItemPin,
} from "@/features/items/services/item";
import { headObject } from "@/lib/r2";
import { prisma } from "@/lib/prisma";

// Two users with the same shape of data, made through the services:
// A on the Free plan, B on Pro. Every cross-user test reads or writes with A
// and B's ids, after checking that B itself sees the row (a wrong fixture id
// must not pass as "not found").

// A and B differ in every field a read by the wrong id would return: their
// passwords, their session versions, their data.
export const PASSWORD_OF_A = "password-of-tenant-a";
export const PASSWORD_OF_B = "password-of-tenant-b";

// Low cost on purpose: only the tests read this hash.
const TEST_BCRYPT_ROUNDS = 4;

export interface Tenant {
  userId: string;
  email: string;
  items: { snippet: string; note: string; link: string; file: string | null };
  collections: { main: string; favorite: string };
}

export interface Tenants {
  a: Tenant;
  b: Tenant;
}

function expectSuccess(result: { success: boolean; error: string | null }) {
  if (!result.success) throw new Error(`Fixture step failed: ${result.error}`);
}

// Also for a test file that needs rows of its own on top of the seed.
export async function createItem(
  userId: string,
  input: object,
): Promise<string> {
  const parsed = createItemSchema.parse({
    tags: [],
    collectionIds: [],
    ...input,
  });
  const result = await createUserItem(userId, parsed);
  if (!result.success || !result.data) {
    throw new Error(`Fixture item failed: ${result.error}`);
  }
  return result.data.id;
}

// createUserCollection returns no id, so the fixture looks it up by name.
async function createCollection(userId: string, name: string): Promise<string> {
  expectSuccess(
    await createUserCollection(userId, { name, description: null }),
  );
  const { id } = await prisma.collection.findFirstOrThrow({
    where: { userId, name },
    select: { id: true },
  });
  return id;
}

async function createFileItem(userId: string): Promise<string> {
  vi.mocked(headObject).mockResolvedValueOnce({
    size: 1024,
    contentType: "application/pdf",
  });
  return createItem(userId, {
    typeName: "file",
    title: "Spec",
    file: { key: `users/${userId}/spec-${userId}.pdf`, name: "spec.pdf" },
  });
}

async function seedTenant(
  userId: string,
  withFile: boolean,
): Promise<Omit<Tenant, "email">> {
  const main = await createCollection(userId, "React Patterns");
  const favorite = await createCollection(userId, "Favorites");
  expectSuccess(await setUserCollectionFavorite(userId, favorite, true));

  const snippet = await createItem(userId, {
    typeName: "snippet",
    title: "useDebounce",
    content: "export function useDebounce() {}",
    language: "typescript",
    tags: ["react", "shared"],
    collectionIds: [main],
  });
  const note = await createItem(userId, {
    typeName: "note",
    title: "Meeting notes",
    content: "Notes",
    tags: ["shared"],
  });
  const link = await createItem(userId, {
    typeName: "link",
    title: "Docs",
    url: "https://example.com/docs",
  });
  expectSuccess(await setUserItemFavorite(userId, note, true));
  expectSuccess(await setUserItemPin(userId, snippet, true));
  expectSuccess(
    await saveEditorPreferences(userId, {
      fontSize: 14,
      tabSize: 2,
      wordWrap: true,
      minimap: false,
      theme: "vs-dark",
    }),
  );

  const file = withFile ? await createFileItem(userId) : null;
  return {
    userId,
    items: { snippet, note, link, file },
    collections: { main, favorite },
  };
}

// B also gets rows that only a missing `userId` or `identifier` in someone
// else's cleanup would touch: a tag no item uses and a verification token.
async function seedCleanupTargets(tenant: Tenant): Promise<void> {
  await prisma.tag.create({ data: { userId: tenant.userId, name: "orphan" } });
  await prisma.verificationToken.create({
    data: {
      identifier: tenant.email,
      token: `token-${tenant.userId}`,
      expires: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
}

async function withCredentials(
  seeded: Omit<Tenant, "email">,
  password: string,
  sessionVersion: number,
): Promise<Tenant> {
  const { email } = await prisma.user.update({
    where: { id: seeded.userId },
    data: {
      password: await bcrypt.hash(password, TEST_BCRYPT_ROUNDS),
      sessionVersion,
    },
    select: { email: true },
  });
  return { ...seeded, email };
}

// Empties the database and seeds both tenants. Called in `beforeEach` by a
// file whose tests write, in `beforeAll` by one that only reads.
export async function seedTenants(): Promise<Tenants> {
  const { freeUserId, proUserId } = await resetTestDatabase(prisma);
  const a = await withCredentials(
    await seedTenant(freeUserId, false),
    PASSWORD_OF_A,
    0,
  );
  const b = await withCredentials(
    await seedTenant(proUserId, true),
    PASSWORD_OF_B,
    1,
  );
  await seedCleanupTargets(b);
  return { a, b };
}

export async function systemTypeId(name: string): Promise<string> {
  const { id } = await prisma.itemType.findFirstOrThrow({
    where: { name, isSystem: true },
    select: { id: true },
  });
  return id;
}

export function idsOf(rows: { id: string }[]): string[] {
  return rows.map((row) => row.id);
}

export function allItemIds(tenant: Tenant): string[] {
  return Object.values(tenant.items).filter((id): id is string => id !== null);
}

// For an id the fixture may leave null (B's file): a missing one throws, so it
// can never pass as "not found".
export function required(id: string | null): string {
  if (id === null) throw new Error("The fixture did not create this row");
  return id;
}
