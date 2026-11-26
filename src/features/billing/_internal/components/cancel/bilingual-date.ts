import { createFormatter } from "next-intl";

import { DEFAULT_TIME_ZONE, FORMATS } from "@/i18n/config";

type DateFormat = "long" | "longWithTime";

const OPTIONS = {
  long: "long",
  longWithTime: { dateStyle: "long", timeStyle: "medium" },
} as const;

function formatIn(locale: "de" | "en", value: Date, format: DateFormat) {
  const formatter = createFormatter({
    locale,
    formats: FORMATS,
    timeZone: DEFAULT_TIME_ZONE,
  });
  // Two calls: `dateTime` takes a named format or options through separate
  // overloads, and a union of both matches neither.
  const option = OPTIONS[format];
  return typeof option === "string"
    ? formatter.dateTime(value, option)
    : formatter.dateTime(value, option);
}

// The § 312k page speaks German and English in one line ("Eingegangen am … /
// Received on …"), so each half gets its date in its own language: the
// page's provider knows only one locale.
export function bilingualDate(value: Date, format: DateFormat) {
  return {
    dateDe: formatIn("de", value, format),
    dateEn: formatIn("en", value, format),
  };
}
