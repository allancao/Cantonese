import type { Metadata, Viewport } from "next";
import { Footer } from "./components/Footer";
import { SyncInit } from "./components/SyncInit";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jyut Dictation — learn Cantonese by ear",
  description:
    "Hear a Cantonese word, type what you heard, then check the characters, the tone-coloured Jyutping and the meaning.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <SyncInit />
        <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}
