// The locales of the interface and how a request gets one (ADR 0024).
// Imported by the browser too: no request API, no server-only import.

export const LOCALES = ["en", "de"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Set only when the user picks a language; read by the app and the auth pages. */
export const LOCALE_COOKIE = "devstash-locale";

/** Dates are shown in this zone on the server and in the browser alike. */
export const DEFAULT_TIME_ZONE = "Europe/Berlin";

/** The named formats of `format.dateTime(date, "short")`, shared by server and browser. */
export const FORMATS = {
  dateTime: {
    short: { month: "short", day: "numeric" },
    long: { year: "numeric", month: "long", day: "numeric" },
    numeric: { year: "numeric", month: "2-digit", day: "2-digit" },
  },
} as const;

export function isLocale(value: unknown): value is Locale {
  return (LOCALES as readonly unknown[]).includes(value);
}

// "de-AT,de;q=0.9,en;q=0.8" → ["de", "de", "en"], by quality, highest first.
// A range without a q-value has q=1; "*" and malformed parts are skipped.
function acceptedLanguages(header: string): string[] {
  return header
    .split(",")
    .map((part, index) => {
      const [range, ...options] = part.trim().split(";");
      const q = options
        .map((option) => /^q=([\d.]+)$/.exec(option.trim())?.[1])
        .find((value) => value !== undefined);
      return {
        language: range.split("-")[0].toLowerCase(),
        q: q ? Number(q) : 1,
        index,
      };
    })
    .filter(({ language, q }) => language !== "" && language !== "*" && q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map(({ language }) => language);
}

/** The cookie the user chose, else the browser's first supported language, else English. */
export function resolveLocale(
  cookieValue: string | undefined,
  acceptLanguage: string | null,
): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  const accepted = acceptLanguage ? acceptedLanguages(acceptLanguage) : [];
  return accepted.find(isLocale) ?? DEFAULT_LOCALE;
}

/** The marketing home page of a locale. */
export function homePath(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? "/" : `/${locale}`;
}
