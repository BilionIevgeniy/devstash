import { Download, File as FileIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/features/editor/components/CodeEditor";
import { MarkdownEditor } from "@/features/editor/components/MarkdownEditor";
import {
  formatFileSize,
  type FileKind,
} from "@/features/files/domain/file-rules";
import { DrawerSection } from "@/features/items/_internal/components/DrawerSection";
import {
  FILE_PREVIEW_HEIGHT,
  FILE_ROW_HEIGHT,
} from "@/features/items/_internal/components/ItemDrawerSkeleton";
import { editableFields } from "@/features/items/domain/item-fields";
import type { ItemDetailJson, ItemFile } from "@/features/items/types";
import { cn } from "@/lib/utils";

interface ItemBodyProps {
  typeName: string;
  detail: ItemDetailJson;
}

// The type-specific part of the detail: the file or image, the URL, the content.
export function ItemBody({ typeName, detail }: ItemBodyProps) {
  const fields = editableFields(typeName);

  return (
    <>
      {fields.file && detail.file && (
        <DrawerSection title={fields.file === "image" ? "Image" : "File"}>
          <ItemFileView kind={fields.file} file={detail.file} />
        </DrawerSection>
      )}
      {detail.url && (
        <DrawerSection title="URL">
          <a
            href={detail.url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-primary underline-offset-4 hover:underline"
          >
            {detail.url}
          </a>
        </DrawerSection>
      )}
      {detail.content && (
        <DrawerSection title="Content">
          {fields.codeEditor ? (
            <CodeEditor
              value={detail.content}
              language={detail.language}
              readOnly
              ariaLabel="Content"
            />
          ) : (
            <MarkdownEditor value={detail.content} readOnly />
          )}
        </DrawerSection>
      )}
    </>
  );
}

interface ItemFileViewProps {
  kind: FileKind;
  file: ItemFile;
}

// Fixed heights (the preview frame, the file row) match ItemDrawerSkeleton, so
// nothing shifts when the detail arrives or the image loads. The URLs are
// signed for at least an hour after the render.
function ItemFileView({ kind, file }: ItemFileViewProps) {
  return (
    <div className="space-y-3">
      {kind === "image" && (
        <a
          href={file.viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center justify-center overflow-hidden rounded-md border bg-muted",
            FILE_PREVIEW_HEIGHT,
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- a short-lived signed R2 URL: next/image would send every one through its optimizer */}
          <img
            src={file.viewUrl}
            alt={file.name}
            className="max-h-full max-w-full object-contain"
          />
        </a>
      )}
      <div
        className={cn(
          "flex items-center gap-3 rounded-md border px-3",
          FILE_ROW_HEIGHT,
        )}
      >
        <FileIcon className="size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.size)}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={file.downloadUrl}>
            <Download />
            Download
          </a>
        </Button>
      </div>
    </div>
  );
}
