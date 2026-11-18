import "client-only";

import type { useReportWebVitals } from "next/web-vitals";

import { readConsent } from "@/components/common/hooks/use-consent";
import { pageGroup, WEB_VITAL_NAMES } from "@/lib/observability/web-vitals";

type Metric = Parameters<Parameters<typeof useReportWebVitals>[0]>[0];

export const WEB_VITALS_PATH = "/api/vitals";

// What was sent in this document: the observers of web-vitals cannot be
// removed, so a reporter mounted again (another provider layout) registers a
// second set, and both report the same measurement. The value is part of the
// key: INP and CLS are reported again when they grew, and that report goes.
const sent = new Set<string>();

function pathnameOf(url: string | undefined): string {
  if (!url) return window.location.pathname;
  try {
    return new URL(url, window.location.href).pathname;
  } catch {
    return window.location.pathname;
  }
}

// The callback of useReportWebVitals, one function for the whole tab. The
// consent is read again at every metric: the observers outlive a withdrawal,
// so a metric that arrives after Decline is dropped here. Only LCP, INP and
// CLS, with the page's group and never its URL; a failed send is lost.
export function sendWebVital(metric: Metric): void {
  if (!WEB_VITAL_NAMES.some((name) => name === metric.name)) return;
  if (readConsent().choice !== "granted") return;

  const key = [
    metric.name,
    metric.navigationId,
    metric.navigationType,
    metric.navigationURL,
    metric.value,
  ].join("|");
  if (sent.has(key)) return;
  sent.add(key);

  void fetch(WEB_VITALS_PATH, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: metric.name,
      value: metric.value,
      group: pageGroup(pathnameOf(metric.navigationURL)),
    }),
    keepalive: true,
  }).catch(() => undefined);
}

/** Forgets what was sent. For tests only. */
export function forgetSentWebVitals(): void {
  sent.clear();
}
