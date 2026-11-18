"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { bilingualDate } from "@/features/billing/_internal/components/cancel/bilingual-date";
import type { CancellationValues } from "@/features/billing/_internal/components/hooks/use-cancellation";

interface DeclarationRecordProps {
  values: CancellationValues;
  declaredAt: string;
  signedIn: boolean;
}

// What the consumer declared and when (§ 312k (3) BGB), on screen to print or
// save: the email confirmation may not reach an address that has no account.
export function DeclarationRecord({
  values,
  declaredAt,
  signedIn,
}: DeclarationRecordProps) {
  const t = useTranslations("billing.cancel");
  const lines = [
    t("doneAt", bilingualDate(new Date(declaredAt), "longWithTime")),
    t("contract"),
    t("doneKind", { kind: values.kind }),
    ...(signedIn
      ? []
      : [
          t("doneName", { name: values.name }),
          t("doneEmail", { email: values.email }),
        ]),
    ...(values.kind === "extraordinary" && values.reason
      ? [t("doneReason", { reason: values.reason })]
      : []),
  ];

  return (
    <section
      aria-labelledby="cancel-done"
      className="space-y-3 rounded-lg border p-6"
    >
      <h2 id="cancel-done" className="text-xl font-semibold">
        {t("doneTitle")}
      </h2>
      {lines.map((line) => (
        <p key={line} className="wrap-break-word">
          {line}
        </p>
      ))}
      <p className="text-sm text-muted-foreground">{t("doneNote")}</p>
      <Button
        variant="outline"
        onClick={() => window.print()}
        className="print:hidden"
      >
        <Printer aria-hidden="true" />
        {t("print")}
      </Button>
    </section>
  );
}
