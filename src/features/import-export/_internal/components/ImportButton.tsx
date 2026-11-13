"use client";

import { Upload } from "lucide-react";
import { useRef, type ChangeEvent } from "react";

import { useErrorText } from "@/components/common/hooks/use-error-text";
import { Button } from "@/components/ui/button";
import {
  useImport,
  type ImportState,
} from "@/features/import-export/_internal/components/hooks/use-import";
import { ImportSummaryView } from "@/features/import-export/_internal/components/ImportSummaryView";

function buttonLabel(state: ImportState, isRefreshing: boolean): string {
  if (isRefreshing) return "Finishing…";
  if (state.status === "reading") return "Reading the file…";
  if (state.status === "running") {
    return `Importing… ${state.done} of ${state.total}`;
  }
  return "Import JSON";
}

export function ImportButton() {
  const { state, isBusy, isRefreshing, start } = useImport();
  const errorText = useErrorText();
  const inputRef = useRef<HTMLInputElement>(null);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared, so choosing the same file again runs again.
    event.target.value = "";
    if (file) void start(file);
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        aria-label="Import file"
        tabIndex={-1}
        className="sr-only"
        disabled={isBusy}
        onChange={chooseFile}
      />
      <Button
        type="button"
        variant="outline"
        disabled={isBusy}
        onClick={() => inputRef.current?.click()}
      >
        <Upload />
        {buttonLabel(state, isRefreshing)}
      </Button>
      {state.status === "invalid" && (
        <p role="alert" className="text-sm text-destructive">
          {errorText(state.error)}
        </p>
      )}
      {state.status === "done" && (
        <ImportSummaryView summary={state.summary} error={state.error} />
      )}
    </div>
  );
}
