import { titleOf } from "@/app/page-title";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "@/features/auth/nextauth/auth";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { SwitchAccountButton } from "@/features/auth/components/SwitchAccountButton";
import {
  DASHBOARD_PATH,
  SIGN_IN_PATH,
} from "@/features/auth/domain/auth-paths";
import { accountSwitchReasonSchema } from "@/features/auth/schemas";
import { Button } from "@/components/ui/button";

// Where an email link finished while the browser is signed in with another
// account, or where a refused GitHub sign-in lands. Without a session there is
// nothing to switch from, so the sign-in page takes over.
// Reads the request at its top (the session, or the link's query), so the page
// blocks on the server and has no instant shell (ADR 0037).
export const instant = false;

export const generateMetadata = titleOf("auth.switch.other");

export default async function SwitchAccountPage({
  searchParams,
}: PageProps<"/switch-account">) {
  const session = await auth();
  if (!session?.user) redirect(SIGN_IN_PATH);

  const reason =
    accountSwitchReasonSchema.parse((await searchParams).reason) ?? "other";
  const t = await getTranslations("auth.switch");

  return (
    <AuthCard
      title={t(`${reason}.title`)}
      description={t(`${reason}.description`)}
    >
      {session.user.email && (
        <p className="text-center text-sm text-muted-foreground">
          {t("signedInAs", { email: session.user.email })}
        </p>
      )}
      <SwitchAccountButton />
      <Button asChild variant="outline" size="lg" className="w-full">
        <Link href={DASHBOARD_PATH}>{t("stay")}</Link>
      </Button>
    </AuthCard>
  );
}
