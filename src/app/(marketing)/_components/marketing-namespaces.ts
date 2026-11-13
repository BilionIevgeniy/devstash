import type { Namespace } from "@/i18n/messages";

// The namespaces the client components of the static marketing pages read
// (Navbar, Logo, PricingSection and what they render). A static page sends
// only these (ADR 0024); a namespace missing here shows its raw key, so
// marketing-namespaces.test.tsx renders the navbar with exactly this list.
export const MARKETING_NAMESPACES = [
  "marketing",
  "billing",
  "common",
] as const satisfies readonly Namespace[];
