"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

interface ListLoadErrorProps {
  onRetry: () => void;
}

// In place of the rows of a list whose first page could not be read (a sort
// the server did not render), with a way to ask again.
export function ListLoadError({ onRetry }: ListLoadErrorProps) {
  const t = useTranslations("common.list");
  return (
    <div role="alert" className="flex flex-col items-center gap-1 py-2">
      <p className="text-sm text-muted-foreground">{t("firstPageFailed")}</p>
      <Button type="button" variant="ghost" size="sm" onClick={onRetry}>
        {t("retry")}
      </Button>
    </div>
  );
}
