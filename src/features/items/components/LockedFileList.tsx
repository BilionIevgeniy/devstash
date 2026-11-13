"use client";
import { useTranslations } from "next-intl";

import { useRef } from "react";

import { LockedFileRow } from "@/features/items/_internal/components/LockedFileRow";
import type { LockedFile } from "@/features/items/types";

interface LockedFileListProps {
  files: LockedFile[];
}

// No drawer provider on this page: a deleted row gives the focus to the list.
export function LockedFileList({ files }: LockedFileListProps) {
  const t = useTranslations("items.locked");
  const listRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={listRef} tabIndex={-1} className="outline-none">
      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("none")}</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {files.map((file) => (
            <LockedFileRow
              key={file.id}
              file={file}
              returnFocus={() =>
                listRef.current?.focus({ preventScroll: true })
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
