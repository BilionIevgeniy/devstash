import { getTranslations } from "next-intl/server";

import {
  FREE_COLLECTION_LIMIT,
  FREE_ITEM_LIMIT,
} from "@/features/billing/domain/limits";
import type { Locale } from "@/i18n/config";

import { ScrollFadeIn } from "./ScrollFadeIn";
import { StartAction } from "./StartAction";

export async function CTASection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "marketing.cta" });

  return (
    <section className="marketing-section text-center">
      <ScrollFadeIn className="marketing-container">
        <h2 className="marketing-h2 gradient-text mx-auto w-fit">
          {t("title")}
        </h2>
        <p className="marketing-lead mt-4 mb-8">
          {t("lead", {
            items: FREE_ITEM_LIMIT,
            collections: FREE_COLLECTION_LIMIT,
          })}
        </p>
        <StartAction label={t("button")} className="justify-center" />
      </ScrollFadeIn>
    </section>
  );
}
