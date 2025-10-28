import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dinner Topic Generator — End awkward silences",
  description:
    "Craft three tailored conversation starters and a fun food fact in seconds. Perfect for any dinner vibe."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6a76e"
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-white text-neutral-900 antialiased">
        <div className="max-w-xl mx-auto px-4 py-10">{children}</div>
      </body>
    </html>
  );
}
