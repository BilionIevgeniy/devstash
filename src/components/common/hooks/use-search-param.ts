import { useSearchParams } from "next/navigation";

// One query parameter as state, for a view the server does not render again
// on a change: its rows are all in the browser already (the favorite
// collections) or the browser fetches them itself (the endless lists of
// /favorites and /pinned, ADR 0025). A change rewrites the URL with
// history.replaceState, which the Next router syncs with useSearchParams, so
// there is no server render to wait for. Replace, so Back leaves the
// page. null or `defaultValue` removes the parameter, so the default view is
// the bare path; the other parameters are kept. The caller parses the value.
export function useSearchParam(
  name: string,
  defaultValue?: string,
): [string | null, (value: string | null) => void] {
  const searchParams = useSearchParams();

  function setValue(value: string | null) {
    const params = new URLSearchParams(window.location.search);
    if (value === null || value === defaultValue) params.delete(name);
    else params.set(name, value);

    const search = params.toString();
    const path = window.location.pathname;
    window.history.replaceState(
      null,
      "",
      search === "" ? path : `${path}?${search}`,
    );
  }

  return [searchParams.get(name), setValue];
}
