import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SupperTalk — Recipes with Conversation Starters",
  description:
    "Search recipes, plan dinner, and get conversation sparks with SupperTalk. Built for warm, inclusive gatherings.",
  icons: {
    icon: "/favicon.ico"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#312e81"
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="min-h-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <body className="min-h-screen bg-gradient-to-b from-slate-50/80 via-white to-slate-100/60 font-sans antialiased dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-10">
          {children}
        </div>
      </body>
    </html>
  );
}
