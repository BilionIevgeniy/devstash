import { Settings } from "lucide-react";
import { redirect } from "next/navigation";

import { DeleteAccountDialog } from "@/features/account/components/DeleteAccountDialog";
import { REAUTH_WRONG_ACCOUNT } from "@/features/auth/domain/reauth";
import { needsReauthentication } from "@/features/auth/services/account";
import { ChangePasswordForm } from "@/features/auth/components/ChangePasswordForm";
import { getUserProfile } from "@/features/auth/queries";
import { getSessionUser } from "@/features/auth/nextauth/session";

interface AccountActionsProps {
  searchParams: Promise<{ reauth?: string | string[] }>;
}

export async function AccountActions({ searchParams }: AccountActionsProps) {
  const { id: userId, authenticatedAt } = await getSessionUser();
  const [profile, { reauth }] = await Promise.all([
    getUserProfile(userId),
    searchParams,
  ]);
  if (!profile) redirect("/sign-in");

  const requiresReauth = needsReauthentication(
    profile.hasPassword,
    authenticatedAt,
  );

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Settings className="size-4 text-muted-foreground" />
        Account
      </h2>
      {profile.hasPassword && <ChangePasswordForm />}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-card p-6">
        <div>
          <h3 className="font-medium">Delete account</h3>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all of your data.
          </p>
        </div>
        <DeleteAccountDialog
          hasPassword={profile.hasPassword}
          requiresReauth={requiresReauth}
          // The URL can outlive the refusal: after a good sign-in it means nothing.
          returnError={
            requiresReauth && reauth === REAUTH_WRONG_ACCOUNT
              ? "wrongGithubAccount"
              : null
          }
        />
      </div>
    </section>
  );
}
