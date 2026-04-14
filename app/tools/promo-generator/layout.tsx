import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "프로모션 문구 생성기 — VELA",
  description:
    "이벤트·할인 정보 입력으로 전단지·SNS·문자 프로모션 문구 AI 자동 생성.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
