import { signingWindowFor } from "@/features/files/domain/file-rules";

// Items per page of an export: one page is all the server holds at a time.
export const EXPORT_ITEMS_PAGE_SIZE = 100;

// When the download links of an export signed at `now` stop working: the end
// of the signing window they all share.
export function exportLinksExpireAt(now: Date): Date {
  const { signingDate, expiresIn } = signingWindowFor(now);
  return new Date(signingDate.getTime() + expiresIn * 1000);
}
