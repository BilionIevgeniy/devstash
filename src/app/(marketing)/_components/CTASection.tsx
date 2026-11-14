import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import {
  FREE_COLLECTION_LIMIT,
  FREE_ITEM_LIMIT,
} from "@/features/billing/domain/limits";
import type { Locale } from "@/i18n/config";

import { ScrollFadeIn } from "./ScrollFadeIn";

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
        <Button asChild size="lg" className="h-11 px-5 text-[15px]">
          <Link href="/register">{t("button")}</Link>
        </Button>
      </ScrollFadeIn>
    </section>
  );
}
