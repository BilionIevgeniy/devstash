"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { downloadExport } from "@/features/import-export/_internal/components/fetch-export";

// The browser saves the file itself, so success needs no toast.
export function ExportButton() {
  const [isPending, setIsPending] = useState(false);

  async function exportData() {
    setIsPending(true);
    const { error } = await downloadExport();
    setIsPending(false);
    if (error) toast.error(error);
  }

  return (
    <Button type="button" disabled={isPending} onClick={exportData}>
      <Download />
      {isPending ? "Exporting…" : "Export JSON"}
    </Button>
  );
}
