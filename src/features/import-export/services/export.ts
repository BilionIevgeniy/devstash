import "server-only";

import { getEntitlements } from "@/features/billing/queries";
import { getExportCollections } from "@/features/collections/queries/export";
import type { ExportedCollection } from "@/features/collections/types";
import {
  EXPORT_CLOSING,
  exportFileName,
  exportItemsChunk,
  exportOpening,
} from "@/features/import-export/domain/export-format";
import { EXPORT_BY_USER } from "@/features/import-export/domain/limits";
import { exportLinksExpireAt } from "@/features/items/domain/export";
import { getUserExportItemPage } from "@/features/items/services/export";
import { logger } from "@/lib/logger";
import { consumeRateLimit } from "@/lib/rate-limit";

export type ExportResult =
  | { status: "ok"; fileName: string; stream: ReadableStream<Uint8Array> }
  | { status: "forbidden" }
  | { status: "rate-limited"; reset: number };

// The file as a stream: the opening with the collections first, then one page
// of items per pull. A page is read only when the client has taken the one
// before, so memory stays at one page whatever the size of the account. An
// error after the first chunk cannot change the status any more: the stream
// errors, and the browser checks that the file ends with EXPORT_CLOSING.
function exportStream(
  userId: string,
  now: Date,
  collections: ExportedCollection[],
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let cursor: string | null = null;
  let afterItems = false;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const meta = { exportedAt: now, linksExpireAt: exportLinksExpireAt(now) };
      controller.enqueue(encoder.encode(exportOpening(meta, collections)));
    },
    async pull(controller) {
      try {
        const page = await getUserExportItemPage(userId, cursor, now);
        controller.enqueue(
          encoder.encode(exportItemsChunk(page.items, afterItems)),
        );
        afterItems ||= page.items.length > 0;
        if (page.nextCursor === null) {
          controller.enqueue(encoder.encode(EXPORT_CLOSING));
          controller.close();
          return;
        }
        cursor = page.nextCursor;
      } catch (error) {
        await logger.error("Exporting the items failed", { error, userId });
        controller.error(error);
      }
    },
  });
}

// Pro only, once a minute (the plan is checked first, so a Free user's
// refusal uses up nothing). A RateLimitUnavailableError propagates, so the
// route answers that export is unavailable.
export async function exportUserData(
  userId: string,
  now: Date,
): Promise<ExportResult> {
  const { isPro } = await getEntitlements(userId);
  if (!isPro) return { status: "forbidden" };

  const limit = await consumeRateLimit(EXPORT_BY_USER, userId);
  if (!limit.success) return { status: "rate-limited", reset: limit.reset };

  const collections = await getExportCollections(userId);
  return {
    status: "ok",
    fileName: exportFileName(now),
    stream: exportStream(userId, now, collections),
  };
}
