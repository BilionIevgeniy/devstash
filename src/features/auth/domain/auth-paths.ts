// The sign-in page: where a signed-out visitor is sent, and where the auth
// flows lead after a confirmed email, a reset password or a deleted session.
// The proxy's noindex list (lib/http/noindex-paths.ts), the e2e tests and the
// typed route key keep the literal: lib cannot import a feature, and a test
// pins the public URL.
export const SIGN_IN_PATH = "/sign-in";
