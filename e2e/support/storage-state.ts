// Where the setup project saves the signed-in session. Relative to the root of
// the repository, where `npm run test:e2e` runs; the folder is in .gitignore.
export const AUTH_FILE = "playwright/.auth/user.json";

// The session of the second user, who has the long lists (scripts/seed-e2e.ts).
export const LISTS_AUTH_FILE = "playwright/.auth/lists-user.json";

// The session of the Pro user of the AI journey (scripts/seed-e2e.ts).
export const PRO_AUTH_FILE = "playwright/.auth/pro-user.json";

// The session of the former Pro user over the Free limit (scripts/seed-e2e.ts).
export const OVER_LIMIT_AUTH_FILE = "playwright/.auth/over-limit-user.json";

import { CONSENT_STORAGE_KEY, serializeConsent } from "../../src/lib/consent";

// The origin of the test server (playwright.config.ts). Not 3000: a `npm run
// dev` on the usual port must not be mistaken for the test server.
export const E2E_PORT = 3100;
export const E2E_ORIGIN = `http://localhost:${E2E_PORT}`;

// A stored answer to the consent banner, so the banner does not cover the
// footer and the buttons of the journeys; only e2e/consent.spec.ts meets it.
export const ANSWERED_CONSENT = {
  name: CONSENT_STORAGE_KEY,
  value: serializeConsent("denied"),
};

// A visitor who has not signed in and has answered the banner: a spec uses it
// with `test.use` instead of the saved session of the setup.
export const SIGNED_OUT = {
  cookies: [],
  origins: [{ origin: E2E_ORIGIN, localStorage: [ANSWERED_CONSENT] }],
};

// A visitor on the first visit: no session and no answer to the banner.
export const FRESH_VISITOR = { cookies: [], origins: [] };
