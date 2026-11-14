"use client";
import { useTranslations } from "next-intl";

import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useErrorText } from "@/components/common/hooks/use-error-text";
import { Button } from "@/components/ui/button";
import { downloadExport } from "@/features/import-export/_internal/components/fetch-export";

// The browser saves the file itself, so success needs no toast.
export function ExportButton() {
  const t = useTranslations("importExport");
  const [isPending, setIsPending] = useState(false);
  const errorText = useErrorText();

  async function exportData() {
    setIsPending(true);
    const { error } = await downloadExport();
    setIsPending(false);
    if (error) toast.error(errorText(error));
  }

  return (
    <Button type="button" disabled={isPending} onClick={exportData}>
      <Download />
      {isPending ? t("exporting") : t("export")}
    </Button>
  );
}
