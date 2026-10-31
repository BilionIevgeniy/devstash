import { FileUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatFileSize } from "@/features/files/domain/file-rules";

interface UploadProgressProps {
  file: File;
  /** The percent sent, or null once the upload is done. */
  progress: number | null;
  label: string;
  disabled?: boolean;
  /** Cancels a running upload or removes the finished one. */
  onRemove: () => void;
}

export function UploadProgress({
  file,
  progress,
  label,
  disabled,
  onRemove,
}: UploadProgressProps) {
  const isUploading = progress !== null;

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center gap-3">
        <FileUp className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {isUploading
              ? `Uploading… ${progress}%`
              : formatFileSize(file.size)}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={disabled}
          aria-label={isUploading ? "Cancel upload" : `Remove ${label}`}
        >
          <X />
        </Button>
      </div>
      {isUploading && <Progress value={progress} />}
    </div>
  );
}
