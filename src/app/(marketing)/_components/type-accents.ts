// The item type colors of prisma/seed-data.ts. --type-accent is for fills and
// borders, --type-accent-text for text. Not --accent: that one is shadcn's.
// The text colour is darker on a light ground, at least 4.5:1 on white and on
// --raised (ADR 0039); the dark values are the ones the page always had.
export const TYPE_ACCENTS = {
  snippet:
    "[--type-accent:#3b82f6] [--type-accent-text:#2563eb] dark:[--type-accent-text:#60a5fa]",
  prompt:
    "[--type-accent:#8b5cf6] [--type-accent-text:#7c3aed] dark:[--type-accent-text:#a78bfa]",
  command:
    "[--type-accent:#f97316] [--type-accent-text:#c2410c] dark:[--type-accent-text:#f97316]",
  note: "[--type-accent:#fde047] [--type-accent-text:#854d0e] dark:[--type-accent-text:#fde047]",
  file: "[--type-accent:#6b7280] [--type-accent-text:#4b5563] dark:[--type-accent-text:#9ca3af]",
  image:
    "[--type-accent:#ec4899] [--type-accent-text:#be185d] dark:[--type-accent-text:#ec4899]",
  link: "[--type-accent:#10b981] [--type-accent-text:#047857] dark:[--type-accent-text:#10b981]",
};
