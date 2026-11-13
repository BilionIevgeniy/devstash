import type { ZodType } from "zod";

import { AI_SIGNED_OUT_MESSAGE } from "@/features/ai/domain/messages";
import type { TextStreamStart } from "@/features/ai/services/text-stream";
import { getSignedInUserId } from "@/features/auth/nextauth/session";
import { jsonError, NO_STORE, SERVER_ERROR_MESSAGE } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { firstIssueMessage } from "@/lib/validation";

const INVALID_BODY_MESSAGE = "Invalid request";

type StartStream<T> = (
  userId: string,
  input: T,
  signal: AbortSignal,
) => Promise<TextStreamStart>;

async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function toResponse(result: TextStreamStart): Response {
  if (result.status === "aborted") {
    return new Response(null, { status: 204, headers: NO_STORE });
  }
  if (result.status === "refused") {
    return jsonError(result.error, result.reason === "not-pro" ? 403 : 429);
  }
  if (result.status === "failed") return jsonError(result.error, 503);
  return new Response(result.stream, {
    headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" },
  });
}

// The body of every streaming AI route. Every refusal is answered as JSON
// before the stream opens: once the text starts, the status is sent and can
// no longer change. request.signal goes to OpenAI, so closing the drawer
// stops the answer and its billing; a client gone away gets an empty 204. The
// session cookie is SameSite=Lax, so a cross-site POST arrives signed out.
export async function streamAiAnswer<T>(
  request: Request,
  schema: ZodType<T>,
  start: StartStream<T>,
  label: string,
): Promise<Response> {
  const userId = await getSignedInUserId();
  if (!userId) return jsonError(AI_SIGNED_OUT_MESSAGE, 401);

  const parsed = schema.safeParse(await readBody(request));
  if (!parsed.success) {
    return jsonError(
      firstIssueMessage(parsed.error, INVALID_BODY_MESSAGE),
      400,
    );
  }

  try {
    return toResponse(await start(userId, parsed.data, request.signal));
  } catch (error) {
    await logger.error(`${label} failed`, { error, userId });
    return jsonError(SERVER_ERROR_MESSAGE, 500);
  }
}
