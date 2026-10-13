import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { NoticeBanner } from "@/components/layout/notice-banner";
import { PendingBanner } from "@/components/layout/pending-banner";
import { Toaster } from "@/components/ui/sonner";
import { ACTIVE_DUMMY_VIEWER } from "@/lib/dummy/viewers";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "SCO 순찰 일지",
  description:
    "SCO 관리형 독서실의 30분 간격 순찰을 간편하게 기록하고 구글 시트에 붙여넣는 순찰 일지",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* TODO: Task 018에서 getViewer() 결과로 교체 */}
          <AppHeader viewer={ACTIVE_DUMMY_VIEWER} />
          <PendingBanner viewer={ACTIVE_DUMMY_VIEWER} />
          <Suspense fallback={null}>
            <NoticeBanner />
          </Suspense>
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
