// The vendors the privacy notice names. Keep in step with
// docs/privacy/processing-record.md. Each language of the notice holds a
// `Record<VendorId, string>`, so a vendor added here fails the typecheck
// until both texts cover it.
export const VENDOR_IDS = [
  "vercel",
  "neon",
  "cloudflare",
  "openai",
  "stripe",
  "resend",
  "upstash",
  "sentry",
  "github",
] as const;

export type VendorId = (typeof VENDOR_IDS)[number];

export interface Vendor {
  name: string;
  /** The vendor's own privacy notice, linked from the privacy notice. */
  privacyUrl: string;
}

export const VENDORS: Record<VendorId, Vendor> = {
  vercel: {
    name: "Vercel Inc.",
    privacyUrl: "https://vercel.com/legal/privacy-notice",
  },
  neon: {
    name: "Neon (Databricks, Inc.)",
    privacyUrl: "https://www.databricks.com/legal/privacynotice",
  },
  cloudflare: {
    name: "Cloudflare, Inc.",
    privacyUrl: "https://www.cloudflare.com/privacypolicy/",
  },
  openai: {
    name: "OpenAI",
    privacyUrl: "https://openai.com/policies/privacy-policy/",
  },
  stripe: { name: "Stripe", privacyUrl: "https://stripe.com/privacy" },
  resend: {
    name: "Resend",
    privacyUrl: "https://resend.com/legal/privacy-policy",
  },
  upstash: {
    name: "Upstash",
    privacyUrl: "https://upstash.com/trust/privacy.pdf",
  },
  sentry: {
    name: "Sentry (Functional Software, Inc.)",
    privacyUrl: "https://sentry.io/privacy/",
  },
  github: {
    name: "GitHub (Microsoft)",
    privacyUrl:
      "https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement",
  },
};
