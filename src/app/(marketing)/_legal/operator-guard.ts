// The legal pages are drafts until the operator fills in their own facts. A
// fact that is still a placeholder starts with this mark.
export const PLACEHOLDER_MARK = "⟦";

// The names of the facts that still hold a placeholder.
export function findPlaceholders(facts: Record<string, unknown>): string[] {
  return Object.entries(facts)
    .filter(([, value]) => JSON.stringify(value)?.includes(PLACEHOLDER_MARK))
    .map(([name]) => name);
}

// Fails the production build while a placeholder is left, so a draft Impressum
// cannot go live. Previews and local builds pass: they are where the drafts
// are read.
export function assertOperatorComplete(
  facts: Record<string, unknown>,
  vercelEnv: string | undefined,
): void {
  if (vercelEnv !== "production") return;

  const missing = findPlaceholders(facts);
  if (missing.length === 0) return;
  throw new Error(
    `The legal pages still hold placeholders for: ${missing.join(", ")}. Fill them in src/app/(marketing)/_legal/operator.ts.`,
  );
}
