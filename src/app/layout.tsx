import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import AppShell from "@/components/AppShell";
import "./globals.css";

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "toss",
  description: "Aklına geleni at. Sonra unutma.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${jetbrains.variable} h-full`}>
      <body className="noise min-h-full flex flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
