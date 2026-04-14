"use client";
import Link from "next/link";
import type { S } from "../types";
import { G50, G100, G200, G400, G600, G800, G900, B } from "../constants";

export default function Menu({onNew,onLoad,saved,cloudSaved,onCloudLoad}:{onNew:()=>void;onLoad:()=>void;saved:S|null;cloudSaved?:S|null;onCloudLoad?:()=>void}) {
  return (
    <div style={{minHeight:"100vh",background:G50,fontFamily:"'Pretendard','Apple SD Gothic Neo',system-ui,sans-serif"}}>

      <div style={{maxWidth:480,margin:"0 auto",padding:"48px 20px"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:60,marginBottom:12}}>🏪</div>
          <h1 style={{fontSize:34,fontWeight:800,color:G900,margin:"0 0 10px",letterSpacing:-1,fontFamily:"inherit"}}>내 가게 키우기</h1>
          <p style={{fontSize:17,color:G600,margin:0,lineHeight:1.6}}>90일간 매장을 운영해 최고의 사장님이 되세요!<br />날씨 · 이벤트 · 직원 관리 — 진짜 경영 시뮬레이션</p>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <button onClick={onNew} style={{padding:"17px 20px",borderRadius:14,border:"none",background:B,color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            🚀 새 게임 시작
          </button>
          {saved && (
            <button onClick={onLoad} style={{padding:"15px 20px",borderRadius:14,border:"1px solid "+G200,background:"#fff",color:G800,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span>📂 이어하기</span>
                <span style={{fontSize:13,color:G400}}>{saved.name} · {saved.day}일차{saved.savedAt?" · "+new Date(saved.savedAt).toLocaleDateString("ko-KR"):""}</span>
              </div>
            </button>
          )}
          {cloudSaved && onCloudLoad && (
            <button onClick={onCloudLoad} style={{padding:"15px 20px",borderRadius:14,border:"1px solid "+G200,background:"#fff",color:G800,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span>☁️ 클라우드 이어하기</span>
                <span style={{fontSize:13,color:G400}}>{cloudSaved.name} · {cloudSaved.day}일차</span>
              </div>
            </button>
          )}
          <Link href="/simulator" style={{display:"block",padding:"14px 20px",borderRadius:14,border:"1px solid "+G200,background:"#fff",color:G800,fontSize:15,fontWeight:600,textDecoration:"none",textAlign:"center"}}>
            📊 시뮬레이터로 내 매장 분석하기 →
          </Link>
        </div>
        <div style={{background:"#fff",border:"1px solid "+G200,borderRadius:20,padding:20,marginTop:28}}>
          <p style={{fontSize:15,fontWeight:700,color:G900,marginBottom:14}}>게임 안내</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["🗓️","기간","90일 일별 운영"],["🌦️","날씨","매일 랜덤 변화"],["📢","이벤트","10가지 돌발 상황"],["🏆","목표","최대 순이익 달성"]].map(([icon,t,d])=>(
              <div key={t} style={{background:G50,borderRadius:12,padding:"12px 14px"}}>
                <p style={{fontSize:16,margin:"0 0 3px"}}>{icon}</p>
                <p style={{fontSize:14,fontWeight:600,color:G900,margin:0}}>{t}</p>
                <p style={{fontSize:13,color:G600,margin:0}}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
