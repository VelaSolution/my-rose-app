import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "배달앱 매출 분석기 — VELA",
  description:
    "배민·쿠팡이츠 정산서 업로드로 수수료·실매출 AI 자동 분석.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
