import type * as Real from "@/lib/sentry";

// Stands in for `@/lib/sentry` under Vitest (vitest.shared.mts), so a module
// that logs does not load the Sentry SDK and its Node and OpenTelemetry
// packages. Nothing is sent and every call returns at once. A test of the
// logger, or of lib/sentry.ts itself, replaces it with `vi.mock` and a factory,
// or imports the real file by its relative path.
export function sentryBaseOptions(): object {
  return {};
}

export function initSentryClient(): void {}

export function captureSafeError(): void {}

export function onRequestError(): void {}

export async function flushSentry(): Promise<void> {}

// The compiler checks the stub against the real file: an export that
// lib/sentry.ts gains and this file lacks is `undefined` only inside the tests,
// and this line turns that into a type error instead.
export const STUB_COVERS_THE_REAL_MODULE: Exclude<
  keyof typeof Real,
  keyof typeof import("./sentry")
> extends never
  ? true
  : false = true;
