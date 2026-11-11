// The user of the end-to-end tests. The email is new for every run: the
// per-email sign-in limit lives in Upstash and outlasts the database, so the
// global setup of Playwright makes one up and hands it to the seed and to the
// workers through this variable. The password is the same every time.
export const E2E_USER_EMAIL_VAR = "E2E_USER_EMAIL";
export const E2E_USER_PASSWORD = "e2e-test-password";

export function requireE2eUserEmail(): string {
  const email = process.env[E2E_USER_EMAIL_VAR];
  if (!email) {
    throw new Error(
      `${E2E_USER_EMAIL_VAR} is not set: the global setup of Playwright makes it up`,
    );
  }
  return email;
}
