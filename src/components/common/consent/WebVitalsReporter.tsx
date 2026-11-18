"use client";

import { useReportWebVitals } from "next/web-vitals";

import { sendWebVital } from "./send-web-vital";

// Mounted only once the visitor has allowed the measurement (ConsentRoot). The
// callback is one module function, so its identity never changes and the hook
// registers its observers once per mount, as Next asks.
export function WebVitalsReporter() {
  useReportWebVitals(sendWebVital);
  return null;
}
