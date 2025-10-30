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
  themeColor: "#0e0e12"
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-app-bg text-zinc-100">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-10">
          {children}
        </div>
      </body>
    </html>
  );
}
