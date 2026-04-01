"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

type Snapshot = {
  id: string; user_id: string; month: string;
  total_sales: number; cogs: number; labor_cost: number;
  rent: number; utilities: number; marketing: number;
  delivery_fee: number; other_cost: number; net_profit: number;
  avg_spend: number; customer_count: number;
  industry: string; memo: string; created_at: string;
};

type MenuCost = {
  id: string; name: string; category: string; industry: string;
  price: number; cost: number; cost_rate: number; margin: number;
};

const IND: Record<string, string> = { cafe:"☕ 카페", restaurant:"🍽️ 음식점", bar:"🍺 술집/바", finedining:"✨ 파인다이닝", gogi:"🥩 고깃집" };
const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR");

export default function DashboardPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [menus, setMenus] = useState<MenuCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInput, setShowInput] = useState(false);
  const [form, setForm] = useState({ month: new Date().toISOString().slice(0,7), industry: "cafe", total_sales: "", cogs: "", labor_cost: "", rent: "", utilities: "", marketing: "", delivery_fee: "", other_cost: "", avg_spend: "", customer_count: "", memo: "" });
  const [saving, setSaving] = useState(false);
  const sb = typeof window !== "undefined" ? createSupabaseBrowserClient() : null;

  const load = useCallback(async () => {
    if (!sb) return;
    setLoading(true);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setLoading(false); return; }
    const [{ data: snaps }, { data: mns }] = await Promise.all([
      sb.from("monthly_snapshots").select("*").eq("user_id", user.id).order("month", { ascending: true }).limit(24),
      sb.from("menu_costs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    ]);
    setSnapshots(snaps ?? []);
    setMenus(mns ?? []);
    setLoading(false);
  }, [sb]);

  useEffect(() => { load(); }, [load]);

  const saveSnapshot = async () => {
    if (!sb) return;
    if (!form.month || !form.total_sales) return alert("월과 매출은 필수입니다.");
    setSaving(true);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const net = Number(form.total_sales) - Number(form.cogs||0) - Number(form.labor_cost||0) - Number(form.rent||0) - Number(form.utilities||0) - Number(form.marketing||0) - Number(form.delivery_fee||0) - Number(form.other_cost||0);
    const { error } = await sb.from("monthly_snapshots").upsert({
      user_id: user.id, month: form.month, industry: form.industry,
      total_sales: Number(form.total_sales), cogs: Number(form.cogs||0),
      labor_cost: Number(form.labor_cost||0), rent: Number(form.rent||0),
      utilities: Number(form.utilities||0), marketing: Number(form.marketing||0),
      delivery_fee: Number(form.delivery_fee||0), other_cost: Number(form.other_cost||0),
      avg_spend: Number(form.avg_spend||0), customer_count: Number(form.customer_count||0),
      net_profit: net, memo: form.memo,
    }, { onConflict: "user_id,month" });
    if (error) { alert("저장 실패: " + error.message); setSaving(false); return; }
    setSaving(false);
    setShowInput(false);
    setForm(f => ({ ...f, total_sales:"", cogs:"", labor_cost:"", rent:"", utilities:"", marketing:"", delivery_fee:"", other_cost:"", avg_spend:"", customer_count:"", memo:"" }));
    load();
  };

  const delSnapshot = async (id: string) => {
    if (!sb) return;
    if (!confirm("이 데이터를 삭제할까요?")) return;
    await sb.from("monthly_snapshots").delete().eq("id", id);
    load();
  };

  const maxSales = Math.max(...snapshots.map(s => s.total_sales), 1);
  const avgCostRate = menus.length > 0 ? menus.reduce((a, m) => a + (m.cost_rate || 0), 0) / menus.length : 0;
  const dangerMenus = menus.filter(m => m.cost_rate > 40);

  if (loading) return (
    <div className="min-h-screen bg-slate-50"><NavBar />
      <div className="flex items-center justify-center h-[80vh]"><p className="text-slate-400">불러오는 중...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="px-4 py-8 md:px-8">
        <div className="mx-auto max-w-5xl space-y-6">

          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">대시보드</h1>
              <p className="text-sm text-slate-400 mt-1">직접 등록한 매출 현황과 메뉴 원가를 확인하세요</p>
            </div>
            <button onClick={() => setShowInput(v => !v)}
              className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition">
              + 이번 달 입력하기
            </button>
          </div>

          {/* 입력 폼 */}
          {showInput && (
            <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 space-y-5">
              <h2 className="text-base font-bold text-slate-900">월별 매출 등록</h2>

              {/* 기본 정보 */}
              <div>
                <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide">기본 정보</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">월 *</label>
                    <input type="month" value={form.month} onChange={e => setForm(f=>({...f,month:e.target.value}))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">업종</label>
                    <select value={form.industry} onChange={e => setForm(f=>({...f,industry:e.target.value}))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      {Object.entries(IND).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">월 총 매출 (원) *</label>
                    <input type="number" value={form.total_sales} onChange={e => setForm(f=>({...f,total_sales:e.target.value}))}
                      placeholder="0" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">객단가 (원)</label>
                    <input type="number" value={form.avg_spend} onChange={e => setForm(f=>({...f,avg_spend:e.target.value}))}
                      placeholder="0" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">월 고객 수 (명)</label>
                    <input type="number" value={form.customer_count} onChange={e => setForm(f=>({...f,customer_count:e.target.value}))}
                      placeholder="0" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
                  </div>
                </div>
              </div>

              {/* 비용 항목 */}
              <div>
                <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide">비용 항목</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    {key:"cogs",        label:"식재료비 (원)",   placeholder:"원재료·식자재"},
                    {key:"labor_cost",  label:"인건비 (원)",     placeholder:"급여·아르바이트"},
                    {key:"rent",        label:"임대료 (원)",     placeholder:"월세·관리비"},
                    {key:"utilities",   label:"공과금 (원)",     placeholder:"전기·가스·수도"},
                    {key:"marketing",   label:"마케팅비 (원)",   placeholder:"광고·SNS·쿠폰"},
                    {key:"delivery_fee",label:"배달 수수료 (원)",placeholder:"배민·쿠팡이츠 등"},
                    {key:"other_cost",  label:"기타 비용 (원)",  placeholder:"소모품·수선 등"},
                  ].map(({key,label,placeholder}) => (
                    <div key={key}>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">{label}</label>
                      <input type="number" value={form[key as keyof typeof form]} onChange={e => setForm(f=>({...f,[key]:e.target.value}))}
                        placeholder={placeholder} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
                    </div>
                  ))}
                </div>
              </div>

              {/* 순이익 미리보기 */}
              {form.total_sales && (
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">총 매출</p>
                      <p className="font-bold text-slate-900">{fmt(Number(form.total_sales))}원</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">총 비용</p>
                      <p className="font-bold text-slate-700">{fmt(Number(form.cogs||0)+Number(form.labor_cost||0)+Number(form.rent||0)+Number(form.utilities||0)+Number(form.marketing||0)+Number(form.delivery_fee||0)+Number(form.other_cost||0))}원</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">순이익</p>
                      <p className={`font-bold ${Number(form.total_sales)-Number(form.cogs||0)-Number(form.labor_cost||0)-Number(form.rent||0)-Number(form.utilities||0)-Number(form.marketing||0)-Number(form.delivery_fee||0)-Number(form.other_cost||0)>=0?"text-emerald-600":"text-red-500"}`}>
                        {fmt(Number(form.total_sales)-Number(form.cogs||0)-Number(form.labor_cost||0)-Number(form.rent||0)-Number(form.utilities||0)-Number(form.marketing||0)-Number(form.delivery_fee||0)-Number(form.other_cost||0))}원
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">메모</label>
                <input value={form.memo} onChange={e => setForm(f=>({...f,memo:e.target.value}))}
                  placeholder="이번 달 특이사항 (예: 설 연휴로 매출 증가)" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
              </div>

              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowInput(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600">취소</button>
                <button onClick={saveSnapshot} disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {saving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          )}

          {/* 월별 매출 섹션 */}
          <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
            <h2 className="text-base font-bold text-slate-900 mb-5">📈 월별 매출 현황</h2>
            {snapshots.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">📊</p>
                <p className="text-slate-500 text-sm mb-4">아직 입력된 데이터가 없어요<br />이번 달 매장 현황을 먼저 입력해주세요.</p>
                <button onClick={() => setShowInput(true)} className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">📝 이번 달 입력하기</button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* 요약 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {l:"최근 월 매출",v:fmt(snapshots.at(-1)?.total_sales??0)+"원",c:"text-slate-900"},
                    {l:"최근 순이익",v:fmt(snapshots.at(-1)?.net_profit??0)+"원",c:(snapshots.at(-1)?.net_profit??0)>=0?"text-emerald-600":"text-red-500"},
                    {l:"평균 순이익",v:fmt(snapshots.reduce((a,s)=>a+s.net_profit,0)/snapshots.length)+"원",c:"text-blue-600"},
                    {l:"등록 개월수",v:snapshots.length+"개월",c:"text-slate-600"},
                  ].map(s=>(
                    <div key={s.l} className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-400 mb-1">{s.l}</p>
                      <p className={`text-base font-bold ${s.c}`}>{s.v}</p>
                    </div>
                  ))}
                </div>
                {/* 차트 */}
                <div className="flex items-end gap-2 h-36 px-2">
                  {snapshots.map(s => (
                    <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                      <span className={`text-xs font-bold ${s.net_profit>=0?"text-emerald-600":"text-red-500"}`} style={{fontSize:"9px"}}>
                        {s.net_profit>=0?"+":""}{Math.round(s.net_profit/10000)}만
                      </span>
                      <div className="w-full rounded-t-lg bg-blue-500" style={{height:`${Math.max(4,(s.total_sales/maxSales)*100)}px`}} />
                      <span className="text-slate-400 text-center" style={{fontSize:"9px"}}>{s.month.slice(2)}</span>
                    </div>
                  ))}
                </div>
                {/* 테이블 */}
                <div className="rounded-2xl border border-slate-100 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">월</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">업종</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">매출</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">순이익</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">식재료비</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">인건비</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">임대료</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">공과금</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">마케팅</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">배달수수료</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[...snapshots].reverse().map(s => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{s.month}</td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{IND[s.industry]?.split(" ").slice(1).join(" ") ?? s.industry}</td>
                          <td className="px-4 py-3 text-right text-slate-700 whitespace-nowrap">{fmt(s.total_sales)}원</td>
                          <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${s.net_profit>=0?"text-emerald-600":"text-red-500"}`}>
                            {s.net_profit>=0?"+":""}{fmt(s.net_profit)}원
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">{fmt(s.cogs)}원</td>
                          <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">{fmt(s.labor_cost)}원</td>
                          <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">{fmt(s.rent)}원</td>
                          <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">{fmt(s.utilities||0)}원</td>
                          <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">{fmt(s.marketing||0)}원</td>
                          <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">{fmt(s.delivery_fee||0)}원</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => delSnapshot(s.id)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* 메뉴 원가 현황 섹션 */}
          <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">🧮 메뉴별 원가 현황</h2>
                <p className="text-xs text-slate-400 mt-0.5">원가 계산기에서 등록한 메뉴 데이터</p>
              </div>
              <Link href="/tools/menu-cost" className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                원가 계산기 →
              </Link>
            </div>
            {menus.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-3xl mb-3">🧮</p>
                <p className="text-slate-500 text-sm mb-4">등록된 메뉴가 없어요<br />원가 계산기에서 메뉴를 등록해보세요.</p>
                <Link href="/tools/menu-cost" className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white inline-block">
                  메뉴별 원가 계산기 →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 원가 요약 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {l:"등록 메뉴",v:`${menus.length}개`,c:"text-slate-900"},
                    {l:"평균 원가율",v:`${avgCostRate.toFixed(1)}%`,c:avgCostRate>40?"text-red-500":"text-emerald-600"},
                    {l:"위험 메뉴",v:`${dangerMenus.length}개`,c:dangerMenus.length>0?"text-red-500":"text-emerald-600"},
                    {l:"평균 건당 마진",v:fmt(menus.reduce((a,m)=>a+m.margin,0)/menus.length)+"원",c:"text-blue-600"},
                  ].map(s=>(
                    <div key={s.l} className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-400 mb-1">{s.l}</p>
                      <p className={`text-base font-bold ${s.c}`}>{s.v}</p>
                    </div>
                  ))}
                </div>
                {/* 메뉴 리스트 */}
                <div className="rounded-2xl border border-slate-100 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">메뉴명</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">카테고리</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">판매가</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">원가</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">원가율</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">건당 마진</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {menus.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">{m.name}</td>
                          <td className="px-4 py-3 text-slate-500">{m.category}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{fmt(m.price)}원</td>
                          <td className="px-4 py-3 text-right text-slate-500">{fmt(m.cost)}원</td>
                          <td className={`px-4 py-3 text-right font-bold ${m.cost_rate > 40 ? "text-red-500" : m.cost_rate > 30 ? "text-amber-600" : "text-emerald-600"}`}>
                            {m.cost_rate.toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-right text-blue-600 font-semibold">{fmt(m.margin)}원</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
