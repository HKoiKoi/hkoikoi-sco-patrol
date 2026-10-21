import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";

import { AppFooter } from "@/components/layout/app-footer";
import { AppChrome } from "@/components/layout/app-chrome";
import { NoticeBanner } from "@/components/layout/notice-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// AppChrome 로딩 중 헤더 자리를 지키는 스켈레톤(헤더와 같은 border-b, min-h-14)
function HeaderSkeleton() {
  return (
    <div className="border-b bg-background">
      <div className="mx-auto flex min-h-14 w-full max-w-5xl items-center justify-between px-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

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
      <body
        className={`${geistSans.className} flex min-h-screen flex-col antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* 쿠키를 읽는 AppChrome은 Suspense 안에 두고, 같은 높이의 자리표시자로 레이아웃 시프트를 줄인다 */}
          <Suspense fallback={<HeaderSkeleton />}>
            <AppChrome />
          </Suspense>
          <Suspense fallback={null}>
            <NoticeBanner />
          </Suspense>
          {/* 페이지가 자체 main을 가지므로 div로 감싸 푸터를 하단에 고정 */}
          <div className="flex-1">{children}</div>
          <AppFooter />
          {/* 상단에 둔다: 하단은 고정 액션바와 Android 자체 "복사했어요" 토스트와 겹친다. 68px은 sticky 헤더(57px) 아래 */}
          <Toaster
            position="top-center"
            offset={{ top: 68 }}
            mobileOffset={{ top: 68 }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
