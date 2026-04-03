import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "VELA — 외식업 손익계산 시뮬레��터 & AI 경영 컨설턴트",
  description: "카페 원가 계산기, 음식점 수익 시뮬레이터, 외식업 손익계산을 무료로. 매출·원가·인건비를 한 번에 시뮬레이션하고 AI 맞춤 전략을 받아보세요. 500+ 사장님이 사용 중.",
  keywords: ["외식업 손익계산", "카페 원가 계산기", "음식점 수익 계산", "카페 창업 비용", "음식점 창업", "수익 시뮬레이터", "외식업 경영", "메뉴 원가율", "인건비 계산", "AI 경영 컨설턴트", "VELA", "자영업 매출 분석"],
  openGraph: {
    title: "VELA — 외식업 사장님을 위한 숫자 경영 파트너",
    description: "카페·음식점·바 원가율 계산부터 AI 전략까지. 매출·원가·인건비를 한 번에 시뮬레이션하세요. 무료로 시작 가능.",
    url: "https://velaanalytics.com",
    siteName: "VELA",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VELA — 외식업 손익계산 시뮬레이터",
    description: "카페·음식점·바 원가율 계산부터 AI 전략까지. 500+ 사장님이 사용 중. 무료로 시작하세요.",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://velaanalytics.com" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="flex flex-col min-h-screen pt-16 bg-slate-50">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
