import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI 메뉴 가격 추천 — VELA",
  description:
    "원가와 경쟁 가격대를 입력하면 AI가 적정 메뉴 가격을 추천합니다.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
