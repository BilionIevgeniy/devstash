"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, type RefObject } from "react";

import { Button } from "@/components/ui/button";
import type { ConsentChoice } from "@/lib/consent";
import { PRIVACY_PATH } from "@/lib/http/legal-paths";

const INSET_PROPERTY = "--consent-inset";

// While the banner shows, its height is `--consent-inset` on the root, and the
// scrolling parts of the page add it at their end (`pb-(--consent-inset)` and
// the scroll padding): the last controls and the footer, with its § 312k link,
// can be scrolled out from under the banner, and a focused control is never
// hidden by it (WCAG 2.4.11).
function useBannerInset(regionRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const region = regionRef.current;
    if (!region) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(([entry]) => {
      root.style.setProperty(
        INSET_PROPERTY,
        `${Math.ceil(entry.borderBoxSize[0].blockSize)}px`,
      );
    });
    observer.observe(region);
    return () => {
      observer.disconnect();
      root.style.removeProperty(INSET_PROPERTY);
    };
  }, [regionRef]);
}

interface ConsentBannerViewProps {
  /** The answer given before, when Privacy settings opened the banner again. */
  current: ConsentChoice | null;
  /** Opened on request: the focus moves here, not left at the trigger. */
  takeFocus: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

// A labelled region at the bottom, not a dialog: the page stays usable while
// it shows (ADR 0034). Allow and Decline are the same kind of button, side by
// side, so neither is easier. It sits under the dialog layer (z-40), so an
// open sheet or dialog is never covered by a banner it would make inert.
export function ConsentBannerView({
  current,
  takeFocus,
  onAccept,
  onDecline,
}: ConsentBannerViewProps) {
  const t = useTranslations("common.consent");
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const regionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (takeFocus) headingRef.current?.focus();
  }, [takeFocus]);

  useBannerInset(regionRef);

  return (
    <section
      ref={regionRef}
      aria-labelledby={headingId}
      className="fixed inset-x-0 bottom-0 z-40 p-4"
    >
      <div className="mx-auto max-w-2xl space-y-3 rounded-lg border bg-popover p-4 text-sm text-popover-foreground shadow-lg">
        <h2
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className="font-medium outline-none"
        >
          {t("title")}
        </h2>
        <p className="text-muted-foreground">
          {t("body")}{" "}
          {current && (
            <>
              {t(
                current === "granted" ? "currentGranted" : "currentDenied",
              )}{" "}
            </>
          )}
          <Link
            href={PRIVACY_PATH}
            className="text-foreground underline underline-offset-4"
          >
            {t("privacyNotice")}
          </Link>
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDecline}>
            {t("decline")}
          </Button>
          <Button type="button" variant="outline" onClick={onAccept}>
            {t("accept")}
          </Button>
        </div>
      </div>
    </section>
  );
}
