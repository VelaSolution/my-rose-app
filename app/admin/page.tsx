"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const fmt = (n: number) => n.toLocaleString("ko-KR");

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    todayUsers: 0,
    totalSimulations: 0,
    todaySimulations: 0,
    totalMenuCosts: 0,
    totalSnapshots: 0,
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [signupChart, setSignupChart] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [feedbackCount, setFeedbackCount] = useState(0);

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "").split(",").map(e => e.trim().toLowerCase());
      if (adminEmails.length > 0 && adminEmails[0] && !adminEmails.includes(user.email?.toLowerCase() ?? "")) {
        router.push("/unauthorized");
        return;
      }

      const today = new Date().toISOString().split("T")[0];

      const [
        { count: totalUsers },
        { count: totalSimulations },
        { count: todaySimulations },
        { count: totalMenuCosts },
        { count: totalSnapshots },
        { data: recentUsersData },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("simulation_history").select("*", { count: "exact", head: true }),
        supabase.from("simulation_history").select("*", { count: "exact", head: true }).gte("created_at", today),
        supabase.from("menu_costs").select("*", { count: "exact", head: true }),
        supabase.from("monthly_snapshots").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("id, full_name, email, industry, store_name, created_at").order("created_at", { ascending: false }).limit(10),
      ]);

      setStats({
        totalUsers: totalUsers ?? 0,
        todayUsers: 0,
        totalSimulations: totalSimulations ?? 0,
        todaySimulations: todaySimulations ?? 0,
        totalMenuCosts: totalMenuCosts ?? 0,
        totalSnapshots: totalSnapshots ?? 0,
      });

      setRecentUsers(recentUsersData ?? []);

      // 이벤트 피드백 조회
      const { count: fbCount } = await supabase
        .from("event_feedback")
        .select("*", { count: "exact", head: true });
      setFeedbackCount(fbCount ?? 0);

      const { data: fbData } = await supabase
        .from("event_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setFeedbacks(fbData ?? []);

      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
    </main>
  );

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4 md:px-8">
        <div className="mx-auto max-w-5xl space-y-6">

          {/* 헤더 */}
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full mb-2">
              🔐 관리자 전용
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">VELA 관리자 대시보드</h1>
            <p className="text-sm text-slate-400 mt-1">벨라솔루션 내부용</p>
          </div>

          {/* 주요 지표 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "총 가입자", value: stats.totalUsers, unit: "명", emoji: "👥", color: "text-slate-900" },
              { label: "총 시뮬레이션", value: stats.totalSimulations, unit: "회", emoji: "📊", color: "text-blue-600" },
              { label: "오늘 시뮬레이션", value: stats.todaySimulations, unit: "회", emoji: "📈", color: "text-emerald-600" },
              { label: "저장된 메뉴", value: stats.totalMenuCosts, unit: "개", emoji: "🧮", color: "text-orange-600" },
              { label: "월별 스냅샷", value: stats.totalSnapshots, unit: "건", emoji: "📅", color: "text-purple-600" },
              { label: "이벤트 피드백", value: feedbackCount, unit: "건", emoji: "📋", color: "text-pink-600" },
            ].map(card => (
              <div key={card.label} className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-4">
                <p className="text-xs text-slate-400 mb-2">{card.emoji} {card.label}</p>
                <p className={`text-2xl font-extrabold ${card.color}`}>
                  {typeof card.value === "number" ? fmt(card.value) : card.value}
                  <span className="text-sm font-normal text-slate-400 ml-1">{card.unit}</span>
                </p>
              </div>
            ))}
          </div>

          {/* 최근 가입자 */}
          <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-extrabold text-slate-900">최근 가입자</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-5 py-3 text-left">이름</th>
                    <th className="px-4 py-3 text-left">이메일</th>
                    <th className="px-4 py-3 text-left">업종</th>
                    <th className="px-4 py-3 text-left">매장명</th>
                    <th className="px-4 py-3 text-left">가입일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentUsers.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-sm">가입자 데이터가 없어요</td></tr>
                  ) : recentUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3.5 font-semibold text-slate-700">{u.full_name ?? "-"}</td>
                      <td className="px-4 py-3.5 text-slate-500">{u.email ?? "-"}</td>
                      <td className="px-4 py-3.5 text-slate-500">{u.industry ?? "-"}</td>
                      <td className="px-4 py-3.5 text-slate-500">{u.store_name ?? "-"}</td>
                      <td className="px-4 py-3.5 text-slate-400 text-xs">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString("ko-KR") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 이벤트 피드백 */}
          <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-extrabold text-slate-900">이벤트 피드백 ({feedbackCount}건)</h2>
              {feedbackCount > 0 && (
                <span className="text-xs text-slate-400">
                  평균 결제 의향: {(feedbacks.reduce((s, f) => s + (f.pay_intent || 0), 0) / feedbacks.length).toFixed(1)}점
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">닉네임</th>
                    <th className="px-4 py-3 text-left">업종</th>
                    <th className="px-4 py-3 text-left">운영기간</th>
                    <th className="px-4 py-3 text-left">사용 소감</th>
                    <th className="px-4 py-3 text-left">유용 기능</th>
                    <th className="px-4 py-3 text-left">개선점</th>
                    <th className="px-4 py-3 text-center">결제의향</th>
                    <th className="px-4 py-3 text-left">연락처</th>
                    <th className="px-4 py-3 text-left">추천</th>
                    <th className="px-4 py-3 text-left">바라는 기능</th>
                    <th className="px-4 py-3 text-left">추천사</th>
                    <th className="px-4 py-3 text-left">제출일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {feedbacks.length === 0 ? (
                    <tr><td colSpan={12} className="px-5 py-8 text-center text-slate-400 text-sm">아직 피드백이 없어요</td></tr>
                  ) : feedbacks.map((f: any) => (
                    <tr key={f.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">{f.nickname}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{f.industry}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{f.experience}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={f.review}>{f.review}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-[150px] truncate" title={f.useful_features?.join(", ")}>{f.useful_features?.join(", ")}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={f.improvement}>{f.improvement}</td>
                      <td className="px-4 py-3 text-center font-bold" style={{ color: f.pay_intent >= 4 ? "#16a34a" : f.pay_intent >= 3 ? "#d97706" : "#9ca3af" }}>{f.pay_intent}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{f.phone}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{f.recommend_count ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[150px] truncate" title={f.wanted_feature}>{f.wanted_feature ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[150px] truncate" title={f.testimonial}>{f.testimonial ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {f.created_at ? new Date(f.created_at).toLocaleDateString("ko-KR") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 서비스 정보 */}
          <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
            <h2 className="font-extrabold text-slate-900 mb-4">서비스 정보</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {[
                { label: "서비스명", value: "VELA" },
                { label: "운영사", value: "벨라솔루션" },
                { label: "대표", value: "김민혁" },
                { label: "사업자번호", value: "777-17-02386" },
                { label: "도메인", value: "velaanalytics.com" },
                { label: "스택", value: "Next.js + Supabase" },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                  <p className="font-semibold text-slate-700">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
