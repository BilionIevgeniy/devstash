import { useFormatter, useTranslations } from "next-intl";

import {
  planFeatureCount,
  proPriceDisplay,
  type PlanFeature,
} from "@/features/billing/domain/limits";

export interface PlanCardText {
  name: string;
  price: string;
  note: string;
}

// The words of the pricing cards in the locale of the page: the homepage and
// the upgrade page show the same plans. Prices are formatted for the locale
// ("$8", "8 $").
export function usePlanText() {
  const t = useTranslations("billing");
  const format = useFormatter();
  const price = (amount: number) => format.number(amount, "price");

  function features(keys: readonly PlanFeature[]): string[] {
    return keys.map((key) =>
      t(`features.${key}`, { count: planFeatureCount(key) ?? 0 }),
    );
  }

  const free: PlanCardText = {
    name: t("plans.free"),
    price: price(0),
    note: t("plans.freeForever"),
  };

  function pro(yearly: boolean): PlanCardText {
    const { perMonth, yearlyTotal } = proPriceDisplay(yearly);
    return {
      name: t("plans.pro"),
      price: price(perMonth),
      note:
        yearlyTotal === null
          ? t("plans.billedMonthly")
          : t("plans.billedYearly", { total: price(yearlyTotal) }),
    };
  }

  return { t, features, free, pro };
}
