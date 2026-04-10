import type { Metadata, Viewport } from "next";
import NavBar from "@/components/NavBar";
import CommandPalette from "@/components/CommandPalette";
import InstallPrompt from "@/components/InstallPrompt";
import MobileTabBar from "@/components/MobileTabBar";
import ClientProviders from "@/components/ClientProviders";
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
  metadataBase: new URL("https://velaanalytics.com"),
  title: "VELA — 외식업 손익계산 시뮬레이터 & AI 경영 컨설턴트",
  description: "외식업 사장님을 위한 AI 경영 분석. 3분 만에 매출·원가·인건비를 시뮬레이션하고 맞춤 전략을 받아보세요.",
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
    description: "외식업 사장님을 위한 AI 경영 분석. 3분 만에 매출·원가·인건비를 시뮬레이션하고 맞춤 전략을 받아보세요.",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://velaanalytics.com" },
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "VELA" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#3182F6",
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
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            if (localStorage.getItem('vela-theme') === 'dark' ||
                (!localStorage.getItem('vela-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            }
          } catch {}
        ` }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "VELA",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web, iOS",
          "description": "외식업 사장님을 위한 AI 경영 분석 플랫폼",
          "url": "https://velaanalytics.com",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "KRW"
          },
          "publisher": {
            "@type": "Organization",
            "name": "벨라솔루션",
            "url": "https://velaanalytics.com"
          }
        }) }} />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
          // 글씨 크기 복원
          try { var fs = localStorage.getItem('vela-font-size'); if (fs) document.documentElement.style.fontSize = fs + 'px'; } catch {}
          // Capacitor 앱 감지 — URL ?app=1 또는 localStorage 플래그
          if (window.Capacitor || navigator.userAgent.includes('CapacitorApp') || window.matchMedia('(display-mode: standalone)').matches || window.location.search.includes('app=1') || localStorage.getItem('vela-is-app') === '1') {
            document.documentElement.classList.add('capacitor-app');
            localStorage.setItem('vela-is-app', '1');
          }
        ` }} />
      </head>
      <body className="flex flex-col min-h-screen pt-16 bg-slate-50">
        <NavBar />
        <CommandPalette />
        <InstallPrompt />
        {children}
        <MobileTabBar />
        <ClientProviders />
      </body>
    </html>
  );
}
