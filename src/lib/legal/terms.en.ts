import type { PlainLegalDocument } from "@/lib/legal/types";

// Version 2026-11-18 (TERMS_VERSION in terms.ts). A change of meaning is a new
// version: the old text moves to terms-archive/ with its values written out.
export const TERMS_EN: PlainLegalDocument = {
  title: "Terms and Conditions",
  sections: [
    {
      id: "scope",
      heading: "1. Scope and provider",
      blocks: [
        "These terms apply to every contract for the use of DevStash between you and the provider {operatorName}, {operatorAddress}, email {operatorEmail}, phone {operatorPhone}. The German version is the binding one.",
        "DevStash currently runs in test mode: payments are only simulated with test cards, and no money is charged.",
      ],
    },
    {
      id: "subject",
      heading: "2. Services",
      blocks: [
        "DevStash is an online service in which you store, organise and search snippets, prompts, notes, commands, links, files and images.",
        {
          items: [
            "Free: no charge, up to {freeItemLimit} items and {freeCollectionLimit} collections, without uploads, custom types or AI features.",
            "Pro: unlimited items and collections, file and image uploads, custom item types and AI features, for {monthlyPrice} a month or {yearlyPrice} a year.",
          ],
        },
      ],
    },
    {
      id: "contract",
      heading: "3. How the contract is made",
      blocks: [
        "You choose the monthly or yearly Pro plan on the upgrade page or in the settings. Before you order, you see the plan, the total price, the term and the renewal, accept these terms and, if you wish, the immediate start (section 8).",
        "Clicking “Order and pay” takes you to the payment page of our payment provider Stripe. There you enter your payment details; submitting the payment is your binding offer. The contract is made once the payment is confirmed. You receive the contract confirmation with these terms and the withdrawal information by email.",
        "The contract language is German or English. We do not keep the contract text for you to retrieve; the confirmation email contains it in full.",
      ],
    },
    {
      id: "prices",
      heading: "4. Prices and payment",
      blocks: [
        "All prices are final prices in euros and include VAT. The tax follows your country of residence and is shown on the payment page.",
        "The price is due in advance for each term and is collected by card through Stripe.",
      ],
    },
    {
      id: "term",
      heading: "5. Term and cancellation",
      blocks: [
        "The subscription runs for one month or one year and renews for the same term unless you cancel it.",
        "You can cancel at any time, with effect at the end of the current term and without giving a reason: through the “Verträge hier kündigen” (cancel contracts here) button linked on every page, through billing management in the settings, or in text form to {operatorEmail}. The right to terminate for good cause is not affected.",
      ],
    },
    {
      id: "default",
      heading: "6. Failed payments",
      blocks: [
        "If a renewal payment fails, you keep Pro and Stripe retries the payment for about two weeks. If it has not succeeded by then, the subscription ends and your account moves to Free. Your data is kept.",
      ],
    },
    {
      id: "downgrade",
      heading: "7. When Pro ends",
      blocks: [
        "When Pro ends, all your data is kept. From then on:",
        {
          items: [
            "Viewing, copying, searching, exporting and deleting always stay possible, as do favourites, pinning and collections.",
            "If you have more than {freeItemLimit} items, you can no longer edit the content of items until you are under the limit or have Pro again. You create new items only below the limit.",
            "Your custom item types and their items stay visible. New custom types and new items of a custom type need Pro again.",
            "Files and images stay stored but can only be opened again with Pro.",
          ],
        },
      ],
    },
    {
      id: "withdrawal",
      heading: "8. Right of withdrawal",
      blocks: [
        "As a consumer you have a right of withdrawal as set out in the withdrawal information below.",
        "Pro starts right after the payment if, before ordering, you expressly agree that we begin the service before the withdrawal period ends and confirm that you know your right of withdrawal ends with that (§ 356 (5) BGB). An order is not possible without this consent.",
      ],
    },
    {
      id: "availability",
      heading: "9. Availability and liability",
      blocks: [
        "We aim for uninterrupted operation but do not owe constant availability. Maintenance and faults beyond our control can interrupt access for a time.",
        "We are liable without limit for intent and gross negligence, for injury to life, body or health and under the Product Liability Act. For a slightly negligent breach of an essential contractual duty, liability is limited to the foreseeable damage typical of the contract; otherwise liability for slight negligence is excluded.",
      ],
    },
    {
      id: "final",
      heading: "10. Final provisions",
      blocks: [
        "German law applies. If you are a consumer habitually resident in another EU state, the mandatory consumer protection rules of that state still apply to you.",
        "We are neither willing nor obliged to take part in dispute resolution before a consumer arbitration board.",
        "How we process your data is set out in the privacy notice.",
      ],
    },
  ],
};
