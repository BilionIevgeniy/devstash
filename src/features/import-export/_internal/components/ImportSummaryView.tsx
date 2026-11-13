import { useErrorText } from "@/components/common/hooks/use-error-text";
import { useTranslations } from "next-intl";
import type { ImportSummary } from "@/features/import-export/types";
import type { ErrorRef } from "@/i18n/error-codes";

interface ImportSummaryViewProps {
  summary: ImportSummary;
  /** Why the import stopped before the end, or null when it ran through. */
  error: ErrorRef | null;
}

export function ImportSummaryView({ summary, error }: ImportSummaryViewProps) {
  const t = useTranslations("importExport");
  const errorText = useErrorText();
  return (
    <div role="status" className="space-y-2 rounded-md border p-4 text-sm">
      <p>
        <span className="font-medium">
          {error ? t("stopped") : t("finished")}
        </span>{" "}
        {t(summary.files > 0 ? "countsWithFiles" : "counts", {
          created: summary.created,
          duplicates: summary.duplicates,
          files: summary.files,
        })}
      </p>
      {error && <p className="text-destructive">{errorText(error)}</p>}
      {summary.files > 0 && (
        <p className="text-muted-foreground">{t("filesNote")}</p>
      )}
      {summary.failed.length > 0 && (
        <details>
          <summary className="cursor-pointer">
            {t("failed", { count: summary.failed.length })}
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            {summary.failed.map((failure, index) => (
              // The same title can fail twice, so the position is the key.
              <li key={index}>
                {failure.title ?? t("untitled")}: {errorText(failure.reason)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
