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

// Its collections: three pages of /collections, and one collection that holds
// the 40 rows, two pages of it (e2e/paging.spec.ts).
export const E2E_LIST_COLLECTIONS = 45;
export const E2E_PAGED_COLLECTION = "Paged collection";

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

// A third user on the Pro plan, for the AI journey (e2e/ai-marking.spec.ts):
// the run's own user stays Free, so the Free limits keep applying to it.
export function proUserEmail(runEmail: string): string {
  return `pro-${runEmail}`;
}

// A fourth user, a former Pro user over the Free item limit with a custom
// type, for the downgrade journey (e2e/downgrade.spec.ts). Its own account, so
// the run's user stays under the limit for the create journeys.
export const E2E_OVER_LIMIT_ROWS = 51;
export const E2E_KEPT_TYPE = "Recipe";

export function overLimitUserEmail(runEmail: string): string {
  return `over-${runEmail}`;
}

// A fifth user with fixed rows and no writes, for the screenshots and the
// accessibility scans (scripts/e2e-visual-user.ts).
export function visualUserEmail(runEmail: string): string {
  return `visual-${runEmail}`;
}

// A sixth user on the Pro plan whose rows fill the loading states
// (e2e/skeletons.spec.ts, scripts/e2e-skeleton-user.ts); nothing writes to it.
export function skeletonUserEmail(runEmail: string): string {
  return `skeleton-${runEmail}`;
}

// The favorites of the Pro user of the 500-row profile of /favorites
// (scripts/e2e-fixture.ts, e2e/perf/; not part of CI).
export const E2E_MANY_FAVORITES = 500;
