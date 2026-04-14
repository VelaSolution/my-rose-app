import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "리뷰 감정 분석 — VELA",
  description:
    "고객 리뷰를 붙여넣으면 감정·키워드·개선점을 AI가 분석합니다.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
