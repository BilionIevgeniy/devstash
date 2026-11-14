"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

interface ListLoadErrorProps {
  onRetry: () => void;
  /** What could not be loaded; the first page of a list when left out. */
  message?: string;
}

// In place of what the browser could not load (the rows of a list whose first
// page could not be read, the create dialog's form), with a way to ask again.
export function ListLoadError({ onRetry, message }: ListLoadErrorProps) {
  const t = useTranslations("common.list");
  return (
    <div role="alert" className="flex flex-col items-center gap-1 py-2">
      <p className="text-sm text-muted-foreground">
        {message ?? t("firstPageFailed")}
      </p>
      <Button type="button" variant="ghost" size="sm" onClick={onRetry}>
        {t("retry")}
      </Button>
    </div>
  );
}
