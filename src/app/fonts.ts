import { Geist, Geist_Mono } from "next/font/google";

// The fonts of the app, set on <html> by the root layout and by Storybook
// (.storybook/preview.tsx), so a story is measured in the type the app shows.
export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
