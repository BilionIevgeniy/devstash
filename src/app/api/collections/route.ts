import { getSignedInUserId } from "@/features/auth/nextauth/session";
import { getCollectionOptions } from "@/features/collections/queries";
import { jsonError, jsonOk, SERVER_ERROR_MESSAGE } from "@/lib/api-response";
import { logger } from "@/lib/logger";

// The options of the item forms' Collections input, which read this JSON as
// ItemCollectionRef (ADR 0008). Answers 401 instead of redirecting to sign-in:
// the forms call this with fetch and expect JSON back.
export async function GET() {
  const userId = await getSignedInUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    const collections = await getCollectionOptions(userId);
    return jsonOk(collections);
  } catch (error) {
    await logger.error("Collection options failed", { error, userId });
    return jsonError(SERVER_ERROR_MESSAGE, 500);
  }
}
