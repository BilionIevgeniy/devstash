import type { Metadata } from "next";

import { contractContent } from "../../_components/legal/contract-content";
import { LegalPage } from "../../_components/legal/LegalPage";

// Static, and the build fails if a change makes it read the request
// (ADR 0024, ADR 0037).
export const ensureStatic = "navigation";

export const metadata: Metadata = {
  title: "AGB / Terms - DevStash",
  description:
    "Allgemeine Geschäftsbedingungen und Widerrufsbelehrung. Terms and withdrawal information for DevStash.",
  // Both languages on one URL, so no hreflang.
  alternates: { canonical: "/agb" },
};

export default async function AgbPage() {
  const [de, en] = await Promise.all([
    contractContent("de"),
    contractContent("en"),
  ]);
  return <LegalPage slug="agb" de={de} en={en} />;
}
