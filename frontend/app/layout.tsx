import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MinURL – High-Speed URL Shortener",
  description:
    "MinURL is a free, fast, and reliable URL shortener. Convert long URLs into neat, shareable links in seconds.",
  keywords: ["url shortener", "short url", "shorten url", "MinURL"],
  openGraph: {
    title: "MinURL – High-Speed URL Shortener",
    description: "Convert long URLs into neat, shareable links in one click.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
