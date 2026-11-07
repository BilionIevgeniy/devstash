export type ActiveMatch = "exact" | "prefix";

// Whether a sidebar link points at the page on screen. "prefix" also covers the
// pages below the link, but only at a segment boundary: `/items/snippets`
// stays lit on a snippet's page, `/collections/abc` never on `/collections/abcd`.
export function isActivePath(
  pathname: string,
  href: string,
  match: ActiveMatch,
): boolean {
  if (pathname === href) return true;
  return match === "prefix" && pathname.startsWith(`${href}/`);
}
