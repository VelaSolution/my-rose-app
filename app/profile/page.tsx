"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { fmt } from "@/lib/vela";
import type { User } from "@supabase/supabase-js";

type HistoryRow = {
  id: string; label: string; created_at: string;
  result: { totalSales:number; netProfit:number; netMargin:number; bep:number; cogsRate?:number; laborRate?:number };
  form: { industry:string; avgSpend?:number; cogsRate?:number; laborCost?:number; rent?:number };
};

const II: Record<string,string> = { cafe:"☕",restaurant:"🍽️",bar:"🍺",finedining:"✨",gogi:"🥩" };
type Tab = "overview"|"history"|"monthly"|"menu_cost";

export default function ProfilePage() {
  const [user,setUser]         = useState<User|null>(null);
  const [history,setHistory]   = useState<HistoryRow[]>([]);
  const [loading,setLoading]   = useState(true);
  const [tab,setTab]           = useState<Tab>("overview");
  const [nickname,setNickname] = useState("");
  const [editNick,setEditNick] = useState(false);
  const [savingNick,setSavingNick] = useState(false);
  const [avatar,setAvatar]     = useState<string|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sb = createSupabaseBrowserClient();

  useEffect(()=>{
    sb.auth.getUser().then(({data:{user}})=>{
      setUser(user);
      if(!user){setLoading(false);return;}
      setNickname(user.user_metadata?.nickname||user.user_metadata?.full_name||user.email?.split("@")[0]||"");
      setAvatar(user.user_metadata?.avatar_url||null);
      sb.from("simulation_history").select("id,label,created_at,result,form").eq("user_id",user.id).order("created_at",{ascending:false}).limit(24)
        .then(({data})=>{setHistory(data??[]);setLoading(false);});
    });
  },[sb]);

  const saveNick = async()=>{
    if(!user||!nickname.trim())return;
    setSavingNick(true);
    await sb.auth.updateUser({data:{nickname:nickname.trim()}});
    setSavingNick(false);setEditNick(false);
  };

  const handleAvatar = async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0];
    if(!f||!user)return;
    const ext=f.name.split(".").pop();
    const path=`avatars/${user.id}.${ext}`;
    const {error}=await sb.storage.from("avatars").upload(path,f,{upsert:true});
    if(!error){
      const {data:{publicUrl}}=sb.storage.from("avatars").getPublicUrl(path);
      await sb.auth.updateUser({data:{avatar_url:publicUrl}});
      setAvatar(publicUrl);
    }
  };

  const delHistory = async(id:string)=>{
    await sb.from("simulation_history").delete().eq("id",id);
    setHistory(p=>p.filter(h=>h.id!==id));
  };

  // 월별 집계
  const monthly = (()=>{
    const m:Record<string,{label:string;sales:number;profit:number;count:number}>={};
    [...history].reverse().forEach(h=>{
      const d=new Date(h.created_at),k=`${d.getFullYear()}-${d.getMonth()+1}`;
      if(!m[k])m[k]={label:`${d.getFullYear()}년 ${d.getMonth()+1}월`,sales:0,profit:0,count:0};
      m[k].sales+=h.result.totalSales||0;m[k].profit+=h.result.netProfit||0;m[k].count++;
    });
    return Object.values(m).slice(-6);
  })();
  const maxSales=Math.max(...monthly.map(m=>m.sales),1);

  const displayName=user?.user_metadata?.nickname||user?.user_metadata?.full_name||user?.email?.split("@")[0]||"사용자";

  if(loading)return<div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-400">불러오는 중...</p></div>;
  if(!user)return<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Link href="/login" className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white">로그인</Link></div>;

  return(
    <div className="min-h-screen bg-slate-50">
      <NavBar/>
      <main className="px-4 py-8 md:px-8">
        <div className="mx-auto max-w-4xl space-y-6">

          {/* 프로필 카드 */}
          <section className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
            <div className="flex items-center gap-5 flex-wrap">
              {/* 아바타 */}
              <button onClick={()=>fileRef.current?.click()} className="group relative flex-shrink-0">
                {avatar
                  ?<img src={avatar} alt="프로필" className="h-16 w-16 rounded-full object-cover"/>
                  :<div className="h-16 w-16 rounded-full bg-slate-900 flex items-center justify-center text-white text-2xl font-bold">{displayName[0]?.toUpperCase()??"U"}</div>
                }
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs">변경</div>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar}/>

              {/* 이름/닉네임 */}
              <div className="flex-1 min-w-0">
                {editNick?(
                  <div className="flex items-center gap-2">
                    <input value={nickname} onChange={e=>setNickname(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveNick()}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus/>
                    <button onClick={saveNick} disabled={savingNick} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">{savingNick?"저장 중...":"저장"}</button>
                    <button onClick={()=>setEditNick(false)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-500">취소</button>
                  </div>
                ):(
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-slate-900">{displayName}</p>
                    <button onClick={()=>setEditNick(true)} className="rounded-lg border border-slate-200 px-2 py-0.5 text-xs text-slate-400 hover:text-slate-700">닉네임 변경</button>
                  </div>
                )}
                <p className="text-sm text-slate-400 mt-0.5">{user.email??user.phone}</p>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-2 flex-shrink-0">
                <Link href="/simulator" className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition">시뮬레이터 →</Link>
                <button onClick={()=>sb.auth.signOut().then(()=>window.location.href="/")} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">로그아웃</button>
              </div>
            </div>
          </section>

          {/* 탭 */}
          <div className="flex gap-1 rounded-2xl bg-white p-1 ring-1 ring-slate-200 overflow-x-auto">
            {([
              {k:"overview" as Tab,l:"📊 내 가게 현황"},
              {k:"history" as Tab,l:"📋 시뮬레이션 기록"},
              {k:"monthly" as Tab,l:"📈 월별 매출"},
              {k:"menu_cost" as Tab,l:"🍽️ 원가 현황"},
            ]).map(t=>(
              <button key={t.k} onClick={()=>setTab(t.k)}
                className={`flex-1 whitespace-nowrap rounded-xl py-2.5 px-3 text-sm font-semibold transition ${tab===t.k?"bg-slate-900 text-white shadow-sm":"text-slate-500 hover:text-slate-800"}`}>
                {t.l}
              </button>
            ))}
          </div>

          {/* 내 가게 현황 */}
          {tab==="overview"&&(
            <section className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
              {history.length===0?(
                <div className="text-center py-12">
                  <p className="text-3xl mb-3">📊</p>
                  <p className="text-slate-500 text-sm mb-4">아직 저장된 시뮬레이션이 없습니다.</p>
                  <Link href="/simulator" className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white">시뮬레이터 시작</Link>
                </div>
              ):(
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-400">최근 분석 결과</h3>
                      <span className="text-xs text-slate-400">{history[0].label}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        {l:"월 매출",v:fmt(history[0].result.totalSales)+"원",c:"text-slate-900"},
                        {l:"순이익",v:fmt(history[0].result.netProfit)+"원",c:history[0].result.netProfit>=0?"text-emerald-600":"text-red-500"},
                        {l:"순이익률",v:(history[0].result.netMargin||0).toFixed(1)+"%",c:"text-blue-600"},
                        {l:"원가율",v:(history[0].form?.cogsRate||0)+"%",c:(history[0].form?.cogsRate||0)>40?"text-red-500":"text-emerald-600"},
                      ].map(s=>(
                        <div key={s.l} className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs text-slate-400 mb-1">{s.l}</p>
                          <p className={`text-base font-bold ${s.c}`}>{s.v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-400 mb-3">원가율 추이 (최근 5회)</h3>
                    <div className="space-y-2">
                      {history.slice(0,5).map(h=>(
                        <div key={h.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                          <span>{II[h.form?.industry]??"📊"}</span>
                          <span className="text-sm font-medium text-slate-700 flex-1 truncate">{h.label}</span>
                          <span className="text-xs text-slate-400">{new Date(h.created_at).toLocaleDateString("ko-KR",{month:"short",day:"numeric"})}</span>
                          <span className={`text-sm font-bold ${(h.form?.cogsRate||0)>40?"text-red-500":"text-emerald-600"}`}>원가 {h.form?.cogsRate||0}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 시뮬레이션 기록 */}
          {tab==="history"&&(
            <section className="rounded-3xl bg-white ring-1 ring-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">시뮬레이션 기록</h2>
                  <p className="text-sm text-slate-400 mt-1">클라우드에 저장된 분석 결과</p>
                </div>
                <Link href="/simulator" className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">+ 새 시뮬레이션</Link>
              </div>
              {history.length===0?(
                <div className="p-12 text-center">
                  <p className="text-3xl mb-3">📊</p>
                  <p className="text-slate-500 text-sm">아직 저장된 시뮬레이션이 없습니다.</p>
                  <Link href="/simulator" className="mt-4 inline-block rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white">시뮬레이터 시작</Link>
                </div>
              ):(
                <ul className="divide-y divide-slate-100">
                  {history.map(h=>(
                    <li key={h.id} className="flex items-center gap-4 p-5 hover:bg-slate-50 transition">
                      <span className="text-2xl">{II[h.form?.industry]??"📊"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm">{h.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{new Date(h.created_at).toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})}</p>
                        <div className="flex gap-3 mt-1.5 flex-wrap">
                          <span className="text-xs text-slate-600">매출 <b>{fmt(h.result.totalSales)}원</b></span>
                          <span className={`text-xs font-semibold ${h.result.netProfit>=0?"text-emerald-600":"text-red-500"}`}>순이익 {fmt(h.result.netProfit)}원</span>
                          <span className="text-xs text-slate-400">이익률 {(h.result.netMargin||0).toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Link href={`/result?historyId=${h.id}`} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">보기</Link>
                        <button onClick={()=>delHistory(h.id)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-500">삭제</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* 월별 매출 */}
          {tab==="monthly"&&(
            <section className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">월별 매출 현황</h2>
                  <p className="text-sm text-slate-400 mt-1">시뮬레이션 저장 기준 월별 집계</p>
                </div>
                <Link href="/simulator" className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">+ 매출 등록</Link>
              </div>
              {monthly.length===0?(
                <div className="text-center py-12">
                  <p className="text-3xl mb-3">📈</p>
                  <p className="text-slate-500 text-sm mb-4">시뮬레이터에서 분석을 저장하면 월별 추이가 표시됩니다.</p>
                  <Link href="/simulator" className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white">시뮬레이터로 등록하기</Link>
                </div>
              ):(
                <div className="space-y-6">
                  {/* 막대 차트 */}
                  <div className="flex items-end gap-2 h-36 px-2">
                    {monthly.map(m=>(
                      <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                        <span className={`text-xs font-bold ${m.profit>=0?"text-emerald-600":"text-red-500"}`} style={{fontSize:"10px"}}>
                          {m.profit>=0?"+":""}{Math.round(m.profit/10000)}만
                        </span>
                        <div className="w-full rounded-t-lg bg-blue-500" style={{height:`${Math.max(4,(m.sales/maxSales)*100)}px`}}/>
                        <span className="text-center text-slate-400 leading-tight" style={{fontSize:"9px"}}>{m.label.replace("년 ","\n")}</span>
                      </div>
                    ))}
                  </div>
                  {/* 테이블 */}
                  <div className="rounded-2xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50"><tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">월</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">총 매출</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">순이익</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">분석 수</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {monthly.map(m=>(
                          <tr key={m.label} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-700">{m.label}</td>
                            <td className="px-4 py-3 text-right text-slate-700">{fmt(m.sales)}원</td>
                            <td className={`px-4 py-3 text-right font-semibold ${m.profit>=0?"text-emerald-600":"text-red-500"}`}>{m.profit>=0?"+":""}{fmt(m.profit)}원</td>
                            <td className="px-4 py-3 text-right text-slate-400">{m.count}회</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 원가 현황 */}
          {tab==="menu_cost"&&(
            <section className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900">원가 현황</h2>
                <p className="text-sm text-slate-400 mt-1">시뮬레이션별 원가율 추이 (최근 10회)</p>
              </div>
              {history.length===0?(
                <div className="text-center py-12"><p className="text-3xl mb-3">🍽️</p><p className="text-slate-500 text-sm">저장된 시뮬레이션이 없습니다.</p></div>
              ):(
                <div className="space-y-3">
                  {history.slice(0,10).map(h=>{
                    const cr=h.form?.cogsRate||0;
                    return(
                      <div key={h.id} className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span>{II[h.form?.industry]??"📊"}</span>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{h.label}</p>
                              <p className="text-xs text-slate-400">{new Date(h.created_at).toLocaleDateString("ko-KR",{month:"short",day:"numeric"})} · 매출 {fmt(h.result.totalSales)}원</p>
                            </div>
                          </div>
                          <span className={`text-sm font-bold px-3 py-1 rounded-full ${cr>40?"bg-red-100 text-red-600":cr>30?"bg-amber-100 text-amber-700":"bg-emerald-100 text-emerald-700"}`}>
                            원가율 {cr}%
                          </span>
                        </div>
                        <div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${cr>40?"bg-red-400":cr>30?"bg-amber-400":"bg-emerald-400"}`} style={{width:`${Math.min(cr*2,100)}%`}}/>
                          </div>
                          <div className="flex justify-between text-xs text-slate-400 mt-1">
                            <span>0%</span><span className="text-red-400">위험 40%</span><span>50%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

        </div>
      </main>
    </div>
  );
}
