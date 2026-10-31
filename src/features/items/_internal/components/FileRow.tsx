"use client";

import { Download, Pin, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FileTypeIcon } from "@/features/files/components/FileTypeIcon";
import { formatFileSize } from "@/features/files/domain/file-rules";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { FILE_ROW_HEIGHT } from "@/features/items/components/FileListSkeleton";
import { useItemDrawer } from "@/features/items/components/ItemDrawerProvider";
import { ItemDrawerTrigger } from "@/features/items/components/ItemDrawerTrigger";
import type { FileListItem } from "@/features/items/types";
import { cn, formatLongDate } from "@/lib/utils";

interface FileRowProps {
  item: FileListItem;
}

// The trigger fills the row except the Download link, which is its sibling:
// a link inside a role="button" is not allowed, and a click on it must not
// open the drawer. The download URL is signed for at least an hour after the
// render (see "Known risks" in docs/architecture.md).
export function FileRow({ item }: FileRowProps) {
  const { hiddenIds } = useItemDrawer();
  const { file } = item;

  // The trigger hides itself too, but the row holds more than the trigger
  // (the Download link, the divider): the whole row has to go.
  if (hiddenIds.has(item.id)) return null;

  const date = formatLongDate(item.createdAt);
  const size = file ? formatFileSize(file.size) : null;

  return (
    <div
      className={cn(
        "flex items-stretch transition-colors hover:bg-muted/50",
        FILE_ROW_HEIGHT,
      )}
    >
      <ItemDrawerTrigger
        item={item}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-none px-4 focus-visible:ring-inset"
      >
        {file ? (
          <FileTypeIcon
            fileName={file.name}
            className="size-5 shrink-0 text-muted-foreground"
          />
        ) : (
          <TypeIcon
            name={item.type.icon}
            className="size-5 shrink-0 text-muted-foreground"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{item.title}</p>
            {item.isPinned && (
              <Pin className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            {item.isFavorite && (
              <Star className="size-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
            )}
          </div>
          {file && (
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {file.name}
            </p>
          )}
          <p className="truncate text-xs text-muted-foreground sm:hidden">
            {size ? `${size} · ${date}` : date}
          </p>
        </div>
        <span className="hidden w-20 shrink-0 text-right text-sm text-muted-foreground tabular-nums sm:block">
          {size}
        </span>
        <span className="hidden w-40 shrink-0 text-sm text-muted-foreground sm:block">
          {date}
        </span>
      </ItemDrawerTrigger>
      <div className="flex w-12 shrink-0 items-center justify-center">
        {file && (
          <Button asChild variant="ghost" size="icon">
            <a href={file.downloadUrl} aria-label={`Download ${file.name}`}>
              <Download />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
