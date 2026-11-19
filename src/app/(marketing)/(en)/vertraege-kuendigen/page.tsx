import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { getSignedInUserId } from "@/features/auth/nextauth/session";
import { CancelContractForm } from "@/features/billing/components/CancelContractForm";
import { CancelContractFormSkeleton } from "@/features/billing/components/CancelContractFormSkeleton";
import { getContractState } from "@/features/billing/queries";
import { MAIN_CONTENT_ID } from "@/app/(marketing)/_components/SkipLink";

export const metadata: Metadata = {
  title: "Verträge hier kündigen / Cancel contracts here - DevStash",
  description:
    "Kündigung nach § 312k BGB. Cancel your DevStash Pro subscription.",
  alternates: { canonical: "/vertraege-kuendigen" },
};

// The one page of the legal group that reads the request (ADR 0032): the
// session, so a signed-in user cancels their own contract without typing it.
// The read sits under Suspense, so the title and the lead are the static
// shell and the form streams in (ADR 0037); a read at the top left the
// shell's prefetch unanswered. The footer link stays a plain link, so every
// other page stays static.
export default async function CancelContractsPage() {
  const t = await getTranslations({
    locale: "en",
    namespace: "billing.cancel",
  });

  return (
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className="marketing-container pt-28 pb-20 outline-none"
    >
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("lead")}</p>
        <Suspense fallback={<CancelContractFormSkeleton />}>
          <CancelContract />
        </Suspense>
      </div>
    </main>
  );
}

async function CancelContract() {
  const userId = await getSignedInUserId();
  const contract = userId ? await getContractState(userId) : null;
  return <CancelContractForm contract={contract} />;
}
