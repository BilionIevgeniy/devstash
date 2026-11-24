import "client-only";

// Whether this document has shown the app shell. A session that ended on the
// server (it expired, or a password change on another device revoked it)
// reaches the auth pages through a soft redirect, with the user's routes still
// mounted but hidden in the document (ADR 0037). The auth pages ask this and
// load themselves again as a new document.
let appShellShown = false;

export function markAppShellShown(): void {
  appShellShown = true;
}

export function hasShownAppShell(): boolean {
  return appShellShown;
}
