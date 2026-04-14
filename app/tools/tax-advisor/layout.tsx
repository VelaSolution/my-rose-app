import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "세무사 연결 — VELA",
  description:
    "외식업 전문 세무사 매칭 서비스. 첫 상담 무료.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
