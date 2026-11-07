import { AI_SIGNED_OUT_MESSAGE } from "@/features/ai/domain/messages";
import { explainInputSchema } from "@/features/ai/schemas";
import { startExplanation } from "@/features/ai/services/explain";
import { auth } from "@/features/auth/nextauth/auth";

// The service gives up at 50 s, so a slow answer ends in its own words and
// not in the platform's error page.
export const maxDuration = 60;

// A user's own code and its explanation: never kept by a shared cache.
const NO_STORE = { "Cache-Control": "private, no-store" };
const INVALID_BODY_MESSAGE = "Invalid request";
const UNEXPECTED_MESSAGE = "Something went wrong";

function failure(error: string, status: number) {
  return Response.json(
    { success: false, data: null, error },
    { status, headers: NO_STORE },
  );
}

async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// Every refusal is answered as JSON before the stream opens: once the text
// starts, the status is sent and can no longer change. request.signal goes to
// OpenAI, so closing the drawer stops the answer and its billing. The
// session cookie is SameSite=Lax, so a cross-site POST arrives signed out.
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return failure(AI_SIGNED_OUT_MESSAGE, 401);

  const parsed = explainInputSchema.safeParse(await readBody(request));
  if (!parsed.success) {
    return failure(
      parsed.error.issues[0]?.message ?? INVALID_BODY_MESSAGE,
      400,
    );
  }

  try {
    const result = await startExplanation(userId, parsed.data, request.signal);
    if (result.status === "aborted") {
      return new Response(null, { status: 204, headers: NO_STORE });
    }
    if (result.status === "refused") {
      return failure(result.error, result.reason === "not-pro" ? 403 : 429);
    }
    if (result.status === "failed") return failure(result.error, 503);
    return new Response(result.stream, {
      headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error(
      "Explaining code failed:",
      error instanceof Error ? error.name : "unknown",
    );
    return failure(UNEXPECTED_MESSAGE, 500);
  }
}
