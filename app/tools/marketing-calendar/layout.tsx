import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "시즌 마케팅 캘린더 — VELA",
  description:
    "월별 이벤트·시즌에 맞는 추천 마케팅 전략 캘린더.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
