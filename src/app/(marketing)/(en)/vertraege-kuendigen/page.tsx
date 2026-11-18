import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { getSignedInUserId } from "@/features/auth/nextauth/session";
import { CancelContractForm } from "@/features/billing/components/CancelContractForm";
import { getContractState } from "@/features/billing/queries";

export const metadata: Metadata = {
  title: "Verträge hier kündigen / Cancel contracts here - DevStash",
  description:
    "Kündigung nach § 312k BGB. Cancel your DevStash Pro subscription.",
  alternates: { canonical: "/vertraege-kuendigen" },
};

// The one dynamic page of the legal group (ADR 0032): it reads the session, so
// a signed-in user cancels their own contract without typing it. The footer
// link stays a plain link, so every other page stays static.
export default async function CancelContractsPage() {
  const t = await getTranslations({
    locale: "en",
    namespace: "billing.cancel",
  });
  const userId = await getSignedInUserId();
  const contract = userId ? await getContractState(userId) : null;

  return (
    <main className="marketing-container pt-28 pb-20">
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("lead")}</p>
        <CancelContractForm contract={contract} />
      </div>
    </main>
  );
}
