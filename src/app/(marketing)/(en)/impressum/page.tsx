import type { Metadata } from "next";

import { LegalPage } from "../../_components/legal/LegalPage";
import { IMPRESSUM_DE } from "../../_legal/impressum.de";
import { IMPRESSUM_EN } from "../../_legal/impressum.en";

// Static, and the build fails if a change makes it read the request
// (ADR 0024, ADR 0037).
export const ensureStatic = "navigation";

export const metadata: Metadata = {
  title: "Impressum / Imprint - DevStash",
  description:
    "Anbieterkennzeichnung nach § 5 DDG. Provider information for DevStash.",
  // Both languages on one URL, so no hreflang.
  alternates: { canonical: "/impressum" },
};

export default function ImpressumPage() {
  return <LegalPage slug="impressum" de={IMPRESSUM_DE} en={IMPRESSUM_EN} />;
}
