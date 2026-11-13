import { redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { UserAvatar } from "@/features/auth/components/UserAvatar";
import { getUserProfile } from "@/features/auth/queries";
import { getSessionUser } from "@/features/auth/nextauth/session";

export async function ProfileInfo() {
  const format = await getFormatter();
  const t = await getTranslations("pages.profile");
  const { id: userId } = await getSessionUser();
  const profile = await getUserProfile(userId);
  if (!profile) redirect("/sign-in");

  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-6">
      <UserAvatar
        name={profile.name}
        email={profile.email}
        image={profile.image}
        className="size-16 **:data-[slot=avatar-fallback]:text-xl"
      />
      <div className="min-w-0">
        {profile.name && (
          <p className="truncate text-lg font-semibold">{profile.name}</p>
        )}
        <p className="truncate text-sm text-muted-foreground">
          {profile.email}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("memberSince", {
            date: format.dateTime(profile.createdAt, "long"),
          })}
        </p>
      </div>
    </div>
  );
}
