// The two pages the auth flows lead to: the sign-in page, where a signed-out
// visitor is sent and where the flows end after a confirmed email, a reset
// password or a deleted session; and the dashboard, where a signed-in user
// lands. The proxy's noindex list (lib/http/noindex-paths.ts), the e2e tests
// and the typed route key keep the literals: lib cannot import a feature, and
// a test pins the public URL.
export const SIGN_IN_PATH = "/sign-in";
export const DASHBOARD_PATH = "/dashboard";
// What the sign-in page says after a password change signed the user out; it
// comes in the URL, since the page is in another layout than the form.
export const PASSWORD_CHANGED_NOTICE = "password-changed";
export const SIGN_IN_AFTER_PASSWORD_CHANGE_PATH = `${SIGN_IN_PATH}?notice=${PASSWORD_CHANGED_NOTICE}`;
// The settings page, where a flow that ends in the account's own settings
// (checkout, a locked file, the deletion link) leads back to.
export const SETTINGS_PATH = "/settings";
