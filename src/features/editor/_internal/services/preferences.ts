import "server-only";

import type { EditorPreferencesInput } from "@/features/editor/schemas";
import { ok, type OperationResult } from "@/lib/action-result";
import { prisma } from "@/lib/prisma";

export async function saveEditorPreferences(
  userId: string,
  input: EditorPreferencesInput,
): Promise<OperationResult> {
  await prisma.userPreference.upsert({
    where: { userId },
    create: { userId, ...input },
    update: input,
  });
  return ok();
}
