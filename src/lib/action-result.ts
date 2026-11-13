// The one result contract of the app (ADR 0021): services return an
// OperationResult, Server Actions and JSON routes an ActionResult, and every
// result is built with `ok` or `fail`. The union lets a caller read `data`
// once it has checked `success`, and a failure always has its message. The
// keys are the same for both sides, so the JSON shape never changes.
// Imported by client components too: no server-only, logger or Node import.

export interface Success<T> {
  success: true;
  data: T;
  error: null;
}

export interface Failure {
  success: false;
  data: null;
  error: string;
}

export type OperationResult<T = null> = Success<T> | Failure;

/** The result a Server Action or a JSON route hands to the browser. */
export type ActionResult<T = null> = OperationResult<T>;

/** The text shown when something unexpected failed. */
export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

export function ok(): Success<null>;
export function ok<T>(data: T): Success<T>;
export function ok<T>(data: T | null = null): Success<T | null> {
  return { success: true, data, error: null };
}

export function fail(error: string): Failure {
  return { success: false, data: null, error };
}
