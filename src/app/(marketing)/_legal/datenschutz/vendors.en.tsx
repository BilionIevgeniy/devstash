import { VendorList } from "../../_components/VendorList";
import type { LegalSection } from "../types";
import type { VendorId } from "../vendors";

const TEXTS: Record<VendorId, string> = {
  vercel:
    "Hosting and delivery of the website and the application. Every visit creates server logs with the IP address and request data. The application runs in the Washington, D.C. region (USA). Legal basis: Art. 6 (1) f GDPR.",
  neon: "Database: stores your account and all your content except files. Location: AWS region us-east-2 (Ohio, USA). Legal basis: Art. 6 (1) b GDPR.",
  cloudflare:
    "Cloudflare R2: non-public storage for uploaded files and images. They can be retrieved only through short-lived signed addresses. Legal basis: Art. 6 (1) b GDPR.",
  openai:
    "Language model for the AI functions, only after your click (see AI functions). Legal basis: Art. 6 (1) b GDPR.",
  stripe:
    "Handling the Pro subscription through Stripe hosted payment page. We pass on your email address and user id; you enter payment details at Stripe and we never see them. Stripe processes some data on our behalf and some under its own responsibility, for example to prevent fraud. Currently test mode. Legal basis: Art. 6 (1) b GDPR.",
  resend:
    "Sending the emails that confirm your address and reset your password. Resend receives the recipient address and the content of the email. Legal basis: Art. 6 (1) b GDPR.",
  upstash:
    "Redis database for limiting requests. Upstash receives only SHA-256 hashes of email addresses, IP addresses and user ids, and counters. Legal basis: Art. 6 (1) f GDPR.",
  github:
    "Sign-in with GitHub: GitHub processes the sign-in under its own responsibility according to its privacy statement; we receive your GitHub account id, name, email address and the address of your profile picture. When you are signed in with GitHub and have a profile picture, your browser loads it directly from GitHub servers, so GitHub learns your IP address. Legal basis: Art. 6 (1) b GDPR for the sign-in, point f for loading the picture.",
};

export const VENDORS_EN: LegalSection[] = [
  {
    id: "vendors",
    heading: "Recipients, service providers and transfers to the USA",
    body: (
      <>
        <p>
          We use the service providers below. Unless stated otherwise, they
          process data on our behalf and under the data processing terms that
          each provider offers its customers (Art. 28 GDPR). All are US
          companies or part of US groups. Depending on the provider, transfers
          rely on the adequacy decision for the EU-US Data Privacy Framework or
          on the standard contractual clauses of the European Commission (Art.
          45 and 46 GDPR). You can get a copy of the safeguards on request.
        </p>
        <VendorList texts={TEXTS} linkLabel="Provider privacy notice" />
      </>
    ),
  },
];
