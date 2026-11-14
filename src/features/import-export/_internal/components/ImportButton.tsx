"use client";
import { useTranslations } from "next-intl";

import { Upload } from "lucide-react";
import { useRef, type ChangeEvent } from "react";

import { useErrorText } from "@/components/common/hooks/use-error-text";
import { Button } from "@/components/ui/button";
import {
  useImport,
  type ImportState,
} from "@/features/import-export/_internal/components/hooks/use-import";
import { ImportSummaryView } from "@/features/import-export/_internal/components/ImportSummaryView";

type Translate = ReturnType<typeof useTranslations<"importExport">>;

function buttonLabel(
  t: Translate,
  state: ImportState,
  isRefreshing: boolean,
): string {
  if (isRefreshing) return t("finishing");
  if (state.status === "reading") return t("reading");
  if (state.status === "running") {
    return t("importing", { done: state.done, total: state.total });
  }
  return t("import");
}

export function ImportButton() {
  const t = useTranslations("importExport");
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
        aria-label={t("importFile")}
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
        {buttonLabel(t, state, isRefreshing)}
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
