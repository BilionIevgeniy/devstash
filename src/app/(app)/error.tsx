"use client";

import { useTranslations } from "next-intl";

import { ErrorState } from "@/components/common/ErrorState";
import { useReportError } from "@/components/common/hooks/use-report-error";
import { Button } from "@/components/ui/button";

// A failed page inside the app keeps the sidebar and top bar around it. An
// error in the layout itself (the sidebar) goes up to app/error.tsx.
export default function AppError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const digest = useReportError(
    error,
    "A page of the app failed to render in the browser",
  );

  const t = useTranslations("common.appError");

  return (
    <ErrorState
      title={t("title")}
      description={t("description")}
      reference={
        digest &&
        t.rich("reference", {
          reference: digest,
          code: (chunks) => <span className="font-mono">{chunks}</span>,
        })
      }
    >
      <Button onClick={retry}>{t("retry")}</Button>
    </ErrorState>
  );
}
