import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EBISEN — Quản lý kinh doanh",
  description: "Kiểm soát doanh thu, chi phí và lãi/lỗ",
  icons: {
    icon: "/logo.png",
    apple: "/apple-touch-icon.png",
  },
  // Tên rút gọn khi thêm vào Màn hình chính iOS + hiển thị dạng app.
  appleWebApp: { capable: true, title: "EBISEN" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
