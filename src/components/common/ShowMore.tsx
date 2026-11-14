"use client";

import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export interface ShowMoreProps {
  /** The words of the button: "Load more" under a list, "Show more" in a group. */
  label: "loadMore" | "showMore";
  /** The rows the list shows now; a rise is announced and may take the focus. */
  rowCount: number;
  hasMore: boolean;
  isLoading: boolean;
  failed: boolean;
  onLoad: () => void;
  /** Gives the focus to the row at this index, once a load the button asked for has ended. */
  onFocusRow: (index: number) => void;
}

// The button that asks a list for its next page, with its pending and failed
// states, and a live region that says how many rows came. It stays mounted
// after the last page, so the focus move and the announcement still happen.
export function ShowMore({
  label,
  rowCount,
  hasMore,
  isLoading,
  failed,
  onLoad,
  onFocusRow,
}: ShowMoreProps) {
  const t = useTranslations("common.list");
  const [seenCount, setSeenCount] = useState(rowCount);
  const [announcement, setAnnouncement] = useState("");
  // The row count when the button asked, so its first new row takes the focus.
  const askedAtRef = useRef<number | null>(null);

  if (rowCount !== seenCount) {
    setSeenCount(rowCount);
    if (rowCount > seenCount) {
      setAnnouncement(t("loaded", { count: rowCount - seenCount }));
    }
  }

  useEffect(() => {
    const askedAt = askedAtRef.current;
    if (askedAt === null || isLoading) return;
    askedAtRef.current = null;
    if (rowCount > askedAt) onFocusRow(askedAt);
  }, [rowCount, isLoading, onFocusRow]);

  function ask() {
    askedAtRef.current = rowCount;
    onLoad();
  }

  return (
    <div className="flex min-h-9 flex-col items-center justify-center gap-1 py-2">
      {failed && !isLoading && (
        <p className="text-sm text-muted-foreground">{t("loadFailed")}</p>
      )}
      {(hasMore || failed) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isLoading}
          onClick={ask}
        >
          {isLoading && <Loader2Icon className="animate-spin" />}
          {isLoading ? t("loading") : failed ? t("retry") : t(label)}
        </Button>
      )}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
