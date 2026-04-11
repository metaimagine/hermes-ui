import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getUiPrefs } from "@/lib/ui/i18n";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hermes UI",
  description: "Independent management-first web workspace for Hermes Agent.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { lang, theme } = await getUiPrefs();
  return (
    <html lang={lang} className={`${geistSans.variable} ${geistMono.variable}`} data-theme={theme}>
      <body>{children}</body>
    </html>
  );
}
