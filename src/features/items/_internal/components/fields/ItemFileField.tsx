"use client";

import { useTranslations } from "next-intl";

import { FileUpload } from "@/features/files/components/FileUpload";
import type { FileKind } from "@/features/files/domain/file-rules";
import type { UploadedFile } from "@/features/files/types";

interface ItemFileFieldProps {
  kind: FileKind;
  onChange: (file: UploadedFile | null) => void;
  disabled: boolean;
}

// Not a Field: its label points at an input, and the drop zone is named by
// its own text.
export function ItemFileField({
  kind,
  onChange,
  disabled,
}: ItemFileFieldProps) {
  const t = useTranslations("items.fields");
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{t(kind)}</p>
      <FileUpload kind={kind} onChange={onChange} disabled={disabled} />
    </div>
  );
}
