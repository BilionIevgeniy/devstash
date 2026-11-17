// The machine-readable mark of an AI output in the markup (ADR 0027): every
// element that shows a marked value spreads these props, so the attribute has
// one spelling.
export function aiMarkProps(marked: boolean): { "data-ai-generated"?: "true" } {
  return marked ? { "data-ai-generated": "true" } : {};
}
