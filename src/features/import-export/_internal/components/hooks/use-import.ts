import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { useLeaveWarning } from "@/components/common/hooks/use-leave-warning";
import { runImport } from "@/features/import-export/_internal/components/run-import";
import {
  IMPORT_FILE_MAX_BYTES,
  IMPORT_FILE_MAX_MB,
} from "@/features/import-export/domain/limits";
import {
  parseImportFile,
  type ParsedImportFile,
} from "@/features/import-export/schemas";
import type { ImportSummary } from "@/features/import-export/types";
import { errorRef, type ErrorRef } from "@/i18n/error-codes";
import { fail } from "@/lib/action-result";

export type ImportState =
  | { status: "idle" }
  | { status: "reading" }
  | { status: "running"; done: number; total: number }
  | { status: "invalid"; error: ErrorRef }
  | { status: "done"; summary: ImportSummary; error: ErrorRef | null };

// The file can vanish or lose its permission after it was chosen.
async function readImportFile(file: File): Promise<ParsedImportFile> {
  try {
    return parseImportFile(await file.text());
  } catch {
    return fail("fileUnreadable");
  }
}

// Reads the chosen file, checks it, and runs the import batch by batch. A file
// that fails the check sends nothing. Leaving the page stops the run at the
// next batch, with no summary and no refresh; a reload asks first. The summary
// comes in the commit that brings the refreshed page, so the counts on the page
// and in the summary agree.
export function useImport() {
  const router = useRouter();
  const [state, setState] = useState<ImportState>({ status: "idle" });
  const [isRefreshing, startTransition] = useTransition();
  const isMounted = useRef(true);
  const isBusy =
    state.status === "reading" || state.status === "running" || isRefreshing;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useLeaveWarning(isBusy);

  async function start(file: File) {
    if (isBusy) return;
    if (file.size > IMPORT_FILE_MAX_BYTES) {
      const error = errorRef("importFileTooLarge", {
        max: IMPORT_FILE_MAX_MB,
      });
      setState({ status: "invalid", error });
      return;
    }
    setState({ status: "reading" });
    const parsed = await readImportFile(file);
    if (!parsed.success) {
      setState({ status: "invalid", error: parsed });
      return;
    }

    const { collections, items } = parsed.data;
    const total = collections.length + items.length;
    setState({ status: "running", done: 0, total });
    const run = await runImport(parsed.data, {
      onProgress: (done, total) => setState({ status: "running", done, total }),
      isCancelled: () => !isMounted.current,
    });
    if (!run || !isMounted.current) return;
    startTransition(() => {
      setState({ status: "done", ...run });
      router.refresh();
    });
  }

  return { state, isBusy, isRefreshing, start };
}
