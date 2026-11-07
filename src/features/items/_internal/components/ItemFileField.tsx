"use client";

import { FileUpload } from "@/features/files/components/FileUpload";
import type { FileKind } from "@/features/files/domain/file-rules";
import type { UploadedFile } from "@/features/files/types";

interface ItemFileFieldProps {
  kind: FileKind;
  onChange: (file: UploadedFile | null) => void;
  disabled: boolean;
}

// Not a Field: its label points at an input, and the drop zone is named by
// its own aria-label.
export function ItemFileField({
  kind,
  onChange,
  disabled,
}: ItemFileFieldProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground capitalize">
        {kind}
      </p>
      <FileUpload kind={kind} onChange={onChange} disabled={disabled} />
    </div>
  );
}
