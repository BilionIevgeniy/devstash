import "server-only";

import { isUnclaimedUploadDue } from "@/features/files/domain/file-rules";
import {
  deleteUploads,
  listUploadPage,
} from "@/features/files/services/objects";
import { getHeldFileKeys } from "@/features/items/_internal/queries/upload-sweep";
import type { CronContext, CronJobReport } from "@/lib/http/cron";

// The daily job's part for uploads (app/api/cron/daily). An object uploaded to
// R2 that never became an item (the dialog closed, the file removed, the
// create failing after the upload) is deleted once it is older than a day and
// no item holds its key. It lives here because `items` owns the rows that hold
// the keys; `files` lists and deletes the objects. Page by page through
// `users/`, so a second run finds nothing more to delete; at the deadline it
// stops and the rest waits a day.
export async function sweepUnclaimedUploads({
  now,
  deadline,
}: CronContext): Promise<CronJobReport> {
  let scanned = 0;
  let deleted = 0;
  let next: string | undefined;

  do {
    if (Date.now() > deadline) {
      return { counts: { scanned, deleted }, stoppedEarly: true };
    }
    const page = await listUploadPage(next);
    const due = page.objects
      .filter(({ lastModified }) => isUnclaimedUploadDue(lastModified, now))
      .map(({ key }) => key);
    const held = await getHeldFileKeys(due);
    const unclaimed = due.filter((key) => !held.has(key));

    await deleteUploads(unclaimed);
    scanned += page.objects.length;
    deleted += unclaimed.length;
    next = page.next;
  } while (next);

  return { counts: { scanned, deleted }, stoppedEarly: false };
}
