import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "외부 서비스 연동 — VELA",
  description:
    "POS·배달앱·카드매출 등 외부 서비스 연동을 한 곳에서 관리.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
