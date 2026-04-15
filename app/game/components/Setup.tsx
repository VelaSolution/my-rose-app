"use client";
import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { loadFormData, getSaveSlots } from "@/lib/storage";
import type { Industry, GameMode, S } from "../types";
import { IND, B, G50, G100, G200, G400, G600, G800, G900, GN, GNL, RD, RDL } from "../constants";
import { getWx } from "../lib/game-logic";

export default function Setup({onStart}:{onStart:(s:S)=>void}) {
  const [step, setStep]   = useState<0|1|2|3>(0);
  const [mode, setMode]   = useState<GameMode>("free");
  const [ind,  setInd]    = useState<Industry>("cafe");
  const [sname,setSname]  = useState("");
  const [spend,  setSpend]   = useState(7000);
  const [cogs,   setCogs]    = useState(28);
  const [rent,   setRent]    = useState(0);
  const [util,   setUtil]    = useState(0);
  const [labor,  setLabor]   = useState(0);
  const [targetRevenue, setTargetRevenue] = useState("");
  const [targetProfit,  setTargetProfit]  = useState("");
  const [growthTarget,  setGrowthTarget]  = useState(2);
  const [simLoaded, setSimLoaded] = useState(false);
  const [showSimPicker, setShowSimPicker] = useState(false);
  const [simSaves, setSimSaves] = useState<{id:string;name:string;industry:string;avgSpend:number;cogsRate:number;savedAt:string;source?:string;rent?:number;util?:number;labor?:number;capital?:number}[]>([]);


  useEffect(()=>{ setSpend(IND[ind].spend); setCogs(IND[ind].cogs); },[ind]);

  // 저장된 시뮬레이션 목록 불러오기 (localStorage + Supabase)
  const openSimPicker = async () => {
    try {
      const all: typeof simSaves = [];

      // 1. localStorage 최근 시뮬레이션
      const f = loadFormData<Record<string, unknown>>();
      if (f && f.industry) {
        all.push({ id:"current", name:"최근 시뮬레이션 (임시저장)", industry:(f.industry as string)||"restaurant", avgSpend:Number(f.avgSpend||0), cogsRate:Number(f.cogsRate||0), savedAt:"현재", source:"sim" });
      }

      // 2. localStorage 저장 목록
      const localSaves = getSaveSlots();
      localSaves.forEach((s) => {
        const form = s.form as Record<string, unknown> | undefined;
        all.push({ id:"local-"+s.id, name:s.label||"저장된 시뮬레이션", industry:(form?.industry as string)||"restaurant", avgSpend:Number(form?.avgSpend||0), cogsRate:Number(form?.cogsRate||0), savedAt:s.savedAt||"", source:"sim" });
      });

      // 3. Supabase 클라우드 저장 목록
      try {
        const sb = createSupabaseBrowserClient();
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          // 시뮬레이션 기록
          const { data: simData } = await sb
            .from("simulation_history")
            .select("id, label, created_at, form, result")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20);
          if (simData) {
            simData.forEach((row: {id:string; label:string; created_at:string; form?:Record<string,unknown>; result?:Record<string,unknown>}) => {
              const f = row.form || {};
              const r = row.result || {};
              const avgSpend = Number(f.avgSpend || f.avg_spend || 0);
              const cogsRate = Number(f.cogsRate || f.cogs_rate || f.cogsRatio || r.cogsRate || 0);
              const industry = String(f.industry || "restaurant");
              const rent = Number(f.rent || 0);
              const util = Number(f.utilities || f.util || 0);
              const labor = Number(f.laborCost || f.labor_cost || r.laborCost || 0);
              const date = new Date(row.created_at).toLocaleDateString("ko-KR", {month:"short", day:"numeric"});
              all.push({ id:"sb-"+row.id, name:`☁️ ${row.label} (${date})`, industry, avgSpend, cogsRate, savedAt:row.created_at, source:"sim", rent, util, labor });
            });
          }

          // 월별 매출 기록
          const { data: monthData } = await sb
            .from("monthly_snapshots")
            .select("id, month, industry, total_sales, cogs, labor_cost, rent, utilities, avg_spend, customer_count")
            .eq("user_id", user.id)
            .order("month", { ascending: false })
            .limit(12);
          if (monthData) {
            monthData.forEach((row: {id:string; month:string; industry:string; total_sales:number; cogs:number; labor_cost:number; rent:number; utilities:number; avg_spend:number; customer_count:number}) => {
              const avgSpend = row.avg_spend || (row.customer_count > 0 ? Math.round(row.total_sales / row.customer_count) : Math.round(row.total_sales / 30 / 50));
              const cogsRate = row.total_sales > 0 ? Math.round((row.cogs / row.total_sales) * 100) : 30;
              all.push({ id:"month-"+row.id, name:`📈 ${row.month} 월별매출 (${(row.total_sales/10000).toFixed(0)}만원)`, industry:row.industry||"restaurant", avgSpend, cogsRate, savedAt:row.month, source:"monthly", rent:row.rent||0, util:row.utilities||0, labor:row.labor_cost||0 });
            });
          }
        }
      } catch (e) { console.error("Supabase 불러오기 실패:", e); }

      if (all.length===0) { alert("저장된 시뮬레이션 결과가 없어요.\n시뮬레이터에서 먼저 분석을 완료해주세요!"); return; }
      setSimSaves(all);
      setShowSimPicker(true);
    } catch { alert("불러오기 실패. 다시 시도해주세요."); }
  };

  const applySimSave = (save: typeof simSaves[0]) => {
    if (save.industry && IND[save.industry as Industry]) setInd(save.industry as Industry);
    if (save.avgSpend)   setSpend(save.avgSpend);
    if (save.cogsRate)   setCogs(save.cogsRate);
    if (save.rent)       setRent(save.rent);
    if (save.util)       setUtil(save.util);
    if (save.labor)      setLabor(save.labor);
    setSimLoaded(true);
    setShowSimPicker(false);
  };

  const cfg = IND[ind];
  const start = () => {
    const name = sname.trim() || (cfg.icon+" 나의 "+cfg.label);
    const monthlyRent = rent > 0 ? rent : cfg.rent;
    const monthlyUtil = util > 0 ? util : cfg.util;
    const monthlyLabor = labor > 0 ? labor : cfg.staff.reduce((a,s)=>a+s.wage*26,0);
    const initCash = monthlyRent + monthlyUtil + monthlyLabor; // 한 달 운영비를 초기 현금으로
    onStart({
      day:1, maxDays:90, cash:initCash, rep:60, phase:"morning",
      mode, ind, name, base:cfg.base, spend, cogs,
      rent: monthlyRent,
      util: monthlyUtil,
      staff:cfg.staff.map(s=>({...s})), ev:null, efx:[],
      totalRev:0, totalProfit:0, logs:[],
      wx:getWx(1), cust:0, rev:0, cost:0, todayProfit:0,
      flags:{}, exp:0, streak:0, best:0,
      monthlyProfit:0, negStreak:0,
      targetRevenue: targetRevenue ? Number(targetRevenue) : undefined,
      targetProfit:  targetProfit  ? Number(targetProfit)  : undefined,
      growthTarget:  growthTarget,
      firstMonthRev: undefined,
    });
  };

  const bar = (
    <div style={{display:"flex",gap:6,marginBottom:28}}>
      {[0,1,2,3].map(i=><div key={i} style={{flex:1,height:4,borderRadius:2,background:step>=i?B:G200}} />)}
    </div>
  );

  const MODES: {id:GameMode; icon:string; label:string; desc:string; color:string}[] = [
    {id:"free",    icon:"🎯", label:"자유 모드",      desc:"90일 동안 최대 순이익 달성",        color:"#3182F6"},
    {id:"target",  icon:"📈", label:"목표 달성 모드",  desc:"설정한 매출/순이익 목표를 달성",     color:"#00B386"},
    {id:"survive", icon:"🛡️", label:"생존 모드",      desc:"적자 없이 최대한 오래 버티기",       color:"#F59E0B"},
    {id:"growth",  icon:"🚀", label:"성장 모드",       desc:"첫 달 대비 매출 목표 배수 달성",     color:"#8B5CF6"},
  ];

  if (step===0) return (
    <div style={{minHeight:"100vh",background:G50,fontFamily:"'Pretendard','Apple SD Gothic Neo',system-ui,sans-serif"}}>
      <div style={{maxWidth:520,margin:"0 auto",padding:"32px 20px"}}>
        {bar}
        <h2 style={{fontSize:24,fontWeight:800,color:G900,marginBottom:6,fontFamily:"inherit"}}>게임 모드를 선택하세요</h2>
        <p style={{fontSize:15,color:G600,marginBottom:20}}>목표에 맞는 모드로 도전해보세요!</p>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
          {MODES.map(m=>{
            const sel=mode===m.id;
            return (
              <button key={m.id} onClick={()=>setMode(m.id)}
                style={{padding:"18px 20px",borderRadius:18,border:"2px solid "+(sel?m.color:G200),background:sel?m.color+"12":"#fff",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:16}}>
                <div style={{fontSize:32,flexShrink:0}}>{m.icon}</div>
                <div>
                  <p style={{fontSize:16,fontWeight:700,color:sel?m.color:G900,margin:"0 0 3px"}}>{m.label}</p>
                  <p style={{fontSize:13,color:G600,margin:0}}>{m.desc}</p>
                </div>
                {sel && <div style={{marginLeft:"auto",width:20,height:20,borderRadius:10,background:m.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,flexShrink:0}}>✓</div>}
              </button>
            );
          })}
        </div>
        <button onClick={()=>setStep(1)} style={{width:"100%",padding:"16px",borderRadius:14,border:"none",background:MODES.find(m=>m.id===mode)?.color||B,color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          다음 →
        </button>
      </div>
    </div>
  );

  if (step===1) return (
    <div style={{minHeight:"100vh",background:G50,fontFamily:"'Pretendard','Apple SD Gothic Neo',system-ui,sans-serif"}}>
      <div style={{maxWidth:520,margin:"0 auto",padding:"32px 20px"}}>
        {bar}
        <h2 style={{fontSize:24,fontWeight:800,color:G900,marginBottom:6,fontFamily:"inherit"}}>어떤 업종으로 시작할까요?</h2>
        <p style={{fontSize:15,color:G600,marginBottom:20}}>업종별 특성이 다르니 잘 고려해보세요</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          {(Object.keys(IND) as Industry[]).map(k=>{
            const c=IND[k], sel=ind===k;
            return (
              <button key={k} onClick={()=>setInd(k)} style={{padding:"16px 14px",borderRadius:18,border:"2px solid "+(sel?c.color:G200),background:sel?c.color+"15":"#fff",cursor:"pointer",textAlign:"left"}}>
                <div style={{fontSize:26,marginBottom:6}}>{c.icon}</div>
                <p style={{fontSize:16,fontWeight:700,color:sel?c.color:G900,margin:"0 0 3px"}}>{c.label}</p>
                <p style={{fontSize:13,color:G600,margin:0}}>{c.desc}</p>
              </button>
            );
          })}
        </div>
        <div style={{background:"#fff",border:"1px solid "+G200,borderRadius:16,padding:16,marginBottom:14}}>
          <p style={{fontSize:15,fontWeight:700,color:G900,marginBottom:8}}>가게 이름</p>
          <input value={sname} onChange={e=>setSname(e.target.value)} placeholder={cfg.icon+" 나의 소중한 "+cfg.label}
            style={{width:"100%",padding:"12px 14px",borderRadius:12,border:"1px solid "+G200,fontSize:15,outline:"none",fontFamily:"inherit",boxSizing:"border-box" as const,color:G900}} />
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setStep(0)} style={{flex:1,padding:"14px",borderRadius:14,border:"1px solid "+G200,background:"#fff",color:G800,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>← 이전</button>
          <button onClick={()=>setStep(2)} style={{flex:2,padding:"14px",borderRadius:14,border:"none",background:cfg.color,color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>다음 →</button>
        </div>
      </div>
    </div>
  );

  if (step===2) return (
    <div style={{minHeight:"100vh",background:G50,fontFamily:"'Pretendard','Apple SD Gothic Neo',system-ui,sans-serif"}}>
      <div style={{maxWidth:520,margin:"0 auto",padding:"32px 20px"}}>
        {bar}
        <h2 style={{fontSize:24,fontWeight:800,color:G900,marginBottom:6,fontFamily:"inherit"}}>게임 조건을 설정하세요</h2>
        <p style={{fontSize:15,color:G600,marginBottom:20}}>내 맘대로 조정 가능해요</p>

        {/* 시뮬레이터 저장값 선택 */}
        <button onClick={openSimPicker} style={{width:"100%",padding:"13px 16px",borderRadius:14,border:"2px dashed "+(simLoaded?GN:G200),background:simLoaded?GNL:"#fff",color:simLoaded?GN:G600,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          {simLoaded ? "✅ 데이터 적용됨 (다시 선택하기)" : "📊 내 시뮬레이션 · 월별매출 불러오기 →"}
        </button>

        {/* 시뮬레이션 선택 모달 */}
        {showSimPicker && (
          <div style={{background:"#fff",border:"1px solid "+G200,borderRadius:16,padding:16,marginBottom:14,boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <p style={{fontSize:14,fontWeight:700,color:G900,margin:0}}>📊 데이터 선택</p>
              <button onClick={()=>setShowSimPicker(false)} style={{fontSize:13,color:G400,background:"none",border:"none",cursor:"pointer"}}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {/* 좌측: 시뮬레이션 기록 */}
              <div>
                <p style={{fontSize:11,fontWeight:700,color:G400,margin:"0 0 8px",letterSpacing:"0.5px"}}>📊 시뮬레이션 기록</p>
                <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:300,overflowY:"auto"}}>
                  {simSaves.filter(s=>s.source!=="monthly").length===0
                    ? <p style={{fontSize:12,color:G400,padding:"12px 0"}}>저장된 시뮬레이션이 없어요</p>
                    : simSaves.filter(s=>s.source!=="monthly").map(s=>(
                      <button key={s.id} onClick={()=>applySimSave(s)} style={{padding:"10px 12px",borderRadius:12,border:"1px solid "+G200,background:G50,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
                        <p style={{fontSize:13,fontWeight:700,color:G900,margin:"0 0 3px",lineHeight:1.3}}>{s.name}</p>
                        <p style={{fontSize:11,color:G400,margin:0}}>
                          {IND[s.industry as Industry]?.icon} {IND[s.industry as Industry]?.label||s.industry}
                        </p>
                        <p style={{fontSize:11,color:G600,margin:"2px 0 0"}}>
                          객단가 {s.avgSpend.toLocaleString()}원 · 원가율 {s.cogsRate}%
                        </p>
                      </button>
                    ))
                  }
                </div>
              </div>
              {/* 우측: 월별 매출 기록 */}
              <div>
                <p style={{fontSize:11,fontWeight:700,color:G400,margin:"0 0 8px",letterSpacing:"0.5px"}}>📈 월별 매출 기록</p>
                <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:300,overflowY:"auto"}}>
                  {simSaves.filter(s=>s.source==="monthly").length===0
                    ? <p style={{fontSize:12,color:G400,padding:"12px 0"}}>등록된 월별 매출이 없어요</p>
                    : simSaves.filter(s=>s.source==="monthly").map(s=>(
                      <button key={s.id} onClick={()=>applySimSave(s)} style={{padding:"10px 12px",borderRadius:12,border:"1px solid "+G200,background:G50,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
                        <p style={{fontSize:13,fontWeight:700,color:G900,margin:"0 0 3px",lineHeight:1.3}}>{s.name}</p>
                        <p style={{fontSize:11,color:G400,margin:0}}>
                          {IND[s.industry as Industry]?.icon} {IND[s.industry as Industry]?.label||s.industry}
                        </p>
                        <p style={{fontSize:11,color:G600,margin:"2px 0 0"}}>
                          원가율 {s.cogsRate}%
                        </p>
                      </button>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* 모드별 추가 설정 */}
          {mode==="target" && (
            <div style={{background:"#fff",border:"1px solid "+G200,borderRadius:16,padding:16}}>
              <p style={{fontSize:15,fontWeight:700,color:G900,marginBottom:4}}>📈 목표 설정</p>
              <p style={{fontSize:13,color:G400,marginBottom:12}}>달성하고 싶은 월 목표를 입력하세요</p>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div>
                  <p style={{fontSize:13,fontWeight:600,color:G600,marginBottom:6}}>월 매출 목표 (원)</p>
                  <input type="number" value={targetRevenue} onChange={e=>setTargetRevenue(e.target.value)}
                    placeholder="예: 30000000" style={{width:"100%",padding:"12px 14px",borderRadius:12,border:"1px solid "+G200,fontSize:15,outline:"none",fontFamily:"inherit",boxSizing:"border-box" as const,color:G900}} />
                </div>
                <div>
                  <p style={{fontSize:13,fontWeight:600,color:G600,marginBottom:6}}>월 순이익 목표 (원)</p>
                  <input type="number" value={targetProfit} onChange={e=>setTargetProfit(e.target.value)}
                    placeholder="예: 5000000" style={{width:"100%",padding:"12px 14px",borderRadius:12,border:"1px solid "+G200,fontSize:15,outline:"none",fontFamily:"inherit",boxSizing:"border-box" as const,color:G900}} />
                </div>
              </div>
            </div>
          )}
          {mode==="growth" && (
            <div style={{background:"#fff",border:"1px solid "+G200,borderRadius:16,padding:16}}>
              <p style={{fontSize:15,fontWeight:700,color:G900,marginBottom:4}}>🚀 성장 목표</p>
              <p style={{fontSize:13,color:G400,marginBottom:12}}>첫 달 대비 몇 배 성장이 목표인가요?</p>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <p style={{fontSize:15,fontWeight:700,color:G900,margin:0}}>목표 배수</p>
                <span style={{fontSize:20,fontWeight:800,color:"#8B5CF6"}}>{growthTarget}배</span>
              </div>
              <input type="range" min={1.5} max={5} step={0.5} value={growthTarget} onChange={e=>setGrowthTarget(Number(e.target.value))} style={{width:"100%",accentColor:"#8B5CF6"}} />
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:G400,marginTop:4}}>
                <span>1.5배</span><span>5배</span>
              </div>
            </div>
          )}
          <div style={{background:"#fff",border:"1px solid "+G200,borderRadius:16,padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <p style={{fontSize:15,fontWeight:700,color:G900,margin:0}}>🍽️ 객단가</p>
              <span style={{fontSize:16,fontWeight:700,color:B}}>{spend.toLocaleString()}원</span>
            </div>
            <input type="range" min={3000} max={150000} step={500} value={spend} onChange={e=>setSpend(Number(e.target.value))} style={{width:"100%",accentColor:B}} />
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:G400,marginTop:4}}>
              <span>3,000원</span><span>150,000원</span>
            </div>
          </div>
          <div style={{background:"#fff",border:"1px solid "+G200,borderRadius:16,padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <p style={{fontSize:15,fontWeight:700,color:G900,margin:0}}>📦 초기 원가율</p>
              <span style={{fontSize:16,fontWeight:700,color:cogs>40?RD:GN}}>{cogs}%</span>
            </div>
            <input type="range" min={10} max={65} step={1} value={cogs} onChange={e=>setCogs(Number(e.target.value))} style={{width:"100%",accentColor:B}} />
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:G400,marginTop:4}}>
              <span>10%</span><span>65%</span>
            </div>
          </div>
          <div style={{background:"#fff",border:"1px solid "+G200,borderRadius:16,padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <p style={{fontSize:15,fontWeight:700,color:G900,margin:0}}>🏠 월 임대료</p>
              <span style={{fontSize:14,fontWeight:700,color:G800}}>{(rent>0?rent:cfg.rent).toLocaleString()}원</span>
            </div>
            <input type="range" min={300000} max={15000000} step={100000} value={rent>0?rent:cfg.rent} onChange={e=>setRent(Number(e.target.value))} style={{width:"100%",accentColor:B}} />
            <p style={{fontSize:12,color:G400,marginTop:4}}>{rent===0?"업종 기본값":"직접 설정"} — 기본값: {cfg.rent.toLocaleString()}원</p>
          </div>
          <div style={{background:"#fff",border:"1px solid "+G200,borderRadius:16,padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <p style={{fontSize:15,fontWeight:700,color:G900,margin:0}}>⚡ 월 공과금</p>
              <span style={{fontSize:14,fontWeight:700,color:G800}}>{(util>0?util:cfg.util).toLocaleString()}원</span>
            </div>
            <input type="range" min={100000} max={5000000} step={50000} value={util>0?util:cfg.util} onChange={e=>setUtil(Number(e.target.value))} style={{width:"100%",accentColor:B}} />
            <p style={{fontSize:12,color:G400,marginTop:4}}>{util===0?"업종 기본값":"직접 설정"} — 기본값: {cfg.util.toLocaleString()}원</p>
          </div>
          <div style={{background:"#fff",border:"1px solid "+G200,borderRadius:16,padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <p style={{fontSize:15,fontWeight:700,color:G900,margin:0}}>👥 월 인건비</p>
              <span style={{fontSize:14,fontWeight:700,color:G800}}>{(labor>0?labor:cfg.staff.reduce((a,s)=>a+s.wage*26,0)).toLocaleString()}원</span>
            </div>
            <input type="range" min={500000} max={20000000} step={100000}
              value={labor>0?labor:cfg.staff.reduce((a,s)=>a+s.wage*26,0)}
              onChange={e=>setLabor(Number(e.target.value))} style={{width:"100%",accentColor:B}} />
            <p style={{fontSize:12,color:G400,marginTop:4}}>{labor===0?"직원 기본값":"직접 설정"} — 직원 {cfg.staff.length}명 기준</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:16}}>
          <button onClick={()=>setStep(1)} style={{flex:1,padding:"14px",borderRadius:14,border:"1px solid "+G200,background:"#fff",color:G800,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>← 이전</button>
          <button onClick={()=>setStep(3)} style={{flex:2,padding:"14px",borderRadius:14,border:"none",background:cfg.color,color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>다음 →</button>
        </div>
      </div>
    </div>
  );

  if (step!==3) return null;
  return (
    <div style={{minHeight:"100vh",background:G50,fontFamily:"'Pretendard','Apple SD Gothic Neo',system-ui,sans-serif"}}>
      <div style={{maxWidth:520,margin:"0 auto",padding:"32px 20px"}}>
        {bar}
        {/* 모드 뱃지 */}
        {(()=>{const m=MODES.find(m=>m.id===mode); return m?<div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:20,background:m.color+"15",border:"1px solid "+m.color+"40",marginBottom:16}}><span>{m.icon}</span><span style={{fontSize:13,fontWeight:700,color:m.color}}>{m.label}</span></div>:null;})()}
        <h2 style={{fontSize:24,fontWeight:800,color:G900,marginBottom:6,fontFamily:"inherit"}}>준비됐나요?</h2>
        <p style={{fontSize:15,color:G600,marginBottom:20}}>설정을 확인하고 게임을 시작하세요</p>
        <div style={{background:"#fff",border:"1px solid "+G200,borderRadius:20,padding:20,marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16,paddingBottom:16,borderBottom:"1px solid "+G100}}>
            <div style={{fontSize:44}}>{cfg.icon}</div>
            <div>
              <p style={{fontSize:20,fontWeight:800,color:G900,margin:"0 0 4px"}}>{sname.trim()||cfg.icon+" 나의 "+cfg.label}</p>
              <p style={{fontSize:14,color:G600,margin:0}}>{cfg.label}</p>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[
              {l:"객단가",    v:spend.toLocaleString()+"원"},
              {l:"원가율",    v:cogs+"%"},
              {l:"월 임대료", v:(rent>0?rent:cfg.rent).toLocaleString()+"원"},
              {l:"월 공과금", v:(util>0?util:cfg.util).toLocaleString()+"원"},
              {l:"월 인건비", v:(labor>0?labor:cfg.staff.reduce((a,s)=>a+s.wage*26,0)).toLocaleString()+"원"},
              {l:"기간",      v:"90일"},
              ...(mode==="target"&&targetRevenue?[{l:"매출 목표",v:Number(targetRevenue).toLocaleString()+"원"}]:[]),
              ...(mode==="target"&&targetProfit?[{l:"순이익 목표",v:Number(targetProfit).toLocaleString()+"원"}]:[]),
              ...(mode==="growth"?[{l:"성장 목표",v:growthTarget+"배"}]:[]),
            ].map(x=>(
              <div key={x.l} style={{background:G50,borderRadius:12,padding:"12px 14px"}}>
                <p style={{fontSize:13,color:G400,margin:"0 0 4px"}}>{x.l}</p>
                <p style={{fontSize:15,fontWeight:700,color:G900,margin:0}}>{x.v}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setStep(2)} style={{flex:1,padding:"14px",borderRadius:14,border:"1px solid "+G200,background:"#fff",color:G800,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>← 이전</button>
          <button onClick={start} style={{flex:2,padding:"17px",borderRadius:14,border:"none",background:cfg.color,color:"#fff",fontSize:17,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>🚀 게임 시작!</button>
        </div>
      </div>
    </div>
  );
}
