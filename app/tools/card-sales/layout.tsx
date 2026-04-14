import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "카드매출 자동 수집 — VELA",
  description:
    "사업자번호 입력으로 여신금융협회 카드사별 매출 자동 조회. 카드 매출 한눈에 관리.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
