import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
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
  title: "VELA — 사업의 방향을 계산하다",
  description: "외식업 창업자와 운영자를 위한 수익 시뮬레이터 & AI 경영 컨설턴트",
  keywords: ["외식업", "수익 시뮬레이터", "창업", "카페", "음식점", "경영 분석"],
  openGraph: {
    title: "VELA — 사업의 방향을 계산하다",
    description: "외식업 창업자와 운영자를 위한 수익 시뮬레이터 & AI 경영 컨설턴트",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}

