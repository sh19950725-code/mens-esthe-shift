import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NetworkStatus from "@/components/pwa/NetworkStatus";
import PwaRegister from "@/components/pwa/PwaRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "店舗シフト管理",
    template: "%s | 店舗シフト管理",
  },
  description:
    "店舗スタッフ向けのシフト・キャスト管理システム",
  applicationName: "店舗シフト管理",
  manifest: "/manifest.webmanifest",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "シフト管理",
  },
  icons: {
    icon: "/shift-app-icon.svg",
    apple: "/shift-app-icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111827",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-gray-50 text-gray-900">
        <PwaRegister />
        <NetworkStatus />
        {children}
      </body>
    </html>
  );
}
