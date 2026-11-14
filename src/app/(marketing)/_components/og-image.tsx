import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/config";
import { messagesFor } from "@/i18n/messages";

// The Open Graph image of `/` and `/de`, the card a shared link shows. Drawn
// once at build time (no request data, so the routes stay static). Satori,
// which draws it, reads only inline `style` objects and no classes (the
// exception in "Styling" of coding-standards.md).
export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

// The Layers icon of the logo (lucide-react 1.70), drawn inline: lucide's
// components are client components, which an image route cannot call.
const LAYERS_PATHS = [
  "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",
  "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",
  "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",
];

function LayersMark() {
  return (
    <svg
      width={64}
      height={64}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fafafa"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {LAYERS_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export function ogImageAlt(locale: Locale): string {
  return messagesFor(locale).marketing.meta.ogAlt;
}

export async function ogImage(locale: Locale): Promise<ImageResponse> {
  const t = await getTranslations({ locale, namespace: "marketing.meta" });

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 40,
        padding: 96,
        background: "linear-gradient(135deg, #0a0a0a 0%, #111827 100%)",
        color: "#fafafa",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 112,
          height: 112,
          borderRadius: 28,
          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
        }}
      >
        <LayersMark />
      </div>
      <div style={{ display: "flex", fontSize: 64, fontWeight: 700 }}>
        {t("title")}
      </div>
      <div style={{ display: "flex", fontSize: 32, color: "#a1a1aa" }}>
        {t("description")}
      </div>
    </div>,
    OG_IMAGE_SIZE,
  );
}
