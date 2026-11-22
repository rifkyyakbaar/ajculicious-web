import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: "AJCUlicious - Homemade Cookies, Dubai Cookies, Brownies & Dimsum Hangat",
  description:
    "Toko dessert dan camilan homemade sistem Pre-Order (PO) per Batch & Ambil di Kampus. Nikmati Dubai Chewy Cookies Pistachio, Soft Cookies, Fudgy Brownies, dan Dimsum Hangat langsung di kampus!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="scroll-smooth" suppressHydrationWarning>
      <body
        className="min-h-screen bg-[#FAF6F0] text-[#3B2618] antialiased"
        suppressHydrationWarning
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
