// The desktop sidebar's open state, kept in a cookie so a reload renders it as
// the user left it, without a flash. Read by the layout, written by the shell.
export const SIDEBAR_COOKIE = "sidebar-open";
const YEAR_SECONDS = 60 * 60 * 24 * 365;

// Open unless the cookie says exactly "false": a missing or odd value keeps
// the default.
export function parseSidebarOpen(value: string | undefined): boolean {
  return value !== "false";
}

export function sidebarCookie(isOpen: boolean): string {
  return `${SIDEBAR_COOKIE}=${isOpen}; path=/; max-age=${YEAR_SECONDS}; SameSite=Lax`;
}
