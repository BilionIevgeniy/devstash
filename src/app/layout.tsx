import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { getSiteOrigin } from "@/lib/app-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// metadataBase makes the canonical, hreflang and Open Graph links absolute on
// the site's origin; without it Next would write them on localhost. Read at
// build time (getSiteOrigin never throws), so the static pages stay static.
export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: "DevStash",
  description: "A developer knowledge hub for snippets, commands, prompts, notes, files, images, links and custom types.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased motion-safe:scroll-smooth`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
