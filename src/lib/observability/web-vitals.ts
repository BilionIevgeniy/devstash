import type { RateLimitPolicy } from "@/lib/vendors/rate-limit";

// Real-user Web Vitals (ADR 0034): what the browser sends after consent and
// what the route takes. Pure and without Zod, since it ships to the browser of
// every page (docs/performance.md).

export const WEB_VITAL_NAMES = ["LCP", "INP", "CLS"] as const;
export type WebVitalName = (typeof WEB_VITAL_NAMES)[number];

// The pages a metric is grouped by: a closed set, so neither the browser nor
// the route ever passes a URL on (it can hold an item id or a token).
const STATIC_GROUPS = [
  "/",
  "/de",
  "/impressum",
  "/datenschutz",
  "/agb",
  "/vertraege-kuendigen",
  "/sign-in",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/switch-account",
  "/dashboard",
  "/favorites",
  "/pinned",
  "/collections",
  "/profile",
  "/settings",
  "/settings/delete-account",
  "/settings/locked-files",
  "/upgrade",
] as const;

const DYNAMIC_GROUPS = [
  { pattern: /^\/items\/[^/]+$/, group: "/items/[type]" },
  { pattern: /^\/items\/[^/]+\/[^/]+$/, group: "/items/[type]/[id]" },
  { pattern: /^\/collections\/[^/]+$/, group: "/collections/[id]" },
] as const;

export type PageGroup =
  | (typeof STATIC_GROUPS)[number]
  | (typeof DYNAMIC_GROUPS)[number]["group"]
  | "other";

const PAGE_GROUPS: ReadonlySet<string> = new Set<string>([
  ...STATIC_GROUPS,
  ...DYNAMIC_GROUPS.map(({ group }) => group),
  "other",
]);

/** The group of a URL path: `/items/snippets/abc` is `/items/[type]/[id]`. */
export function pageGroup(pathname: string): PageGroup {
  const path =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  const exact = STATIC_GROUPS.find((group) => group === path);
  if (exact) return exact;
  return (
    DYNAMIC_GROUPS.find(({ pattern }) => pattern.test(path))?.group ?? "other"
  );
}

// The largest value taken: LCP and INP in milliseconds, CLS without a unit.
// Anything above is a broken clock or a forged request, not a slow page.
const MAX_VALUE: Record<WebVitalName, number> = {
  LCP: 120_000,
  INP: 60_000,
  CLS: 100,
};

export interface WebVital {
  name: WebVitalName;
  value: number;
  group: PageGroup;
}

function isWebVitalName(value: unknown): value is WebVitalName {
  return WEB_VITAL_NAMES.some((name) => name === value);
}

function isPageGroup(value: unknown): value is PageGroup {
  return typeof value === "string" && PAGE_GROUPS.has(value);
}

/** The body the route takes, or null for anything else. */
export function parseWebVital(body: unknown): WebVital | null {
  if (typeof body !== "object" || body === null) return null;
  const { name, value, group } = body as Record<string, unknown>;
  if (!isWebVitalName(name) || !isPageGroup(group)) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > MAX_VALUE[name]) return null;
  return { name, value, group };
}

// A page load reports each metric once; a visitor who moves through a few
// pages a minute stays far below. Counted in the memory of each instance
// (ADR 0034).
export const WEB_VITALS_BY_IP: RateLimitPolicy = {
  name: "web-vitals-ip",
  limit: 30,
  windowSeconds: 60,
};
