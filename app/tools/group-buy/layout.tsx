import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "식자재 공동구매 — VELA",
  description:
    "같은 동네 사장님끼리 식자재 공동구매 매칭으로 원가 절감.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
