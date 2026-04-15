"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import type { S } from "../types";
import { IND, WX, B, G50, G100, G200, G400, G600, G800, G900, GN, GNL, RD } from "../constants";
import { fmt, fmtN, calcScore, gradeOf, delSave } from "../lib/game-logic";

export default function Over({s, onMenu, onRestart}:{s:S; onMenu:()=>void; onRestart:()=>void}) {
  const sc = calcScore(s);
  const {g, c, e} = gradeOf(sc);
  const cfg = IND[s.ind];
  const [submitted, setSubmitted] = useState(false);
  const [myRank, setMyRank] = useState<number|null>(null);
  const [nick, setNick] = useState("익명 사장님");

  useEffect(()=>{
    delSave();
    // 클라우드 저장도 삭제
    (async()=>{ try { const sb2 = createSupabaseBrowserClient(); const {data:{user}} = await sb2.auth.getUser(); if(user) await sb2.from("game_saves").delete().eq("user_id",user.id); } catch{} })();
    (async()=>{
      try {
        const sb2 = createSupabaseBrowserClient();
        const {data:{user}} = await sb2.auth.getUser();
        let n = "익명 사장님";
        if (user) {
          const {data:p} = await sb2.from("profiles").select("nickname").eq("id",user.id).single();
          n = p?.nickname || user.email?.split("@")[0] || n;
        } else {
          try { n = JSON.parse(localStorage.getItem("vela-profile")||"{}").nickname || n; } catch {}
        }
        setNick(n);
        await sb2.from("game_rankings").insert({
          nickname:n, score:sc, grade:g,
          industry:IND[s.ind].label, industry_icon:IND[s.ind].icon, store_name:s.name,
          total_profit:s.totalProfit, reputation:s.rep, days:s.day, streak:s.streak,
        });
        const {count} = await sb2.from("game_rankings").select("*",{count:"exact",head:true}).gt("score",sc);
        setMyRank((count??0)+1);
      } catch {}
      setSubmitted(true);
    })();
  },[]);

  return (
    <div style={{minHeight:"100vh",background:G50,fontFamily:"'Pretendard','Apple SD Gothic Neo',system-ui,sans-serif"}}>

      <div style={{maxWidth:480,margin:"0 auto",padding:"28px 20px"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:60,marginBottom:8}}>{e}</div>
          <div style={{fontSize:52,fontWeight:800,color:c,marginBottom:8,letterSpacing:-2}}>{g}</div>
          <h2 style={{fontSize:22,fontWeight:800,color:G900,marginBottom:5,fontFamily:"inherit"}}>
            {g==="S"?"전설의 사장님!":g==="A"?"우수한 경영자!":g==="B"?"선방했어요!":g==="C"?"아슬아슬 흑자!":"다시 도전!"}
          </h2>
          <p style={{fontSize:14,color:G600}}>{s.day}일 운영 · {s.name}</p>
        </div>

        <div style={{background:"#fff",border:"2px solid "+c+"44",borderRadius:20,padding:20,marginBottom:14,textAlign:"center"}}>
          <p style={{fontSize:14,color:G400,margin:"0 0 4px",fontWeight:600}}>최종 점수</p>
          <p style={{fontSize:44,fontWeight:800,color:c,margin:"0 0 4px",letterSpacing:-1}}>{sc.toLocaleString()}</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginTop:12}}>
            {[{l:"순이익",v:Math.max(0,Math.floor(s.totalProfit/10000))},{l:"평판",v:Math.floor(s.rep*5)},{l:"연속흑자",v:s.streak*100},{l:"생존",v:s.day>=90?5000:Math.floor(s.day*30)}].map(item=>(
              <div key={item.l} style={{background:G50,borderRadius:10,padding:"8px 6px"}}>
                <p style={{fontSize:11,color:G400,margin:"0 0 2px"}}>{item.l}</p>
                <p style={{fontSize:14,fontWeight:700,color:G900,margin:0}}>{item.v.toLocaleString()}점</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{background:submitted?GNL:G50,border:"1px solid "+(submitted?"#A7F3D0":G200),borderRadius:16,padding:"14px 18px",marginBottom:14}}>
          {submitted ? (
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <p style={{fontSize:14,fontWeight:700,color:GN,margin:"0 0 2px"}}>🏆 랭킹 자동 등록 완료!</p>
                <p style={{fontSize:13,color:G600,margin:0}}>{nick} · {sc.toLocaleString()}점</p>
              </div>
              {myRank && <div style={{textAlign:"right"}}>
                <p style={{fontSize:12,color:G400,margin:"0 0 1px"}}>현재 순위</p>
                <p style={{fontSize:22,fontWeight:800,color:GN,margin:0}}>#{myRank}</p>
              </div>}
            </div>
          ) : (
            <p style={{fontSize:14,color:G600,margin:0}}>랭킹 등록 중...</p>
          )}
        </div>

        <div style={{background:"#fff",border:"1px solid "+G200,borderRadius:16,padding:16,marginBottom:14}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {[{l:"누적 순이익",v:fmtN(s.totalProfit)+"원",c:s.totalProfit>=0?GN:RD},{l:"최종 잔고",v:fmtN(s.cash)+"원",c:s.cash>=0?G900:RD},{l:"총 매출",v:fmtN(s.totalRev)+"원",c:B},{l:"최고 하루",v:s.best>0?fmt(s.best):"없음",c:"#F59E0B"}].map(item=>(
              <div key={item.l} style={{background:G50,borderRadius:10,padding:"9px 11px"}}>
                <p style={{fontSize:12,color:G400,margin:"0 0 3px"}}>{item.l}</p>
                <p style={{fontSize:15,fontWeight:700,color:item.c,margin:0}}>{item.v}</p>
              </div>
            ))}
          </div>
          {s.logs.slice(-5).reverse().map(l=>(
            <div key={l.day} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderTop:"1px solid "+G100,fontSize:14}}>
              <span style={{color:G400}}>{l.day}일 {WX[l.wx]?.icon}</span>
              <span style={{color:G600,flex:1,margin:"0 8px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.event??"평범한 하루"}</span>
              <span style={{color:l.profit>=0?GN:RD,fontWeight:700}}>{l.profit>=0?"+":"-"}{fmt(Math.abs(l.profit))}</span>
            </div>
          ))}
        </div>

        <div style={{display:"flex",gap:8}}>
          <button onClick={onMenu} style={{flex:1,padding:"13px",borderRadius:12,border:"1px solid "+G200,background:"#fff",color:G800,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>🏠 메인</button>
          <button onClick={onRestart} style={{flex:2,padding:"13px",borderRadius:12,border:"none",background:cfg.color,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>🔄 다시 도전!</button>
        </div>
        <div style={{textAlign:"center",marginTop:12}}>
          <Link href="/simulator" style={{fontSize:14,color:B,textDecoration:"none"}}>실제 시뮬레이터로 분석해보기 →</Link>
        </div>
      </div>
    </div>
  );
}
