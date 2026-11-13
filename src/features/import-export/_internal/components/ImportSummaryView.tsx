import { useErrorText } from "@/components/common/hooks/use-error-text";
import type { ImportSummary } from "@/features/import-export/types";
import type { ErrorRef } from "@/i18n/error-codes";

interface ImportSummaryViewProps {
  summary: ImportSummary;
  /** Why the import stopped before the end, or null when it ran through. */
  error: ErrorRef | null;
}

function countsLine({ created, duplicates, files }: ImportSummary): string {
  const parts = [`${created} created`, `${duplicates} already there`];
  if (files > 0) parts.push(`${files} files not imported`);
  return `${parts.join(", ")}.`;
}

export function ImportSummaryView({ summary, error }: ImportSummaryViewProps) {
  const errorText = useErrorText();
  return (
    <div role="status" className="space-y-2 rounded-md border p-4 text-sm">
      <p>
        <span className="font-medium">
          {error ? "The import stopped early." : "Import finished."}
        </span>{" "}
        {countsLine(summary)}
      </p>
      {error && <p className="text-destructive">{errorText(error)}</p>}
      {summary.files > 0 && (
        <p className="text-muted-foreground">
          Files and images are not part of an export. Download them from the
          links in the file and upload them again.
        </p>
      )}
      {summary.failed.length > 0 && (
        <details>
          <summary className="cursor-pointer">
            {summary.failed.length} could not be imported
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            {summary.failed.map((failure, index) => (
              // The same title can fail twice, so the position is the key.
              <li key={index}>
                {failure.title}: {errorText(failure.reason)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
