// Where the setup project saves the signed-in session. Relative to the root of
// the repository, where `npm run test:e2e` runs; the folder is in .gitignore.
export const AUTH_FILE = "playwright/.auth/user.json";

// A visitor who has not signed in: a spec uses it with `test.use` instead of
// the saved session of the setup.
export const SIGNED_OUT = { cookies: [], origins: [] };
