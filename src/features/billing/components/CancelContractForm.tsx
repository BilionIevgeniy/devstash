"use client";

import { Loader2 } from "lucide-react";
import { createTranslator, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useErrorText } from "@/components/common/hooks/use-error-text";
import { bilingualDate } from "@/features/billing/_internal/components/cancel/bilingual-date";
import { CancellationFields } from "@/features/billing/_internal/components/cancel/CancellationFields";
import { DeclarationRecord } from "@/features/billing/_internal/components/cancel/DeclarationRecord";
import { useCancellation } from "@/features/billing/_internal/components/hooks/use-cancellation";
import {
  CANCELLATION_KINDS,
  type ContractState,
} from "@/features/billing/domain/cancellation";
import type { ErrorRef } from "@/i18n/error-codes";
import { errorTextFrom } from "@/i18n/error-text";
import deErrors from "@/i18n/messages/de/errors.json";

// The page is one page for every visitor (ADR 0032), so a refusal is said in
// German and in English like its labels; the provider holds English only.
const germanErrorText = errorTextFrom(
  createTranslator({
    locale: "de",
    messages: { errors: deErrors },
    namespace: "errors",
  }),
);

function BilingualError({ error }: { error: ErrorRef }) {
  const errorText = useErrorText();
  return (
    <p role="alert" className="text-sm text-destructive">
      <span lang="de">{germanErrorText(error)}</span> /{" "}
      <span lang="en">{errorText(error)}</span>
    </p>
  );
}

const EXTRAORDINARY_ONLY = ["extraordinary"] as const;

interface CancelContractFormProps {
  /** Null for a visitor who is not signed in. */
  contract: ContractState | null;
}

function ContractLine({ contract }: { contract: ContractState }) {
  const t = useTranslations("billing.cancel");
  if (contract.status === "none") return <p>{t("none")}</p>;

  const dates = contract.periodEnd
    ? bilingualDate(new Date(contract.periodEnd), "long")
    : null;
  const key = contract.status === "cancelling" ? "cancelling" : "live";
  return (
    <p>
      {t("contract")} · {dates ? t(key, dates) : t(`${key}NoDate`)}
    </p>
  );
}

// The § 312k BGB page's form (ADR 0032). Signed in, the session names the
// contract; signed out, the name and the account's email do. Either way the
// submission is the declaration, and the screen then shows its record.
export function CancelContractForm({ contract }: CancelContractFormProps) {
  const t = useTranslations("billing.cancel");
  const signedIn = contract !== null;
  const [state, formAction, isPending] = useCancellation(signedIn);

  if (state.declaredAt) {
    return (
      <DeclarationRecord
        values={state.values}
        declaredAt={state.declaredAt}
        signedIn={signedIn}
      />
    );
  }

  const canCancel = !signedIn || contract.status !== "none";
  // A contract that already ends can still be ended sooner, for good cause
  // (cancelOwnSubscription tells the operator).
  const kinds =
    contract?.status === "cancelling" ? EXTRAORDINARY_ONLY : CANCELLATION_KINDS;
  return (
    <div className="space-y-6">
      {contract && <ContractLine contract={contract} />}
      {canCancel && (
        <form action={formAction} className="space-y-4">
          <CancellationFields
            values={state.values}
            signedIn={signedIn}
            kinds={kinds}
            disabled={isPending}
          />
          {state.error && !isPending && <BilingualError error={state.error} />}
          <Button type="submit" disabled={isPending}>
            {isPending && (
              <Loader2 className="animate-spin" aria-hidden="true" />
            )}
            {isPending ? t("pending") : t("submit")}
          </Button>
        </form>
      )}
    </div>
  );
}
