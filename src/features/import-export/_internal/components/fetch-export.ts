import "client-only";

import { EXPORT_CLOSING } from "@/features/import-export/domain/export-format";
import { routeErrorMessage } from "@/lib/route-error";

const EXPORT_PATH = "/api/export";
const FALLBACK_FILE_NAME = "devstash-export.json";
const NETWORK_ERROR =
  "The export could not be downloaded. Check your connection and try again.";
const INTERRUPTED =
  "The export was interrupted. You can export again in a minute.";
const GENERIC_ERROR = "Something went wrong. Please try again.";

function fileNameOf(response: Response): string {
  const header = response.headers.get("Content-Disposition") ?? "";
  return /filename="([^"]+)"/.exec(header)?.[1] ?? FALLBACK_FILE_NAME;
}

// A stream that broke after the first page still arrives as a 200, so the
// file is only saved when it ends the way the server ends it.
async function isComplete(blob: Blob): Promise<boolean> {
  const tail = await blob.slice(-EXPORT_CLOSING.length).text();
  return tail === EXPORT_CLOSING;
}

function save(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // After the click has handed the URL to the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// Downloads the export and saves it as a file. The error is null on success.
export async function downloadExport(): Promise<{ error: string | null }> {
  let blob: Blob;
  let fileName: string;
  try {
    const response = await fetch(EXPORT_PATH);
    if (!response.ok) {
      return { error: await routeErrorMessage(response, GENERIC_ERROR) };
    }
    fileName = fileNameOf(response);
    blob = await response.blob();
  } catch {
    return { error: NETWORK_ERROR };
  }
  if (!(await isComplete(blob))) return { error: INTERRUPTED };
  save(blob, fileName);
  return { error: null };
}
