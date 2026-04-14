"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import DataBackup from "@/components/DataBackup";
import DarkModeToggle from "@/components/DarkModeToggle";
import ConsentManager from "@/components/ConsentManager";
import NotificationSettings from "@/components/NotificationSettings";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { fmt } from "@/lib/vela";
import type { User } from "@supabase/supabase-js";

type HistoryRow = {
  id: string; label: string; created_at: string;
  result: { totalSales:number; netProfit:number; netMargin:number; bep:number };
  form: { industry:string; avgSpend?:number; cogsRate?:number };
};

const II: Record<string,string> = { cafe:"☕",restaurant:"🍽️",bar:"🍺",finedining:"✨",gogi:"🥩" };
type Tab = "profile"|"history"|"subscription"|"account";

function TaxInvoiceForm({ userId, payments }: { userId: string | null; payments: { id: string; plan: string; amount: number; created_at: string; status: string }[] }) {
  const [bizNo, setBizNo] = useState("");
  const [bizName, setBizName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    const sb = createSupabaseBrowserClient();
    sb.from("tax_invoice_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false })
      .then(({ data }: { data: any[] | null }) => { if (data) setRequests(data); });
  }, [userId, submitted]);

  const handleSubmit = async () => {
    if (!bizNo.trim() || !bizName.trim() || !email.trim()) { alert("모든 필드를 입력해주세요"); return; }
    if (!selectedPayment) { alert("결제 건을 선택해주세요"); return; }
    if (!/^\d{3}-\d{2}-\d{5}$/.test(bizNo)) { alert("사업자번호 형식: 000-00-00000"); return; }
    setSubmitting(true);
    const sb = createSupabaseBrowserClient();
    const { error } = await sb.from("tax_invoice_requests").insert({
      user_id: userId, biz_no: bizNo.trim(), biz_name: bizName.trim(),
      email: email.trim(), payment_id: selectedPayment, status: "대기",
    });
    setSubmitting(false);
    if (error) { alert("신청 실패: " + error.message); return; }
    setSubmitted(true);
    setBizNo(""); setBizName(""); setEmail(""); setSelectedPayment("");
    alert("세금계산서 발행이 신청되었습니다. 영업일 기준 1~3일 내 발행됩니다.");
  };

  const donePayments = payments.filter(p => p.status === "done");

  return (
    <div className="space-y-4">
      {donePayments.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">결제 내역이 없습니다</p>
      ) : (
        <>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">결제 건 선택</label>
            <select className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
              value={selectedPayment} onChange={e => setSelectedPayment(e.target.value)}>
              <option value="">선택하세요</option>
              {donePayments.map(p => (
                <option key={p.id} value={p.id}>
                  {p.plan} 플랜 - {p.amount.toLocaleString("ko-KR")}원 ({new Date(p.created_at).toLocaleDateString("ko-KR")})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">사업자등록번호</label>
              <input className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                placeholder="000-00-00000" value={bizNo} onChange={e => setBizNo(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">상호명</label>
              <input className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                placeholder="회사명" value={bizName} onChange={e => setBizName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">이메일 (세금계산서 수신)</label>
            <input type="email" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
              placeholder="tax@company.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full rounded-xl bg-[#3182F6] text-white font-semibold px-5 py-2.5 text-sm hover:bg-[#2672DE] transition-all disabled:opacity-50">
            {submitting ? "신청 중..." : "세금계산서 발행 신청"}
          </button>
        </>
      )}

      {requests.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-500 mb-2">발행 신청 내역</h4>
          <div className="space-y-2">
            {requests.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between py-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-700">{r.biz_name}</span>
                  <span className="text-slate-400 ml-2">{r.biz_no}</span>
                </div>
                <span className={`font-semibold ${r.status === "완료" ? "text-emerald-600" : r.status === "대기" ? "text-amber-600" : "text-slate-500"}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const [user, setUser]             = useState<User|null>(null);
  const [history, setHistory]       = useState<HistoryRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<Tab>("profile");
  const [nickname, setNickname]     = useState("");
  const [editNick, setEditNick]     = useState(false);
  const [savingNick, setSavingNick] = useState(false);
  const [avatar, setAvatar]         = useState<string|null>(null);
  const [pwForm, setPwForm]   = useState({ next:"", confirm:"" });
  const [pwMsg, setPwMsg]     = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const [payments, setPayments] = useState<{id:string;plan:string;amount:number;status:string;created_at:string}[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const sb = typeof window !== "undefined" ? createSupabaseBrowserClient() : null;

  useEffect(()=>{
    if (!sb) return;
    sb.auth.getUser().then(({data:{user}}:{data:{user:User|null}})=>{
      setUser(user);
      if(!user){setLoading(false);return;}
      setNickname(user.user_metadata?.nickname||user.user_metadata?.full_name||user.email?.split("@")[0]||"");
      setAvatar(user.user_metadata?.avatar_url||null);
      sb.from("simulation_history").select("id,label,created_at,result,form")
        .eq("user_id",user.id).order("created_at",{ascending:false}).limit(24)
        .then(({data}:{data:HistoryRow[]|null})=>{
          setHistory(data??[]);
          sb!.from("payments").select("id,plan,amount,status,created_at")
            .eq("user_id",user.id).order("created_at",{ascending:false}).limit(10)
            .then(({data:pd}:{data:{id:string;plan:string;amount:number;status:string;created_at:string}[]|null})=>{
              setPayments(pd??[]);setLoading(false);
            });
        });
    });
  },[sb]);

  const saveNick = async()=>{
    if(!sb||!user||!nickname.trim())return;
    setSavingNick(true);
    await sb.auth.updateUser({data:{nickname:nickname.trim()}});
    setSavingNick(false); setEditNick(false);
  };

  const handleAvatar = async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0];
    if(!f||!user||!sb)return;
    const ext=f.name.split(".").pop();
    const path=`avatars/${user.id}.${ext}`;
    const {error}=await sb.storage.from("avatars").upload(path,f,{upsert:true});
    if(!error){
      const {data:{publicUrl}}=sb.storage.from("avatars").getPublicUrl(path);
      await sb.auth.updateUser({data:{avatar_url:publicUrl}});
      setAvatar(publicUrl);
    }
  };

  const changePassword = async()=>{
    if(!sb) return;
    if(!pwForm.next||pwForm.next!==pwForm.confirm){ setPwMsg("새 비밀번호가 일치하지 않아요."); return; }
    if(pwForm.next.length<6){ setPwMsg("비밀번호는 6자 이상이어야 해요."); return; }
    setSavingPw(true);
    const {error}=await sb.auth.updateUser({password:pwForm.next});
    if(error) setPwMsg("변경 실패: "+error.message);
    else { setPwMsg("✅ 비밀번호가 변경됐어요!"); setPwForm({next:"",confirm:""}); }
    setSavingPw(false);
    setTimeout(()=>setPwMsg(""),4000);
  };

  const delHistory = async(id:string)=>{
    if(!sb) return;
    await sb.from("simulation_history").delete().eq("id",id);
    setHistory(p=>p.filter(h=>h.id!==id));
  };

  const resetData = async(type:"simulations"|"monthly"|"menus"|"all")=>{
    if(!sb) return;
    const labels:Record<string,string>={
      simulations:"시뮬레이션 기록",
      monthly:"월별 매출 데이터",
      menus:"메뉴 원가 데이터",
      all:"모든 데이터",
    };
    if(!confirm(`${labels[type]}을 모두 삭제할까요?\n이 작업은 되돌릴 수 없어요.`)) return;
    const {data:{user}}=await sb.auth.getUser();
    if(!user)return;
    if(type==="simulations"||type==="all") await sb.from("simulation_history").delete().eq("user_id",user.id);
    if(type==="monthly"||type==="all")    await sb.from("monthly_snapshots").delete().eq("user_id",user.id);
    if(type==="menus"||type==="all")      await sb.from("menu_costs").delete().eq("user_id",user.id);
    if(type==="simulations"||type==="all") setHistory([]);
    setResetMsg(`✅ ${labels[type]} 초기화 완료`);
    setTimeout(()=>setResetMsg(""),3000);
  };

  const deleteAccount = async()=>{
    if(!sb) return;
    if(!confirm("정말로 탈퇴하시겠어요?\n모든 데이터가 영구 삭제되며 복구가 불가능합니다.")) return;
    if(!confirm("마지막 확인: 계정과 모든 데이터를 삭제합니다.")) return;
    const {data:{user}}=await sb.auth.getUser();
    if(!user)return;
    await Promise.all([
      sb.from("simulation_history").delete().eq("user_id",user.id),
      sb.from("monthly_snapshots").delete().eq("user_id",user.id),
      sb.from("menu_costs").delete().eq("user_id",user.id),
    ]);
    await sb.auth.signOut();
    window.location.href="/";
  };

  const displayName = user?.user_metadata?.nickname||user?.user_metadata?.full_name||user?.email?.split("@")[0]||"사용자";

  if(loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 space-y-4 animate-pulse">
        <div className="h-20 bg-slate-200 rounded-3xl" />
        <div className="h-12 bg-slate-200 rounded-2xl" />
        <div className="h-48 bg-slate-200 rounded-3xl" />
        <div className="h-48 bg-slate-200 rounded-3xl" />
      </div>
    </div>
  );
  if(!user) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="flex items-center justify-center h-[80vh]">
        <Link href="/login" className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white">로그인</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      
      <main className="px-4 py-8 md:px-8">
        <div className="mx-auto max-w-5xl space-y-5">

          {/* 상단 프로필 카드 */}
          <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200 flex items-center gap-4 flex-wrap">
            <button onClick={()=>fileRef.current?.click()} className="group relative flex-shrink-0">
              {avatar
                ? <Image src={avatar} alt="프로필" width={56} height={56} className="h-14 w-14 rounded-full object-cover"/>
                : <div className="h-14 w-14 rounded-full bg-slate-900 flex items-center justify-center text-white text-xl font-bold">
                    {displayName[0]?.toUpperCase()??"U"}
                  </div>
              }
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-medium">
                변경
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar}/>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-slate-900">{displayName}</p>
              <p className="text-sm text-slate-400">{user.email}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link href="/dashboard" className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition">
                대시보드
              </Link>
              <button onClick={()=>sb?.auth.signOut().then(()=>window.location.href="/")}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                로그아웃
              </button>
            </div>
          </div>

          {/* 탭 */}
          <div className="flex overflow-x-auto gap-1 rounded-2xl bg-white p-1 ring-1 ring-slate-200 scrollbar-hide">
            {([
              {k:"profile" as Tab, l:"⚙️ 프로필 설정"},
              {k:"history" as Tab, l:"📋 시뮬레이션 기록"},
              {k:"subscription" as Tab, l:"💳 구독 관리"},
              {k:"account" as Tab, l:"🛡️ 계정 관리"},
            ]).map(t=>(
              <button key={t.k} onClick={()=>setTab(t.k)}
                className={`flex-shrink-0 rounded-xl px-3 py-2 text-[11px] font-semibold transition whitespace-nowrap ${tab===t.k?"bg-slate-900 text-white":"text-slate-500 hover:text-slate-800"}`}>
                {t.l}
              </button>
            ))}
          </div>

          {/* ── 프로필 설정 탭 ── */}
          {tab==="profile" && (
            <div className="space-y-4">

              {/* 닉네임 */}
              <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">닉네임 변경</h3>
                {editNick ? (
                  <div className="flex gap-2">
                    <input value={nickname} onChange={e=>setNickname(e.target.value)}
                      onKeyDown={e=>e.key==="Enter"&&saveNick()}
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                      autoFocus/>
                    <button onClick={saveNick} disabled={savingNick}
                      className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                      {savingNick?"저장 중...":"저장"}
                    </button>
                    <button onClick={()=>setEditNick(false)}
                      className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-500">
                      취소
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-800">{displayName}</span>
                    <button onClick={()=>setEditNick(true)} className="text-xs font-semibold text-blue-500 hover:text-blue-700">변경</button>
                  </div>
                )}
              </div>

              {/* 프로필 사진 */}
              <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">프로필 사진</h3>
                <div className="flex items-center gap-4">
                  {avatar
                    ? <Image src={avatar} alt="프로필" width={64} height={64} className="h-16 w-16 rounded-full object-cover"/>
                    : <div className="h-16 w-16 rounded-full bg-slate-900 flex items-center justify-center text-white text-2xl font-bold">
                        {displayName[0]?.toUpperCase()??"U"}
                      </div>
                  }
                  <button onClick={()=>fileRef.current?.click()}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                    사진 변경
                  </button>
                </div>
              </div>

              {/* 비밀번호 변경 */}
              <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">비밀번호 변경</h3>
                <div className="space-y-2">
                  {[{key:"next",label:"새 비밀번호"},{key:"confirm",label:"새 비밀번호 확인"}].map(({key,label})=>(
                    <div key={key}>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">{label}</label>
                      <input type="password" value={pwForm[key as keyof typeof pwForm]}
                        onChange={e=>setPwForm(f=>({...f,[key]:e.target.value}))}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"/>
                    </div>
                  ))}
                </div>
                {pwMsg && (
                  <p className={`text-sm font-medium ${pwMsg.startsWith("✅")?"text-emerald-600":"text-red-500"}`}>{pwMsg}</p>
                )}
                <button onClick={changePassword} disabled={savingPw||!pwForm.next||!pwForm.confirm}
                  className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-40 transition">
                  {savingPw?"변경 중...":"비밀번호 변경"}
                </button>
              </div>
            </div>
          )}

          {/* ── 시뮬레이션 기록 탭 ── */}
          {tab==="history" && (
            <div className="rounded-3xl bg-white ring-1 ring-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">시뮬레이션 기록</h3>
                  <p className="text-xs text-slate-400 mt-0.5">클라우드에 저장된 분석 결과 ({history.length}개)</p>
                </div>
                <Link href="/simulator" className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition">
                  + 새 시뮬레이션
                </Link>
              </div>
              {history.length===0 ? (
                <div className="text-center py-12">
                  <p className="text-3xl mb-3">📊</p>
                  <p className="text-slate-500 text-sm mb-4">아직 저장된 시뮬레이션이 없어요</p>
                  <Link href="/simulator" className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white inline-block">
                    시뮬레이터 시작
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {history.map(h=>(
                    <li key={h.id} className="flex items-center gap-3 p-5 hover:bg-slate-50 transition">
                      <span className="text-xl flex-shrink-0">{II[h.form?.industry]??"📊"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{h.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(h.created_at).toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric"})}
                        </p>
                        <div className="flex gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-slate-600">매출 <b>{fmt(h.result.totalSales)}원</b></span>
                          <span className={`text-xs font-semibold ${h.result.netProfit>=0?"text-emerald-600":"text-red-500"}`}>
                            순이익 {fmt(h.result.netProfit)}원
                          </span>
                          <span className="text-xs text-slate-400">이익률 {(h.result.netMargin||0).toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Link href={`/result?historyId=${h.id}`}
                          className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
                          보기
                        </Link>
                        <button onClick={()=>delHistory(h.id)}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-red-400 hover:bg-red-50 transition">
                          삭제
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ── 구독 관리 탭 ── */}
          {tab==="subscription" && (
            <div className="space-y-4">
              {/* 현재 플랜 */}
              <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-4">현재 플랜</h3>
                {payments.length === 0 ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-bold text-slate-900">무료 플랜</p>
                      <p className="text-xs text-slate-400 mt-1">기본 기능을 무료로 이용 중이에요</p>
                    </div>
                    <Link href="/pricing"
                      className="rounded-xl bg-blue-600 text-white text-sm font-semibold px-4 py-2 hover:bg-blue-700 transition">
                      업그레이드 →
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full mb-2">
                          ✨ PRO
                        </span>
                        <p className="text-base font-bold text-slate-900">{payments[0].plan} 플랜</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(payments[0].created_at).toLocaleDateString("ko-KR")} 결제
                        </p>
                      </div>
                      <p className="text-lg font-bold text-blue-600">
                        {payments[0].amount.toLocaleString("ko-KR")}원
                      </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400">다음 갱신일: {(() => { const d = new Date(payments[0].created_at); d.setMonth(d.getMonth() + 1); return d.toLocaleDateString("ko-KR"); })()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            if (!confirm("정말 구독을 해지하시겠습니까?\n해지 즉시 무료 플랜으로 전환됩니다.")) return;
                            const res = await fetch("/api/subscription/cancel", { method: "POST" });
                            if (res.ok) {
                              alert("구독이 해지되었습니다. 무료 플랜으로 전환됩니다.");
                              window.location.reload();
                            } else {
                              alert("해지에 실패했습니다. 다시 시도해주세요.");
                            }
                          }}
                          className="text-xs font-semibold text-red-400 hover:text-red-500 transition border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50"
                        >
                          구독 해지
                        </button>
                        <a href="mailto:mnhyuk@velaanalytics.com?subject=[VELA] 환불 요청" className="text-xs font-semibold text-slate-400 hover:text-slate-500 transition border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50">
                          환불 문의
                        </a>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 결제 이력 */}
              <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-4">결제 이력</h3>
                {payments.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-3xl mb-2">💳</p>
                    <p className="text-slate-400 text-sm">결제 이력이 없어요</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {payments.map(p => (
                      <div key={p.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{p.plan} 플랜</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(p.created_at).toLocaleDateString("ko-KR", {year:"numeric",month:"long",day:"numeric"})}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">{p.amount.toLocaleString("ko-KR")}원</p>
                          <span className={`text-xs font-semibold ${p.status==="done"?"text-emerald-600":"text-red-500"}`}>
                            {p.status==="done"?"결제완료":"실패"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 세금계산서 발행 */}
              <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-4">🧾 세금계산서 발행</h3>
                <p className="text-xs text-slate-500 mb-4">사업자 등록번호를 입력하시면 결제 건에 대한 세금계산서를 발행해드립니다.</p>
                <TaxInvoiceForm userId={user?.id ?? null} payments={payments} />
              </div>

              {/* 플랜 비교 링크 */}
              <Link href="/pricing"
                className="block w-full rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4 text-center text-sm font-semibold text-slate-600 hover:bg-slate-100 transition">
                요금제 비교하기 →
              </Link>
            </div>
          )}

          {/* ── 계정 관리 탭 ── */}
          {tab==="account" && (
            <div className="space-y-4">

              {/* 글씨 크기 */}
              <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-1">🔤 글씨 크기</h3>
                <p className="text-xs text-slate-400 mb-3">화면 전체 글씨 크기를 조절합니다</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">가</span>
                  <input type="range" min={13} max={19} defaultValue={typeof window !== "undefined" ? parseInt(localStorage.getItem("vela-font-size") || "15") : 15}
                    onChange={e => { const s = e.target.value; document.documentElement.style.fontSize = s + "px"; localStorage.setItem("vela-font-size", s); }}
                    className="flex-1" style={{ accentColor: "#3182F6" }} />
                  <span className="text-base text-slate-900 font-bold">가</span>
                </div>
              </div>

              {/* 동의 관리 */}
              <ConsentManager userId={user?.id ?? null} />

              {/* 알림 설정 */}
              <NotificationSettings />

              {/* 다크모드 */}
              <DarkModeToggle />

              {/* 데이터 백업 */}
              <DataBackup />

              {/* 데이터 초기화 */}
              <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">데이터 초기화</h3>
                <p className="text-xs text-slate-400">선택한 데이터를 영구 삭제합니다. 되돌릴 수 없어요.</p>
                {resetMsg && <p className="text-sm font-medium text-emerald-600">{resetMsg}</p>}
                <div className="space-y-2">
                  {[
                    {type:"simulations" as const, label:"시뮬레이션 기록 초기화", desc:"저장된 분석 결과 전체 삭제"},
                    {type:"monthly" as const,     label:"월별 매출 데이터 초기화", desc:"대시보드 직접 등록 데이터 삭제"},
                    {type:"menus" as const,       label:"메뉴 원가 데이터 초기화", desc:"원가 계산기 등록 메뉴 전체 삭제"},
                    {type:"all" as const,         label:"모든 데이터 초기화",      desc:"위 모든 데이터 한 번에 삭제"},
                  ].map(item=>(
                    <div key={item.type} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{item.label}</p>
                        <p className="text-xs text-slate-400">{item.desc}</p>
                      </div>
                      <button onClick={()=>resetData(item.type)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition flex-shrink-0 ml-3 ${
                          item.type==="all"
                            ?"border-red-200 text-red-500 hover:bg-red-50"
                            :"border-slate-200 text-slate-500 hover:bg-slate-100"
                        }`}>
                        초기화
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 로그아웃 */}
              <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-3">로그아웃</h3>
                <button onClick={()=>sb?.auth.signOut().then(()=>window.location.href="/")}
                  className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                  로그아웃
                </button>
              </div>

              {/* 회원 탈퇴 */}
              <div className="rounded-3xl bg-white p-6 ring-1 ring-red-100">
                <h3 className="text-sm font-bold text-red-500 mb-1">회원 탈퇴</h3>
                <p className="text-xs text-slate-400 mb-4">
                  계정과 모든 데이터가 영구 삭제됩니다. 이 작업은 되돌릴 수 없어요.
                </p>
                <button onClick={deleteAccount}
                  className="w-full rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition">
                  탈퇴하기
                </button>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}
