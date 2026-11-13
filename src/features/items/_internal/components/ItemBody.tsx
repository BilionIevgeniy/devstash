import { Download, File as FileIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { AiCodeExplanation } from "@/features/ai/components/AiCodeExplanation";
import { CodeEditor } from "@/features/editor/components/CodeEditor";
import { MarkdownEditor } from "@/features/editor/components/MarkdownEditor";
import { type FileKind } from "@/features/files/domain/file-rules";
import { useFileSize } from "@/features/files/components/hooks/use-file-size";
import { DrawerSection } from "@/features/items/_internal/components/DrawerSection";
import { PromptContent } from "@/features/items/_internal/components/PromptContent";
import {
  FILE_PREVIEW_HEIGHT,
  FILE_ROW_HEIGHT,
} from "@/features/items/_internal/components/ItemDrawerSkeleton";
import { editableFields } from "@/features/items/domain/item-fields";
import type { ItemDetailJson, ItemFile } from "@/features/items/types";
import { cn } from "@/lib/utils";

interface ItemBodyProps {
  typeName: string;
  title: string;
  detail: ItemDetailJson;
  /** Pro: code gets a working Explain button and a prompt Optimize, Free an upgrade link. */
  canUseAi: boolean;
  /** Shows a saved detail, after an accepted prompt rewrite. */
  onSaved: (detail: ItemDetailJson) => void;
}

// The type-specific part of the detail: the file or image, the URL, the content.
export function ItemBody({
  typeName,
  title,
  detail,
  canUseAi,
  onSaved,
}: ItemBodyProps) {
  const t = useTranslations("items.fields");
  const fields = editableFields(typeName);

  return (
    <>
      {fields.file && detail.file && (
        <DrawerSection title={t(fields.file)}>
          <ItemFileView kind={fields.file} file={detail.file} />
        </DrawerSection>
      )}
      {detail.url && (
        <DrawerSection title={t("url")}>
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
        <DrawerSection title={t("content")}>
          {fields.codeEditor ? (
            <AiCodeExplanation
              title={title}
              code={detail.content}
              language={detail.language}
              canUseAi={canUseAi}
            >
              {({ headerActions, view }) => (
                <CodeEditor
                  value={detail.content ?? ""}
                  language={detail.language}
                  readOnly
                  ariaLabel={t("content")}
                  headerActions={headerActions}
                  view={view}
                />
              )}
            </AiCodeExplanation>
          ) : typeName === "prompt" ? (
            <PromptContent
              itemId={detail.id}
              title={title}
              prompt={detail.content}
              canUseAi={canUseAi}
              onSaved={onSaved}
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
  const fileSize = useFileSize();
  const t = useTranslations("common.actions");
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
          <p className="text-xs text-muted-foreground">{fileSize(file.size)}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={file.downloadUrl}>
            <Download />
            {t("download")}
          </a>
        </Button>
      </div>
    </div>
  );
}
