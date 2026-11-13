import "client-only";

import { EXPORT_CLOSING } from "@/features/import-export/domain/export-format";
import type { ErrorRef } from "@/i18n/error-codes";
import { routeError } from "@/lib/route-error";

const EXPORT_PATH = "/api/export";
const FALLBACK_FILE_NAME = "devstash-export.json";
const NETWORK_ERROR: ErrorRef = { error: "exportDownloadFailed" };
const INTERRUPTED: ErrorRef = { error: "exportInterrupted" };

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
export async function downloadExport(): Promise<{ error: ErrorRef | null }> {
  let blob: Blob;
  let fileName: string;
  try {
    const response = await fetch(EXPORT_PATH);
    if (!response.ok) {
      return { error: await routeError(response, "generic") };
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
