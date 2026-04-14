import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "배달앱 메뉴 최적화 — VELA",
  description:
    "배민·쿠팡이츠용 매력적인 메뉴 설명을 AI가 자동 생성합니다.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
