import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UPN Student Hub — Portal Ekosistem Mahasiswa UPN Veteran Jawa Timur",
  description:
    "Platform terpadu mahasiswa UPN Veteran Jawa Timur untuk marketplace preloved, jasa & layanan, barang hilang, chat 1-on-1, dan event kampus.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${plusJakartaSans.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
