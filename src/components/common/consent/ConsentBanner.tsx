"use client";

import { setConsent, useConsent } from "@/components/common/hooks/use-consent";

import { ConsentBannerView } from "./ConsentBannerView";

// Nothing until the stored answer has been read, nothing once it is given,
// and the banner again when Privacy settings asks for it.
export function ConsentBanner() {
  const consent = useConsent();
  if (!consent) return null;
  if (consent.choice !== null && !consent.reopened) return null;

  return (
    <ConsentBannerView
      current={consent.choice}
      takeFocus={consent.reopened}
      onAccept={() => setConsent("granted")}
      onDecline={() => setConsent("denied")}
    />
  );
}
