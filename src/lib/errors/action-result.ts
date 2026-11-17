// The one result contract of the app (ADR 0021): services return an
// OperationResult, Server Actions and JSON routes an ActionResult, and every
// result is built with `ok` or `fail`. The union lets a caller read `data`
// once it has checked `success`, and a failure always has its code. The keys
// are the same for both sides, so the JSON shape never changes. A failure
// carries a code, never a sentence (ADR 0022): the component that shows it
// turns it into words.
// Imported by client components too: no server-only, logger or Node import.

import {
  errorRef,
  toErrorRef,
  type ErrorArgs,
  type ErrorCode,
  type ErrorRef,
} from "@/i18n/error-codes";

export interface Success<T> {
  success: true;
  data: T;
  error: null;
}

export interface Failure extends ErrorRef {
  success: false;
  data: null;
}

export type OperationResult<T = null> = Success<T> | Failure;

/** The result a Server Action or a JSON route hands to the browser. */
export type ActionResult<T = null> = OperationResult<T>;

export function ok(): Success<null>;
export function ok<T>(data: T): Success<T>;
export function ok<T>(data: T | null = null): Success<T | null> {
  return { success: true, data, error: null };
}

/** A failure with its code, and the params its message needs. */
export function fail<Code extends ErrorCode>(
  code: Code,
  ...params: ErrorArgs<Code>
): Failure {
  return failFrom(errorRef(code, ...params));
}

/** A failure whose code is known only at run time (a refused input, a route). */
export function failFrom(ref: ErrorRef): Failure {
  return { success: false, data: null, ...toErrorRef(ref) };
}
