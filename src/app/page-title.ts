import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

/** The namespaces whose `title` names a page of the app or the auth pages. */
export type TitleNamespace =
  | "pages.dashboard"
  | "pages.favorites"
  | "pages.pinned"
  | "pages.collections"
  | "pages.profile"
  | "pages.settings"
  | "pages.lockedFiles"
  | "billing.upgradePage"
  | "auth.signIn"
  | "auth.register"
  | "auth.forgot"
  | "auth.reset"
  | "auth.verify"
  | "auth.switch.other";

// A page's title in the language of the request (WCAG 2.4.2), for the
// template of its group's layout ("Dashboard | DevStash"). In the page, not
// the layout: next dev's instant validation accepts a page's metadata that
// reads the request, and refused the layout's (ADR 0037 addendum).
export function titleOf(namespace: TitleNamespace) {
  return async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations(namespace);
    return { title: t("title") };
  };
}

/** The template of the app's and the auth pages' titles. */
export const TITLE_TEMPLATE = {
  default: "DevStash",
  template: "%s | DevStash",
};
