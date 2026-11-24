import "client-only";

// Where the browser goes once a session has ended (a sign-out, a password
// change, a deleted account): a full page load, never a soft navigation. Next
// keeps the routes a user left mounted but hidden (ADR 0037), and only a new
// document drops them, so Back cannot show the last user's pages on a shared
// machine. `replace`, so the history entry of the ended session is gone too.
// A function of its own as the boundary a test mocks: jsdom has no
// `location.replace`.
export function leaveSession(to: string): void {
  window.location.replace(to);
}
