import "server-only";

import {
  toEditorPreferences,
  type EditorPreferences,
} from "@/features/editor/_internal/domain/preferences";
import { prisma } from "@/lib/prisma";

// Read by the app layout for every editor, including those in the top bar, which
// sits above (app)/error.tsx: a failed read gives the defaults, because an error
// there would replace the whole shell and lose an open form.
export async function getEditorPreferences(
  userId: string,
): Promise<EditorPreferences> {
  try {
    const stored = await prisma.userPreference.findUnique({
      where: { userId },
      select: {
        fontSize: true,
        tabSize: true,
        wordWrap: true,
        minimap: true,
        theme: true,
      },
    });
    return toEditorPreferences(stored);
  } catch (error) {
    console.error("Reading the editor preferences failed:", error);
    return toEditorPreferences(null);
  }
}
