import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
});

export const metadata: Metadata = {
  title: "Unified Tax Group Service Agreement",
  description: "Secure service agreement signing for Unified Tax Group.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sourceSans.variable} ${sourceSerif.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#f4f6f8] font-sans text-[#111827]">{children}</body>
    </html>
  );
}
