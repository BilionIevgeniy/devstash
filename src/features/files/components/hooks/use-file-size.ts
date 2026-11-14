import { useFormatter } from "next-intl";

import { fileSizeParts } from "@/features/files/domain/file-rules";

// A file size for the locale: "12.4 KB" in English, "12,4 KB" in German.
export function useFileSize(): (bytes: number) => string {
  const format = useFormatter();
  return (bytes) => {
    const { value, digits, unit } = fileSizeParts(bytes);
    const number = format.number(value, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    return `${number} ${unit}`;
  };
}
