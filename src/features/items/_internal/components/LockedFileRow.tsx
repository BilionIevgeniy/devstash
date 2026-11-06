import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FileTypeIcon } from "@/features/files/components/FileTypeIcon";
import { formatFileSize } from "@/features/files/domain/file-rules";
import { DeleteLockedItemButton } from "@/features/items/_internal/components/DeleteLockedItemButton";
import type { LockedFile } from "@/features/items/types";

interface LockedFileRowProps {
  file: LockedFile;
  returnFocus: () => void;
}

export function LockedFileRow({ file, returnFocus }: LockedFileRowProps) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <FileTypeIcon
        fileName={file.fileName}
        className="size-5 shrink-0 text-muted-foreground"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {file.fileName} · {formatFileSize(file.size)}
        </p>
      </div>
      <Button asChild variant="ghost" size="icon">
        <a href={file.downloadUrl} aria-label={`Download ${file.fileName}`}>
          <Download />
        </a>
      </Button>
      <DeleteLockedItemButton
        itemId={file.id}
        title={file.title}
        returnFocus={returnFocus}
      />
    </li>
  );
}
