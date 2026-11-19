// The end-to-end build compiles a few extra routes that throw on purpose
// (src/app/(e2e)/, files named *.e2e.tsx or *.e2e.ts) for the check of what
// leaves the app (e2e/egress.spec.ts, ADR 0016). They exist only when
// E2E_BUILD=1, which only the env map of scripts/e2e-server-env.ts sets. A
// Vercel build refuses it: those routes throw on demand, with any input.

export const APP_PAGE_EXTENSIONS = ["tsx", "ts"];
const E2E_PAGE_EXTENSIONS = ["e2e.tsx", "e2e.ts"];

export function pageExtensionsFor(env: {
  E2E_BUILD?: string;
  VERCEL?: string;
}): string[] {
  if (env.E2E_BUILD !== "1") return APP_PAGE_EXTENSIONS;
  if (env.VERCEL) {
    throw new Error("E2E_BUILD must never be set on a Vercel deployment");
  }
  return [...APP_PAGE_EXTENSIONS, ...E2E_PAGE_EXTENSIONS];
}
