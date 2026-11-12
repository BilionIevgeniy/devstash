import { Database } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";
import { ExportButton } from "@/features/import-export/_internal/components/ExportButton";
import { ImportButton } from "@/features/import-export/_internal/components/ImportButton";

interface DataSectionProps {
  isPro: boolean;
}

// Export and import of the settings page. The plan comes from the page's
// panel; the route and the actions check it again.
export function DataSection({ isPro }: DataSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Database className="size-4 text-muted-foreground" />
        Data
      </h2>
      <div className="space-y-4 rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Download every item and collection as JSON, or import a DevStash
          export. Files and images come as download links that expire after
          about an hour. An import skips what is already there and does not
          restore favorites, pins or dates.
        </p>
        {isPro ? (
          <div className="flex flex-wrap items-start gap-3">
            <ExportButton />
            <ImportButton />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm">Export and import are part of Pro.</p>
            <Button asChild variant="outline">
              <Link href={UPGRADE_PATH}>Upgrade to Pro</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
