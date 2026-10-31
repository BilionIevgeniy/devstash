import type { ReactNode } from "react";
import {
  Calendar,
  Download,
  File as FileIcon,
  Folder,
  Tag,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/features/files/domain/file-rules";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { typeSlug } from "@/features/item-types/domain/item-type";
import { CodeEditor } from "@/features/editor/components/CodeEditor";
import { MarkdownEditor } from "@/features/editor/components/MarkdownEditor";
import type { ItemDeleteHandler } from "@/features/items/_internal/components/DeleteItemDialog";
import { ItemActionBar } from "@/features/items/_internal/components/ItemActionBar";
import {
  FILE_PREVIEW_HEIGHT,
  FILE_ROW_HEIGHT,
  ItemDrawerSkeleton,
} from "@/features/items/_internal/components/ItemDrawerSkeleton";
import { ItemEditForm } from "@/features/items/_internal/components/ItemEditForm";
import { editableFields } from "@/features/items/domain/item-fields";
import { cn, formatLongDate } from "@/lib/utils";
import type { FileKind } from "@/features/files/domain/file-rules";
import type {
  DashboardItem,
  ItemDetailJson,
  ItemFile,
} from "@/features/items/types";

export type ItemDetailState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; detail: ItemDetailJson };

interface ItemDrawerContentProps {
  item: DashboardItem;
  state: ItemDetailState;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaved: (detail: ItemDetailJson) => void;
  onDelete: ItemDeleteHandler;
  /** Whether the edit form holds unsaved edits (see ItemEditForm). */
  onDirtyChange?: (isDirty: boolean) => void;
  /** "page" renders outside a Sheet, where SheetTitle cannot be used. */
  variant?: "sheet" | "page";
}

// The header and tags come from the card the user clicked, so they show at
// once; the rest waits for GET /api/items/[id]. On the item routes the server
// passes the detail in, so the state starts ready.
export function ItemDrawerContent({
  item,
  state,
  isEditing,
  onEdit,
  onCancelEdit,
  onSaved,
  onDelete,
  onDirtyChange,
  variant = "sheet",
}: ItemDrawerContentProps) {
  const detail = state.status === "ready" ? state.detail : null;

  if (isEditing && detail) {
    return (
      <>
        <ItemDrawerHeader
          item={item}
          language={detail.language}
          variant={variant}
        />
        <ItemEditForm
          item={item}
          detail={detail}
          onCancel={onCancelEdit}
          onSaved={onSaved}
          onDirtyChange={onDirtyChange}
        >
          <ItemMeta detail={detail} />
        </ItemEditForm>
      </>
    );
  }

  return (
    <>
      <ItemDrawerHeader
        item={item}
        language={detail?.language ?? null}
        variant={variant}
      />
      <ItemActionBar
        itemId={item.id}
        title={item.title}
        isFavorite={item.isFavorite}
        isPinned={item.isPinned}
        canEdit={detail !== null}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
        {item.description && (
          <Section title="Description">
            <p>{item.description}</p>
          </Section>
        )}
        {state.status === "loading" && (
          <ItemDrawerSkeleton typeName={item.type.name} />
        )}
        {state.status === "error" && (
          <p className="text-destructive">Couldn&apos;t load this item.</p>
        )}
        {detail && <ItemBody typeName={item.type.name} detail={detail} />}
        {item.tags.length > 0 && (
          <Section title="Tags" icon={Tag}>
            <ul className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </Section>
        )}
        {detail && <ItemMeta detail={detail} />}
      </div>
    </>
  );
}

interface ItemDrawerHeaderProps {
  item: DashboardItem;
  language: string | null;
  variant: "sheet" | "page";
}

function ItemDrawerHeader({ item, language, variant }: ItemDrawerHeaderProps) {
  const { type } = item;
  const iconBackground = type.color
    ? `color-mix(in oklab, ${type.color} 10%, transparent)`
    : undefined;

  return (
    <SheetHeader
      className={cn(
        "flex-row items-start gap-3 p-6 pb-2",
        variant === "sheet" ? "pr-12" : "pr-6",
      )}
    >
      <div
        className="flex size-12 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: iconBackground }}
      >
        <TypeIcon
          name={type.icon}
          className="size-6"
          style={{ color: type.color }}
        />
      </div>
      <div className="min-w-0 space-y-2">
        {variant === "sheet" ? (
          <SheetTitle className="text-lg">{item.title}</SheetTitle>
        ) : (
          <h1 className="font-heading text-lg font-medium text-foreground">
            {item.title}
          </h1>
        )}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="capitalize">
            {typeSlug(type.name)}
          </Badge>
          {language && <Badge variant="outline">{language}</Badge>}
        </div>
      </div>
    </SheetHeader>
  );
}

interface ItemBodyProps {
  typeName: string;
  detail: ItemDetailJson;
}

function ItemBody({ typeName, detail }: ItemBodyProps) {
  const fields = editableFields(typeName);

  return (
    <>
      {fields.file && detail.file && (
        <Section title={fields.file === "image" ? "Image" : "File"}>
          <ItemFileView kind={fields.file} file={detail.file} />
        </Section>
      )}
      {detail.url && (
        <Section title="URL">
          <a
            href={detail.url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-primary underline-offset-4 hover:underline"
          >
            {detail.url}
          </a>
        </Section>
      )}
      {detail.content && (
        <Section title="Content">
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
        </Section>
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

function ItemMeta({ detail }: { detail: ItemDetailJson }) {
  return (
    <>
      {detail.collections.length > 0 && (
        <Section title="Collections" icon={Folder}>
          <div className="flex flex-wrap gap-2">
            {detail.collections.map((collection) => (
              <Badge key={collection.id} variant="outline">
                {collection.name}
              </Badge>
            ))}
          </div>
        </Section>
      )}
      <Section title="Details" icon={Calendar}>
        <dl className="space-y-1">
          <DetailRow label="Created" value={detail.createdAt} />
          <DetailRow label="Updated" value={detail.updatedAt} />
        </dl>
      </Section>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>
        <time dateTime={value}>{formatLongDate(new Date(value))}</time>
      </dd>
    </div>
  );
}

interface SectionProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
}

function Section({ title, icon: Icon, children }: SectionProps) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {Icon && <Icon className="size-4" />}
        {title}
      </h3>
      {children}
    </section>
  );
}
