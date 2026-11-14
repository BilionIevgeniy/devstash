import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { CollectionCard } from "@/features/collections/components/CollectionCard";
import { getRecentCollections } from "@/features/collections/queries";
import { getSessionUser } from "@/features/auth/nextauth/session";

export async function RecentCollections() {
  const t = await getTranslations("pages.dashboard");
  const { id: userId } = await getSessionUser();
  const collections = await getRecentCollections(userId);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("collections")}</h2>
        <Link
          href="/collections"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t("viewAll")}
        </Link>
      </div>
      {collections.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noCollections")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </section>
  );
}
