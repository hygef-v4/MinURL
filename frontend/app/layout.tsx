import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WarpLink – Rút ngắn URL tốc độ cao",
  description:
    "WarpLink là công cụ rút ngắn URL miễn phí, nhanh chóng và đáng tin cậy. Chuyển đổi URL dài thành đường link gọn gàng, dễ chia sẻ trong giây lát.",
  keywords: ["rút ngắn URL", "short URL", "URL shortener", "WarpLink"],
  openGraph: {
    title: "WarpLink – Rút ngắn URL tốc độ cao",
    description: "Chuyển URL dài thành link gọn gàng trong một click.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
