// The user of the end-to-end tests. The email is new for every run: the
// per-email sign-in limit lives in Upstash and outlasts the database, so the
// global setup of Playwright makes one up and hands it to the seed and to the
// workers through this variable. The password is the same every time.
export const E2E_USER_EMAIL_VAR = "E2E_USER_EMAIL";
export const E2E_USER_PASSWORD = "e2e-test-password";

// A second user for the endless lists (e2e/infinite-lists.spec.ts): more
// favorites and pins than a page holds, written by the seed. Its email follows
// the run's, so it is new every run too.
export const E2E_LIST_ROWS = 40;

export function listsUserEmail(runEmail: string): string {
  return `lists-${runEmail}`;
}

export function requireE2eUserEmail(): string {
  const email = process.env[E2E_USER_EMAIL_VAR];
  if (!email) {
    throw new Error(
      `${E2E_USER_EMAIL_VAR} is not set: the global setup of Playwright makes it up`,
    );
  }
  return email;
}
