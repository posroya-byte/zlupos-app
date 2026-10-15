import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import "./product.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "ZLUPOS Production | إدارة الصالون",
  description: "نظام نقاط البيع وإدارة الصالونات",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
