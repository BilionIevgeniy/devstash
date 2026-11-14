"use client";
import { useTranslations } from "next-intl";

import { RotateCcw } from "lucide-react";

import { useErrorText } from "@/components/common/hooks/use-error-text";
import { Button } from "@/components/ui/button";
import { DropZone } from "@/features/files/_internal/components/DropZone";
import { UploadProgress } from "@/features/files/_internal/components/UploadProgress";
import { useFileUpload } from "@/features/files/_internal/components/hooks/use-file-upload";
import type { FileKind } from "@/features/files/domain/file-rules";
import type { UploadedFile } from "@/features/files/types";

interface FileUploadProps {
  kind: FileKind;
  /** Called with the finished upload, or null when it is removed or restarted. */
  onChange: (upload: UploadedFile | null) => void;
  disabled?: boolean;
}

// The browser sends the file straight to R2 through a signed PUT, so the
// progress is the browser's own. Unmounting aborts a running upload, so a
// closed dialog or a switched type never keeps sending.
export function FileUpload({ kind, onChange, disabled }: FileUploadProps) {
  const t = useTranslations("files");
  const { state, upload, reset } = useFileUpload(kind, onChange);
  const errorText = useErrorText();

  if (state.status === "uploading" || state.status === "done") {
    return (
      <UploadProgress
        file={state.file}
        progress={state.status === "uploading" ? state.progress : null}
        kind={kind}
        disabled={disabled}
        onRemove={reset}
      />
    );
  }

  const failedFile = state.status === "failed" ? state.file : null;

  return (
    <div className="space-y-2">
      <DropZone
        kind={kind}
        disabled={disabled}
        onFile={(file) => void upload(file)}
      />
      {state.status === "failed" && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <span role="alert" className="flex-1">
            {errorText(state.error)}
          </span>
          {failedFile && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void upload(failedFile)}
            >
              <RotateCcw />
              {t("retry")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
