"use client";

import { useConsent } from "@/components/common/hooks/use-consent";

import { ConsentBanner } from "./ConsentBanner";
import { WebVitalsReporter } from "./WebVitalsReporter";

// The consent banner and the measurement it allows, for a provider layout
// ((app), (auth) and MarketingFrame), inside its messages; never in the root
// layout, which reads no locale (ADR 0024, ADR 0034). Nothing is measured
// before the answer, and nothing after a Decline: the reporter mounts only on
// Allow, and the send checks the answer again.
export function ConsentRoot() {
  const consent = useConsent();
  return (
    <>
      <ConsentBanner />
      {consent?.choice === "granted" && <WebVitalsReporter />}
    </>
  );
}
