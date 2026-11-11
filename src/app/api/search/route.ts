import { auth } from "@/features/auth/nextauth/auth";
import { getSearchIndex } from "@/features/search/services/search-index";
import { logger } from "@/lib/logger";

// A user's own content: never kept by a shared cache.
const NO_STORE = { "Cache-Control": "private, no-store" };

function failure(error: string, status: number) {
  return Response.json(
    { success: false, data: null, error },
    { status, headers: NO_STORE },
  );
}

// The index of the command palette, which searches it in the browser. Answers
// 401 instead of redirecting to sign-in: the palette calls this with fetch and
// expects JSON back.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return failure("Unauthorized", 401);

  try {
    const index = await getSearchIndex(userId);
    return Response.json(
      { success: true, data: index, error: null },
      { headers: NO_STORE },
    );
  } catch (error) {
    await logger.error("Search index failed", { error, userId });
    return failure("Something went wrong", 500);
  }
}
