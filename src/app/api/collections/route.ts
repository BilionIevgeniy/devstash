import { auth } from "@/features/auth/nextauth/auth";
import { getCollectionOptions } from "@/features/collections/queries";

// A user's own content: never kept by a shared cache.
const NO_STORE = { "Cache-Control": "private, no-store" };

function failure(error: string, status: number) {
  return Response.json(
    { success: false, data: null, error },
    { status, headers: NO_STORE },
  );
}

// The options of the item forms' Collections input, which read this JSON as
// ItemCollectionRef (ADR 0008). Answers 401 instead of redirecting to sign-in:
// the forms call this with fetch and expect JSON back.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return failure("Unauthorized", 401);

  try {
    const collections = await getCollectionOptions(userId);
    return Response.json(
      { success: true, data: collections, error: null },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error("Collection options failed:", error);
    return failure("Something went wrong", 500);
  }
}
