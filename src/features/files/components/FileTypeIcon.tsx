import {
  File,
  FileBraces,
  FileSpreadsheet,
  FileText,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

import {
  fileIconKind,
  type FileIconKind,
} from "@/features/files/domain/file-rules";

const FILE_ICONS: Record<FileIconKind, LucideIcon> = {
  pdf: FileText,
  text: FileText,
  code: FileBraces,
  spreadsheet: FileSpreadsheet,
  other: File,
};

interface FileTypeIconProps extends LucideProps {
  fileName: string;
}

export function FileTypeIcon({ fileName, ...props }: FileTypeIconProps) {
  const Icon = FILE_ICONS[fileIconKind(fileName)];
  return <Icon {...props} />;
}
