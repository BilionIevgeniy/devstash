import type { Metadata } from "next";
import { ThemeScript } from "@/components/common/theme/ThemeScript";
import { ThemeSync } from "@/components/common/theme/ThemeSync";
import { getSiteOrigin } from "@/lib/http/app-url";
import { geistMono, geistSans } from "./fonts";
import "./globals.css";

// metadataBase makes the canonical, hreflang and Open Graph links absolute on
// the site's origin; without it Next would write them on localhost. Read at
// build time (getSiteOrigin never throws), so the static pages stay static.
export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: "DevStash",
  description:
    "A developer knowledge hub for snippets, commands, prompts, notes, files, images, links and custom types.",
};

// `dark` is the server's class, the theme of a visitor who never chose and of
// a browser without JavaScript. ThemeScript corrects it before the first paint
// and ThemeSync afterwards, so React must not compare <html>'s class
// (suppressHydrationWarning). Nothing here reads the request (ADR 0039).
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} dark h-full scroll-pb-(--consent-inset) antialiased motion-safe:scroll-smooth`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
