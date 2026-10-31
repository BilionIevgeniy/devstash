import "server-only";

import { signFileUrls } from "@/features/files/services/objects";
import type { FileUrls } from "@/features/files/types";

export interface SignedItemFile extends FileUrls {
  name: string;
}

// The one place an item's upload is signed. The file name is part of the
// signature, so the gallery and the drawer must derive it the same way: their
// URLs then match and the browser loads each image once.
export async function signItemFile(
  fileKey: string,
  fileName: string | null,
  now: Date,
): Promise<SignedItemFile> {
  const name = fileName ?? fileKey;
  const urls = await signFileUrls(fileKey, name, now);
  return { name, ...urls };
}
