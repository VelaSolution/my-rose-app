"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

// ─── 타입 ──────────────────────────────────
type Industry = "cafe"|"restaurant"|"bar"|"finedining";
type Weather = "sunny"|"rainy"|"cloudy"|"hot"|"snow";
type Phase = "select"|"intro"|"morning"|"event"|"result"|"gameover";

interface Staff { id:string; name:string; role:string; emoji:string; wage:number; mood:number; skill:number; absent:boolean; }
interface Effect { type:string; value:number; duration:number; label:string; }
interface DayLog { day:number; weather:Weather; customers:number; revenue:number; profit:number; event?:string; }
interface GameEvent { id:string; title:string; desc:string; icon:string; type:"crisis"|"opportunity"|"random"; npc?:string; npcName?:string; choices:Choice[]; }
interface Choice { label:string; desc:string; cost?:number; apply:(s:GS)=>Partial<GS>&{effects?:Effect[]}; }
interface GS {
  day:number; maxDays:number; cash:number; reputation:number;
  phase:Phase; industry:Industry; storeName:string;
  baseCustomers:number; avgSpend:number; cogsRate:number;
  rent:number; utilities:number; staff:Staff[];
  pendingEffects:Effect[]; totalRevenue:number; totalProfit:number; logs:DayLog[];
  weather:Weather; todayCustomers:number; todayRevenue:number; todayCost:number; todayProfit:number;
  flags:Record<string,boolean|number>; currentEvent:GameEvent|null;
  dialogue:string[]; dialogueIdx:number; showDialogue:boolean;
}

// ─── 설정 ──────────────────────────────────
const INDUSTRY:{[k in Industry]:{label:string;icon:string;storeEmoji:string;baseCustomers:number;avgSpend:number;cogsRate:number;rent:number;utilities:number;staff:Staff[];bgColor:string;accentColor:string;}} = {
  cafe:{label:"카페",icon:"☕",storeEmoji:"🏪",baseCustomers:80,avgSpend:7000,cogsRate:28,rent:1500000,utilities:400000,bgColor:"#FFF8F0",accentColor:"#D97706",
    staff:[{id:"s1",name:"김바리",role:"바리스타",emoji:"👩‍🍳",wage:80000,mood:80,skill:72,absent:false},{id:"s2",name:"이서빙",role:"서버",emoji:"🧑‍💼",wage:65000,mood:75,skill:60,absent:false}]},
  restaurant:{label:"음식점",icon:"🍽️",storeEmoji:"🏠",baseCustomers:60,avgSpend:22000,cogsRate:33,rent:3000000,utilities:800000,bgColor:"#F0FFF4",accentColor:"#059669",
    staff:[{id:"s1",name:"박셰프",role:"주방장",emoji:"👨‍🍳",wage:150000,mood:70,skill:85,absent:false},{id:"s2",name:"최홀",role:"홀서버",emoji:"👩‍💼",wage:70000,mood:75,skill:65,absent:false},{id:"s3",name:"강알바",role:"알바",emoji:"🧑",wage:55000,mood:65,skill:40,absent:false}]},
  bar:{label:"술집/바",icon:"🍺",storeEmoji:"🏮",baseCustomers:45,avgSpend:35000,cogsRate:22,rent:2500000,utilities:600000,bgColor:"#F5F0FF",accentColor:"#7C3AED",
    staff:[{id:"s1",name:"윤바텐더",role:"바텐더",emoji:"🧑‍🍳",wage:100000,mood:80,skill:80,absent:false},{id:"s2",name:"정서버",role:"서버",emoji:"👩",wage:70000,mood:70,skill:60,absent:false}]},
  finedining:{label:"파인다이닝",icon:"✨",storeEmoji:"🏛️",baseCustomers:20,avgSpend:90000,cogsRate:34,rent:5000000,utilities:1200000,bgColor:"#FFF0F5",accentColor:"#BE185D",
    staff:[{id:"s1",name:"오헤드",role:"헤드셰프",emoji:"👨‍🍳",wage:250000,mood:75,skill:95,absent:false},{id:"s2",name:"류소믈",role:"소믈리에",emoji:"🧑‍💼",wage:120000,mood:80,skill:85,absent:false}]},
};

const WEATHER:{[k in Weather]:{icon:string;label:string;mod:number;bgClass:string;}} = {
  sunny:{icon:"☀️",label:"맑음",mod:1.1,bgClass:"#87CEEB"},
  cloudy:{icon:"🌥️",label:"흐림",mod:1.0,bgClass:"#B0C4DE"},
  rainy:{icon:"🌧️",label:"비",mod:0.75,bgClass:"#708090"},
  hot:{icon:"🥵",label:"폭염",mod:0.85,bgClass:"#FFA07A"},
  snow:{icon:"❄️",label:"눈",mod:0.65,bgClass:"#E0E8F0"},
};

const EVENTS:GameEvent[] = [
  {id:"poisoning",title:"식중독 신고",desc:"손님이 SNS에 식중독 의심 글을 올렸습니다!\n빨리 대응하지 않으면 큰일 나요!",icon:"🤢",type:"crisis",npc:"😰",npcName:"단골손님",
    choices:[{label:"즉각 사과 + 보상",desc:"비용 50만원, 평판 피해 최소화",cost:500000,apply:s=>({reputation:Math.max(s.reputation-8,0),effects:[{type:"customers",value:-0.1,duration:5,label:"식중독 여파"}]})},
      {label:"조용히 개별 합의",desc:"비용 150만원, 완전 해결",cost:1500000,apply:s=>({})},
      {label:"사실 부인",desc:"비용 없음, 평판 폭락 위험",apply:s=>({reputation:Math.max(s.reputation-35,0),effects:[{type:"customers",value:-0.35,duration:10,label:"신뢰 추락"}]})}]},
  {id:"influencer",title:"인플루언서 방문!",desc:"팔로워 5만명 맛집 탐방 인플루언서가\n오늘 우리 가게를 방문했어요!",icon:"📱",type:"opportunity",npc:"🤳",npcName:"인플루언서",
    choices:[{label:"서비스 + 포스팅 요청",desc:"10만원 비용, 홍보 효과 폭발",cost:100000,apply:s=>({reputation:Math.min(s.reputation+15,100),effects:[{type:"customers",value:0.35,duration:14,label:"바이럴 효과"}]})},
      {label:"자연스럽게 대응",desc:"평판 소폭 상승",apply:s=>({reputation:Math.min(s.reputation+8,100),effects:[{type:"customers",value:0.15,duration:7,label:"자연 홍보"}]})}]},
  {id:"staffquit",title:"직원이 그만두겠대요",desc:`${"\n"}직원이 갑자기 사직서를 들고 왔습니다.\n이유는... 연봉 인상 요구!`,icon:"😤",type:"crisis",npc:"😤",npcName:"직원",
    choices:[{label:"연봉 20% 인상",desc:"인건비 부담 증가, 직원 유지",apply:s=>({staff:s.staff.map((st,i)=>i===0?{...st,wage:Math.round(st.wage*1.2),mood:95}:st)})},
      {label:"대화로 설득",desc:"50% 확률로 유지",apply:s=>Math.random()>0.5?{staff:s.staff.map((st,i)=>i===0?{...st,mood:80}:st)}:{staff:s.staff.filter((_,i)=>i!==0),effects:[{type:"customers",value:-0.2,duration:7,label:"직원 이탈"}]}},
      {label:"퇴사 수용 + 신규 채용",desc:"2주간 효율 저하",apply:s=>({effects:[{type:"customers",value:-0.15,duration:14,label:"신입 적응기간"}]})}]},
  {id:"tv",title:"TV 맛집 섭외!",desc:"지역 TV 프로그램 PD가 찾아왔어요!\n방영되면 대박날 수 있어요!",icon:"📺",type:"opportunity",npc:"🎬",npcName:"TV PD",
    choices:[{label:"출연 수락!",desc:"평판 폭발적 상승",apply:s=>({reputation:Math.min(s.reputation+25,100),effects:[{type:"customers",value:0.6,duration:21,label:"TV 방영 효과"}]})},
      {label:"거절 (부담스러워)",desc:"변화 없음",apply:s=>({})}]},
  {id:"blackout",title:"갑자기 정전!",desc:"조리 기구가 다 꺼졌어요!\n냉장고도 멈춰가고 있어요!",icon:"🔌",type:"crisis",npc:"😱",npcName:"사장님",
    choices:[{label:"발전기 대여 (30만원)",desc:"정상 영업 가능",cost:300000,apply:s=>({effects:[{type:"customers",value:-0.05,duration:1,label:"정전 여파"}]})},
      {label:"오늘 휴업",desc:"매출 없음",apply:s=>({effects:[{type:"customers",value:-1.0,duration:1,label:"임시 휴업"}]})},
      {label:"간단 메뉴만 운영",desc:"매출 50% 손실",apply:s=>({effects:[{type:"customers",value:-0.5,duration:1,label:"부분 영업"}]})}]},
  {id:"groupbook",title:"단체 예약 문의",desc:"30명 회사 회식 예약 전화가 왔어요!\n오늘 저녁 받으시겠어요?",icon:"👥",type:"opportunity",npc:"📞",npcName:"손님",
    choices:[{label:"전부 수락",desc:"오늘 매출 +50%",apply:s=>({effects:[{type:"customers",value:0.5,duration:1,label:"단체 예약"}]})},
      {label:"절반만 수락",desc:"매출 +20%, 일반 손님도 가능",apply:s=>({effects:[{type:"customers",value:0.2,duration:1,label:"부분 단체"}]})},
      {label:"거절",desc:"변화 없음",apply:s=>({})}]},
  {id:"rent",title:"임대료 인상 통보",desc:"건물주에게서 연락이 왔어요.\n다음달부터 임대료 20% 인상이래요!",icon:"🏠",type:"crisis",npc:"😠",npcName:"건물주",
    choices:[{label:"협상 시도",desc:"50% 확률로 10%만 인상",apply:s=>({rent:s.rent*(Math.random()>0.5?1.1:1.2)})},
      {label:"수용",desc:"임대료 20% 인상",apply:s=>({rent:s.rent*1.2})},
      {label:"이전 준비",desc:"200만원 비용, 다음달 임대료 -15%",cost:2000000,apply:s=>({rent:s.rent*0.85})}]},
  {id:"newcompetitor",title:"경쟁 업체 오픈!",desc:"바로 옆에 비슷한 가게가 생겼어요!\n손님들이 구경하러 가고 있어요...",icon:"😨",type:"crisis",npc:"😤",npcName:"경쟁업체 사장",
    choices:[{label:"가격 할인 대응",desc:"객단가 -8%, 손님 유지",apply:s=>({avgSpend:Math.round(s.avgSpend*0.92),effects:[{type:"customers",value:-0.05,duration:30,label:"경쟁 할인 중"}]})},
      {label:"메뉴 차별화",desc:"원가율 +2%p, 독자 경쟁력",apply:s=>({cogsRate:Math.min(s.cogsRate+2,70),effects:[{type:"customers",value:0.05,duration:30,label:"차별화 효과"}]})},
      {label:"무시하고 버팀",desc:"손님 일부 이탈",apply:s=>({effects:[{type:"customers",value:-0.15,duration:20,label:"경쟁 이탈"}]})}]},
  {id:"review",title:"악성 리뷰 테러!",desc:"1점짜리 리뷰가 쏟아지고 있어요...\n'음식이 상했다'는 내용이에요!",icon:"⭐",type:"crisis",npc:"😡",npcName:"악플러",
    choices:[{label:"정중한 공식 답변",desc:"평판 피해 최소화",apply:s=>({reputation:Math.max(s.reputation-5,0)})},
      {label:"리뷰어에게 사과+보상",desc:"10만원 비용, 리뷰 수정 유도",cost:100000,apply:s=>({reputation:Math.min(s.reputation+2,100)})},
      {label:"무시",desc:"평판 지속 하락",apply:s=>({reputation:Math.max(s.reputation-18,0),effects:[{type:"customers",value:-0.12,duration:7,label:"악성 리뷰 여파"}]})}]},
  {id:"seasonal",title:"연휴 특수 시작!",desc:"다음 주 황금연휴가 시작돼요!\n미리 준비하면 대박날 수 있어요!",icon:"🎉",type:"opportunity",npc:"🎊",npcName:"달력",
    choices:[{label:"재료+인력 보강",desc:"20만원 비용, 매출 폭발",cost:200000,apply:s=>({effects:[{type:"customers",value:0.45,duration:5,label:"연휴 특수"}]})},
      {label:"평소처럼",desc:"자연 증가만",apply:s=>({effects:[{type:"customers",value:0.2,duration:5,label:"연휴 자연 증가"}]})}]},
  {id:"loyalcustomer",title:"VIP 단골 등장!",desc:"매달 꼬박꼬박 오시는 VIP 손님이\n단골 등록을 요청하셨어요!",icon:"👑",type:"opportunity",npc:"🥰",npcName:"VIP 손님",
    choices:[{label:"VIP 카드 발급 (5% 혜택)",desc:"안정적인 매출 확보",apply:s=>({reputation:Math.min(s.reputation+5,100),effects:[{type:"customers",value:0.05,duration:-1,label:"VIP 단골"}]})},
      {label:"그냥 감사 인사만",desc:"평판 소폭 상승",apply:s=>({reputation:Math.min(s.reputation+3,100)})}]},
];

const fmt=(n:number)=>Math.round(n).toLocaleString("ko-KR");

function getWeather(day:number):Weather{
  const r=Math.random();
  const s=Math.floor(((day-1)%365)/90);
  if(s===1){if(r<0.3)return"hot";if(r<0.55)return"rainy";return r<0.8?"sunny":"cloudy";}
  if(s===3){if(r<0.2)return"snow";if(r<0.5)return"cloudy";return r<0.7?"rainy":"sunny";}
  return r<0.4?"sunny":r<0.6?"cloudy":r<0.8?"rainy":"cloudy";
}

function calcDay(s:GS):{customers:number;revenue:number;cost:number;profit:number}{
  const cfg=INDUSTRY[s.industry];
  const wMod=WEATHER[s.weather].mod;
  const rMod=0.6+(s.reputation/100)*0.8;
  const avgSkill=s.staff.filter(st=>!st.absent).reduce((a,st)=>a+st.skill,0)/Math.max(s.staff.filter(st=>!st.absent).length,1);
  const sMod=0.65+(avgSkill/100)*0.7;
  let cMod=wMod*rMod*sMod;
  let asMod=1.0;
  let cogsAdd=0;
  for(const e of s.pendingEffects){
    if(e.type==="customers")cMod*=(1+e.value);
    if(e.type==="avgSpend")asMod*=(1+e.value);
    if(e.type==="cogsRate")cogsAdd+=e.value;
  }
  const dow=(s.day-1)%7;
  const wkMod=dow>=5?1.4:dow===4?1.15:1.0;
  const customers=Math.max(0,Math.round(s.baseCustomers*cMod*wkMod*(0.8+Math.random()*0.4)));
  const avgSpend=s.avgSpend*asMod*(0.85+Math.random()*0.3);
  const revenue=customers*avgSpend;
  const cogs=revenue*Math.min(s.cogsRate+cogsAdd,95)/100;
  const cardFee=revenue*0.015;
  const dailyLabor=s.staff.filter(st=>!st.absent).reduce((a,st)=>a+st.wage,0);
  const monthlyFixed=s.day%30===0?(s.rent+s.utilities):0;
  const cost=cogs+cardFee+dailyLabor+monthlyFixed;
  return{customers:Math.round(customers),revenue:Math.round(revenue),cost:Math.round(cost),profit:Math.round(revenue-cost)};
}

function applyEffects(s:GS):GS{
  return{...s,pendingEffects:s.pendingEffects.map(e=>({...e,duration:e.duration>0?e.duration-1:e.duration})).filter(e=>e.duration!==0)};
}

// ─── 픽셀 캐릭터 컴포넌트 ──────────────────
function PixelChar({emoji,size=48,bounce=false,flip=false}:{emoji:string;size?:number;bounce?:boolean;flip?:boolean}){
  return(
    <span style={{fontSize:size,display:"inline-block",animation:bounce?"bounce 0.6s infinite alternate":"none",transform:flip?"scaleX(-1)":"none",filter:"drop-shadow(2px 2px 0px rgba(0,0,0,0.2))"}}>{emoji}</span>
  );
}

// ─── 대화 박스 ──────────────────────────────
function DialogBox({lines,speakerEmoji,speakerName,onNext,isLast}:{lines:string[];speakerEmoji?:string;speakerName?:string;onNext:()=>void;isLast:boolean}){
  const [displayed,setDisplayed]=useState("");
  const [lineIdx,setLineIdx]=useState(0);
  const [charIdx,setCharIdx]=useState(0);
  const [done,setDone]=useState(false);
  const full=lines[lineIdx]||"";

  useEffect(()=>{
    setDisplayed("");setCharIdx(0);setDone(false);
  },[lineIdx,lines]);

  useEffect(()=>{
    if(charIdx>=full.length){setDone(true);return;}
    const t=setTimeout(()=>{setDisplayed(p=>p+full[charIdx]);setCharIdx(p=>p+1);},28);
    return()=>clearTimeout(t);
  },[charIdx,full]);

  const handleClick=()=>{
    if(!done){setDisplayed(full);setCharIdx(full.length);setDone(true);return;}
    if(lineIdx<lines.length-1){setLineIdx(p=>p+1);}
    else{onNext();}
  };

  return(
    <div onClick={handleClick} style={{cursor:"pointer",background:"#1a1a2e",border:"3px solid #e2e8f0",borderRadius:12,padding:16,color:"#f1f5f9",fontFamily:"monospace",fontSize:14,lineHeight:1.8,userSelect:"none",boxShadow:"4px 4px 0 #000"}}>
      {speakerEmoji&&<div style={{marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:28}}>{speakerEmoji}</span>
        {speakerName&&<span style={{fontSize:12,color:"#94a3b8",fontFamily:"monospace"}}>[{speakerName}]</span>}
      </div>}
      <div style={{whiteSpace:"pre-wrap",minHeight:44}}>{displayed}<span style={{opacity:done?1:0,animation:"blink 1s infinite"}}>▋</span></div>
      <div style={{textAlign:"right",marginTop:8,fontSize:11,color:"#64748b"}}>{done?(isLast&&lineIdx===lines.length-1?"[확인]":"[다음 ▶]"):"..."}</div>
    </div>
  );
}

// ─── 하늘/날씨 배경 ──────────────────────────
function SkyBg({weather,isWeekend}:{weather:Weather;isWeekend:boolean}){
  const colors:{[k in Weather]:string}={
    sunny:"linear-gradient(180deg,#87CEEB 0%,#E0F4FF 100%)",
    cloudy:"linear-gradient(180deg,#B0BEC5 0%,#D5DBE0 100%)",
    rainy:"linear-gradient(180deg,#546E7A 0%,#78909C 100%)",
    hot:"linear-gradient(180deg,#FF7043 0%,#FFB74D 100%)",
    snow:"linear-gradient(180deg,#B3D9FF 0%,#E8F4FD 100%)",
  };
  return(
    <div style={{background:colors[weather],borderRadius:"16px 16px 0 0",padding:"12px 16px 8px",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:8,right:12,fontSize:32}}>{WEATHER[weather].icon}</div>
      {isWeekend&&<div style={{position:"absolute",top:8,left:"50%",transform:"translateX(-50%)",fontSize:11,background:"rgba(255,255,255,0.8)",padding:"2px 10px",borderRadius:100,color:"#7c3aed",fontWeight:700}}>🎉 주말 +40%</div>}
      <div style={{display:"flex",gap:4}}>
        {weather==="rainy"&&["💧","💧","💧"].map((d,i)=><span key={i} style={{fontSize:14,opacity:0.7}}>{d}</span>)}
        {weather==="snow"&&["❄️","❄️","❄️"].map((d,i)=><span key={i} style={{fontSize:14}}>{d}</span>)}
        {weather==="hot"&&<span style={{fontSize:14}}>🌡️ 체감 매우 더움</span>}
        {weather==="sunny"&&<span style={{fontSize:14}}>🌤️ 최고의 날씨!</span>}
      </div>
    </div>
  );
}

// ─── 매장 씬 ────────────────────────────────
function StoreScene({industry,customers,phase}:{industry:Industry;customers:number;phase:string}){
  const cfg=INDUSTRY[industry];
  const customerEmojis=["🧑","👩","👨","🧒","👴","👩‍💼","🧑‍💼","👦","🧔","👩‍🦰"].slice(0,Math.min(customers,8));
  return(
    <div style={{background:cfg.bgColor,border:`2px solid ${cfg.accentColor}`,borderRadius:"0 0 16px 16px",padding:"12px 16px",display:"flex",alignItems:"flex-end",gap:8,minHeight:80,position:"relative"}}>
      {/* 가게 간판 */}
      <div style={{position:"absolute",top:-1,left:"50%",transform:"translateX(-50%)",background:cfg.accentColor,color:"#fff",fontSize:11,fontWeight:700,padding:"2px 12px",borderRadius:"0 0 8px 8px",whiteSpace:"nowrap"}}>
        {cfg.icon} {cfg.label}
      </div>
      {/* 사장님 캐릭터 */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
        <PixelChar emoji="🧑‍💼" size={36} bounce={phase==="morning"} />
        <span style={{fontSize:9,color:cfg.accentColor,fontWeight:700}}>사장님</span>
      </div>
      {/* 직원들 */}
      {customers>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:4,flex:1,justifyContent:"center"}}>
          {customerEmojis.map((e,i)=>(
            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
              <PixelChar emoji={e} size={24} bounce={i%3===0} />
            </div>
          ))}
          {customers>8&&<span style={{fontSize:11,color:"#64748b",alignSelf:"center"}}>+{customers-8}명</span>}
        </div>
      )}
      {customers===0&&phase!=="morning"&&(
        <div style={{flex:1,textAlign:"center",fontSize:13,color:"#94a3b8"}}>😶 손님이 없어요...</div>
      )}
    </div>
  );
}

// ─── 스탯 바 ────────────────────────────────
function StatBar({label,value,max,color,icon}:{label:string;value:number;max:number;color:string;icon:string}){
  const pct=Math.min(Math.max(value/max*100,0),100);
  return(
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <span style={{fontSize:14}}>{icon}</span>
      <span style={{fontSize:11,color:"#64748b",minWidth:36}}>{label}</span>
      <div style={{flex:1,height:10,background:"#e2e8f0",borderRadius:5,overflow:"hidden",border:"1px solid #cbd5e1"}}>
        <div style={{height:"100%",width:`${pct}%`,background:color,transition:"width 0.5s",borderRadius:5}}/>
      </div>
      <span style={{fontSize:11,fontWeight:600,minWidth:28,textAlign:"right"}}>{Math.round(value)}</span>
    </div>
  );
}

// ─── 메인 ────────────────────────────────────
export default function GamePage(){
  const [phase,setPhase]=useState<Phase>("select");
  const [selectedInd,setSelectedInd]=useState<Industry>("cafe");
  const [storeName,setStoreName]=useState("");
  const [capital,setCapital]=useState(20000000);
  const [gs,setGs]=useState<GS|null>(null);
  const [currentEvent,setCurrentEvent]=useState<GameEvent|null>(null);
  const [introStep,setIntroStep]=useState(0);
  const [notification,setNotification]=useState<{msg:string;type:"good"|"bad"|"info"}|null>(null);
  const notifTimer=useRef<ReturnType<typeof setTimeout>|null>(null);

  const showNotif=(msg:string,type:"good"|"bad"|"info")=>{
    setNotification({msg,type});
    if(notifTimer.current)clearTimeout(notifTimer.current);
    notifTimer.current=setTimeout(()=>setNotification(null),2500);
  };

  const startGame=useCallback(()=>{
    const cfg=INDUSTRY[selectedInd];
    const name=storeName.trim()||`${cfg.icon} 내 ${cfg.label}`;
    const init:GS={
      day:1,maxDays:90,cash:capital,reputation:60,
      phase:"morning",industry:selectedInd,storeName:name,
      baseCustomers:cfg.baseCustomers,avgSpend:cfg.avgSpend,cogsRate:cfg.cogsRate,
      rent:cfg.rent,utilities:cfg.utilities,
      staff:cfg.staff.map(s=>({...s})),
      pendingEffects:[],totalRevenue:0,totalProfit:0,logs:[],
      weather:getWeather(1),
      todayCustomers:0,todayRevenue:0,todayCost:0,todayProfit:0,
      flags:{},currentEvent:null,
      dialogue:[],dialogueIdx:0,showDialogue:false,
    };
    setGs(init);
    setIntroStep(0);
    setPhase("intro");
  },[selectedInd,storeName,capital]);

  const advanceDay=useCallback(()=>{
    if(!gs)return;
    // 45% 이벤트 발생
    const ev=Math.random()<0.45?EVENTS[Math.floor(Math.random()*EVENTS.length)]:null;
    if(ev){
      setCurrentEvent(ev);
      setPhase("event");
    } else {
      const res=calcDay(gs);
      setGs(s=>{
        if(!s)return s;
        const newLog:DayLog={day:s.day,weather:s.weather,customers:res.customers,revenue:res.revenue,profit:res.profit};
        return applyEffects({...s,cash:s.cash+res.profit,totalRevenue:s.totalRevenue+res.revenue,totalProfit:s.totalProfit+res.profit,todayCustomers:res.customers,todayRevenue:res.revenue,todayCost:res.cost,todayProfit:res.profit,logs:[...s.logs,newLog]});
      });
      setPhase("result");
    }
  },[gs]);

  const handleChoice=useCallback((idx:number)=>{
    if(!gs||!currentEvent)return;
    const choice=currentEvent.choices[idx];
    if(choice.cost&&gs.cash<choice.cost){showNotif(`💸 현금 부족! ${fmt(choice.cost)}원 필요해요`,  "bad");return;}
    const result=choice.apply(gs);
    const newEffects=result.effects??[];
    const base={...gs,...result,cash:gs.cash-(choice.cost??0),pendingEffects:[...gs.pendingEffects,...newEffects],currentEvent:null};
    const res=calcDay(base);
    const newLog:DayLog={day:gs.day,weather:gs.weather,customers:res.customers,revenue:res.revenue,profit:res.profit,event:currentEvent.title};
    const next=applyEffects({...base,cash:base.cash+res.profit,totalRevenue:base.totalRevenue+res.revenue,totalProfit:base.totalProfit+res.profit,todayCustomers:res.customers,todayRevenue:res.revenue,todayCost:res.cost,todayProfit:res.profit,logs:[...gs.logs,newLog]});
    setGs(next);
    setCurrentEvent(null);
    setPhase("result");
    showNotif(res.profit>=0?`✓ 오늘 +${fmt(res.profit)}원 흑자!`:`✗ 오늘 -${fmt(Math.abs(res.profit))}원 적자...`,res.profit>=0?"good":"bad");
  },[gs,currentEvent]);

  const nextDay=useCallback(()=>{
    if(!gs)return;
    if(gs.cash<-5000000){setPhase("gameover");return;}
    if(gs.day>=gs.maxDays){setPhase("gameover");return;}
    const newDay=gs.day+1;
    setGs(s=>{
      if(!s)return s;
      return{...s,day:newDay,phase:"morning",weather:getWeather(newDay),currentEvent:null,
        staff:s.staff.map(st=>({...st,mood:Math.min(Math.max(st.mood+(Math.random()>0.7?3:-1),0),100),absent:Math.random()<0.03}))};
    });
    setPhase("morning");
  },[gs]);

  const cfg=gs?INDUSTRY[gs.industry]:INDUSTRY[selectedInd];
  const isWeekend=gs?((gs.day-1)%7)>=5:false;

  // ── 업종 선택 화면 ─────────────────────────
  if(phase==="select") return(
    <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"monospace"}}>
      <style>{`@keyframes bounce{0%{transform:translateY(0)}100%{transform:translateY(-8px)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}@keyframes slideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes notif{0%{transform:translateY(-20px);opacity:0}20%{transform:translateY(0);opacity:1}80%{transform:translateY(0);opacity:1}100%{transform:translateY(-20px);opacity:0}}`}</style>
      <div style={{width:"100%",maxWidth:480,animation:"slideIn 0.4s ease"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:56,marginBottom:8}}>🏪</div>
          <h1 style={{color:"#f1f5f9",fontSize:24,fontWeight:700,letterSpacing:2,textShadow:"0 0 20px rgba(99,102,241,0.5)"}}>나만의 가게</h1>
          <p style={{color:"#64748b",fontSize:13,marginTop:4}}>90일간 매장을 운영해 최고의 사장님이 되세요!</p>
        </div>

        <div style={{background:"#1e293b",border:"2px solid #334155",borderRadius:16,padding:20,marginBottom:12}}>
          <p style={{color:"#94a3b8",fontSize:12,marginBottom:12,fontWeight:600}}>▶ 업종 선택</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {(Object.keys(INDUSTRY) as Industry[]).map(ind=>{
              const c=INDUSTRY[ind];const sel=selectedInd===ind;
              return(<button key={ind} onClick={()=>setSelectedInd(ind)} style={{padding:"12px 8px",borderRadius:10,border:sel?"2px solid #6366f1":"1px solid #334155",background:sel?"#312e81":"#0f172a",cursor:"pointer",textAlign:"center",transition:"all 0.2s"}}>
                <div style={{fontSize:28,marginBottom:4}}>{c.icon}</div>
                <div style={{fontSize:13,fontWeight:600,color:sel?"#c7d2fe":"#e2e8f0"}}>{c.label}</div>
                <div style={{fontSize:10,color:"#64748b",marginTop:2}}>객단가 {fmt(c.avgSpend)}원</div>
              </button>);
            })}
          </div>
        </div>

        <div style={{background:"#1e293b",border:"2px solid #334155",borderRadius:16,padding:20,marginBottom:12}}>
          <p style={{color:"#94a3b8",fontSize:12,marginBottom:8,fontWeight:600}}>▶ 가게 이름</p>
          <input value={storeName} onChange={e=>setStoreName(e.target.value)} placeholder={`예: ${INDUSTRY[selectedInd].icon} 행복한 ${INDUSTRY[selectedInd].label}`}
            style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid #334155",background:"#0f172a",color:"#f1f5f9",fontSize:13,fontFamily:"monospace",outline:"none",boxSizing:"border-box"}}/>
        </div>

        <div style={{background:"#1e293b",border:"2px solid #334155",borderRadius:16,padding:20,marginBottom:16}}>
          <p style={{color:"#94a3b8",fontSize:12,marginBottom:8,fontWeight:600}}>▶ 초기 자본금</p>
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            {[10000000,20000000,50000000,100000000].map(v=>(
              <button key={v} onClick={()=>setCapital(v)} style={{flex:1,padding:"6px 0",borderRadius:8,border:capital===v?"2px solid #6366f1":"1px solid #334155",background:capital===v?"#312e81":"#0f172a",color:capital===v?"#c7d2fe":"#94a3b8",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"monospace"}}>
                {v>=100000000?"1억":`${v/10000000}천만`}
              </button>
            ))}
          </div>
          <input type="number" value={capital} onChange={e=>setCapital(Math.max(1000000,Number(e.target.value)))} step={1000000} min={1000000}
            style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"1px solid #334155",background:"#0f172a",color:"#f1f5f9",fontSize:13,fontFamily:"monospace",outline:"none",boxSizing:"border-box"}}/>
          <p style={{fontSize:11,color:"#6366f1",marginTop:6}}>💰 {capital.toLocaleString("ko-KR")}원으로 시작</p>
        </div>

        <button onClick={startGame} style={{width:"100%",padding:16,borderRadius:12,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"monospace",letterSpacing:1,boxShadow:"0 4px 15px rgba(99,102,241,0.4)",animation:"pulse 2s infinite"}}>
          {INDUSTRY[selectedInd].icon} 가게 오픈하기! START ▶
        </button>
      </div>
    </div>
  );

  // ── 인트로 ─────────────────────────────────
  const introDialogues=[
    {lines:[`안녕하세요, 새로운 사장님!`,`오늘부터 당신만의 ${cfg.label}을 운영하게 됩니다.`,`초기 자본금은 ${fmt(capital)}원이에요.`],emoji:"🧑‍💼",name:"나레이터"},
    {lines:[`매일 아침 날씨와 이벤트가 달라져요.`,`날씨가 좋으면 손님이 많아지고,\n비가 오면 손님이 줄어들어요.`],emoji:"🌤️",name:"날씨 요정"},
    {lines:[`직원들 사기를 잘 관리하세요!`,`직원이 행복해야 손님도 더 많이 와요.`,`가끔 갑자기 결근할 수도 있으니 주의하세요!`],emoji:"👩‍🍳",name:cfg.staff[0]?.name},
    {lines:[`90일 뒤 최종 결산이 있어요.`,`현금이 -500만원 아래로 떨어지면\n바로 파산이에요!`,`자, 이제 시작해볼까요? 화이팅!!! 💪`],emoji:"🏪",name:"튜토리얼"},
  ];
  const curIntro=introDialogues[introStep];

  if(phase==="intro") return(
    <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"monospace"}}>
      <style>{`@keyframes bounce{0%{transform:translateY(0)}100%{transform:translateY(-8px)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
      <div style={{width:"100%",maxWidth:440}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <PixelChar emoji={curIntro.emoji} size={72} bounce />
          <p style={{color:"#94a3b8",fontSize:12,marginTop:8}}>{curIntro.name}</p>
        </div>
        <DialogBox lines={curIntro.lines} speakerEmoji={curIntro.emoji} speakerName={curIntro.name}
          onNext={()=>introStep<introDialogues.length-1?setIntroStep(p=>p+1):setPhase("morning")}
          isLast={introStep===introDialogues.length-1} />
        <div style={{display:"flex",justifyContent:"center",gap:6,marginTop:16}}>
          {introDialogues.map((_,i)=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:i===introStep?"#6366f1":"#334155"}}/>)}
        </div>
      </div>
    </div>
  );

  if(!gs)return null;

  // ── 공통 헤더 ──────────────────────────────
  const Header=()=>(
    <div style={{background:"#1e293b",border:"2px solid #334155",borderRadius:"12px 12px 0 0",padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <p style={{fontSize:11,color:"#64748b",fontFamily:"monospace"}}>{gs.storeName}</p>
        <p style={{fontSize:16,fontWeight:700,color:"#f1f5f9",fontFamily:"monospace"}}>Day {gs.day} / {gs.maxDays}</p>
      </div>
      <div style={{display:"flex",gap:12,alignItems:"center"}}>
        <div style={{textAlign:"right"}}>
          <p style={{fontSize:10,color:"#64748b"}}>보유 현금</p>
          <p style={{fontSize:14,fontWeight:700,color:gs.cash>=0?"#4ade80":"#f87171",fontFamily:"monospace"}}>{fmt(gs.cash)}원</p>
        </div>
        <div style={{textAlign:"right"}}>
          <p style={{fontSize:10,color:"#64748b"}}>누적 이익</p>
          <p style={{fontSize:14,fontWeight:700,color:gs.totalProfit>=0?"#4ade80":"#f87171",fontFamily:"monospace"}}>{fmt(gs.totalProfit)}원</p>
        </div>
      </div>
    </div>
  );

  const StatsPanel=()=>(
    <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:12,display:"flex",flexDirection:"column",gap:6}}>
      <StatBar label="평판" value={gs.reputation} max={100} color="#6366f1" icon="⭐"/>
      <StatBar label="현금" value={Math.max(gs.cash,0)} max={capital*3} color="#4ade80" icon="💰"/>
      {gs.pendingEffects.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:4}}>
          {gs.pendingEffects.slice(0,3).map((e,i)=>(
            <span key={i} style={{fontSize:9,padding:"2px 6px",borderRadius:100,background:e.value>0?"#14532d":"#7f1d1d",color:e.value>0?"#4ade80":"#f87171",fontFamily:"monospace"}}>
              {e.label} {e.duration>0?`(${e.duration}일)`:""}</span>
          ))}
        </div>
      )}
    </div>
  );

  // ── 아침 화면 ──────────────────────────────
  if(phase==="morning")return(
    <div style={{minHeight:"100vh",background:"#0f172a",padding:16,fontFamily:"monospace"}}>
      <style>{`@keyframes bounce{0%{transform:translateY(0)}100%{transform:translateY(-8px)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}@keyframes notif{0%{transform:translateY(-20px);opacity:0}20%{transform:translateY(0);opacity:1}80%{transform:translateY(0);opacity:1}100%{transform:translateY(-20px);opacity:0}}`}</style>
      {notification&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:notification.type==="good"?"#14532d":notification.type==="bad"?"#7f1d1d":"#1e3a5f",border:`1px solid ${notification.type==="good"?"#4ade80":notification.type==="bad"?"#f87171":"#60a5fa"}`,borderRadius:100,padding:"8px 20px",color:notification.type==="good"?"#4ade80":notification.type==="bad"?"#f87171":"#60a5fa",fontSize:13,fontWeight:700,zIndex:100,animation:"notif 2.5s ease forwards",whiteSpace:"nowrap"}}>{notification.msg}</div>}
      <div style={{maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column",gap:8}}>
        <Header/>
        <SkyBg weather={gs.weather} isWeekend={isWeekend}/>
        <StoreScene industry={gs.industry} customers={0} phase="morning"/>

        <div style={{background:"#1e293b",border:"2px solid #334155",borderRadius:12,padding:16,display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <PixelChar emoji="🧑‍💼" size={40} bounce/>
              <div>
                <p style={{color:"#94a3b8",fontSize:11}}>오늘 날씨</p>
                <p style={{color:"#f1f5f9",fontSize:14,fontWeight:600}}>{WEATHER[gs.weather].icon} {WEATHER[gs.weather].label} <span style={{color:"#64748b",fontSize:11"}}>(손님 {Math.round((WEATHER[gs.weather].mod-1)*100)>0?"+":""}{ Math.round((WEATHER[gs.weather].mod-1)*100)}%)</span></p>
              </div>
            </div>
            {isWeekend&&<span style={{background:"#312e81",color:"#c7d2fe",fontSize:11,padding:"4px 10px",borderRadius:100,fontWeight:700}}>🎉 주말</span>}
          </div>

          {gs.day%30===0&&<div style={{background:"#7f1d1d",border:"1px solid #f87171",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#fca5a5"}}>
            ⚠️ 오늘 월세 납부일! 월세 {fmt(gs.rent)}원 + 공과금 {fmt(gs.utilities)}원 차감 예정
          </div>}

          {gs.staff.some(s=>s.absent)&&<div style={{background:"#713f12",border:"1px solid #fbbf24",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#fde68a"}}>
            😷 {gs.staff.filter(s=>s.absent).map(s=>s.name).join(", ")} 결근!
          </div>}

          <StatsPanel/>

          <div style={{display:"flex",gap:8}}>
            {gs.staff.map(s=>(
              <div key={s.id} style={{flex:1,background:"#0f172a",border:`1px solid ${s.absent?"#7f1d1d":"#334155"}`,borderRadius:8,padding:"6px 8px",textAlign:"center"}}>
                <div style={{fontSize:20,opacity:s.absent?0.4:1}}>{s.emoji}</div>
                <p style={{fontSize:10,color:s.absent?"#f87171":"#94a3b8"}}>{s.name}</p>
                <p style={{fontSize:9,color:"#64748b"}}>{s.absent?"결근":"출근✓"}</p>
                <div style={{height:4,background:"#1e293b",borderRadius:2,marginTop:4,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${s.mood}%`,background:s.mood>=70?"#4ade80":s.mood>=40?"#fbbf24":"#f87171"}}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={advanceDay} style={{padding:16,borderRadius:12,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"monospace",letterSpacing:1}}>
          🚪 영업 시작! →
        </button>
      </div>
    </div>
  );

  // ── 이벤트 화면 ──────────────────────────────
  if(phase==="event"&&currentEvent)return(
    <div style={{minHeight:"100vh",background:"#0f172a",padding:16,fontFamily:"monospace"}}>
      <style>{`@keyframes bounce{0%{transform:translateY(0)}100%{transform:translateY(-8px)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}@keyframes notif{0%{transform:translateY(-20px);opacity:0}20%{transform:translateY(0);opacity:1}80%{transform:translateY(0);opacity:1}100%{transform:translateY(-20px);opacity:0}}`}</style>
      {notification&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:notification.type==="good"?"#14532d":"#7f1d1d",border:`1px solid ${notification.type==="good"?"#4ade80":"#f87171"}`,borderRadius:100,padding:"8px 20px",color:notification.type==="good"?"#4ade80":"#f87171",fontSize:13,fontWeight:700,zIndex:100,animation:"notif 2.5s ease forwards"}}>{notification.msg}</div>}
      <div style={{maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column",gap:10}}>
        <Header/>

        {/* 이벤트 씬 */}
        <div style={{background:currentEvent.type==="crisis"?"#450a0a":currentEvent.type==="opportunity"?"#052e16":"#172554",border:`2px solid ${currentEvent.type==="crisis"?"#dc2626":currentEvent.type==="opportunity"?"#16a34a":"#2563eb"}`,borderRadius:16,padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <span style={{fontSize:40,animation:currentEvent.type==="crisis"?"shake 0.5s infinite":""}}>{currentEvent.icon}</span>
              <div>
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:100,background:currentEvent.type==="crisis"?"#dc2626":currentEvent.type==="opportunity"?"#16a34a":"#2563eb",color:"#fff",fontWeight:700}}>
                  {currentEvent.type==="crisis"?"⚠️ 위기":currentEvent.type==="opportunity"?"✨ 기회":"🎲 이벤트"}
                </span>
                <h2 style={{color:"#f1f5f9",fontSize:18,fontWeight:700,marginTop:6}}>{currentEvent.title}</h2>
              </div>
            </div>
            {currentEvent.npc&&<PixelChar emoji={currentEvent.npc} size={52} bounce/>}
          </div>

          <DialogBox lines={currentEvent.desc.split("\n")} speakerEmoji={currentEvent.npc} speakerName={currentEvent.npcName}
            onNext={()=>{}}  isLast={true}/>
        </div>

        <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:14}}>
          <p style={{color:"#94a3b8",fontSize:12,marginBottom:10,fontWeight:600}}>▶ 어떻게 하시겠어요?</p>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {currentEvent.choices.map((c,i)=>(
              <button key={i} onClick={()=>handleChoice(i)} style={{padding:"12px 14px",borderRadius:10,border:"1px solid #334155",background:"#0f172a",cursor:"pointer",textAlign:"left",fontFamily:"monospace",transition:"all 0.15s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <p style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{"ABCDE"[i]}. {c.label}</p>
                  {c.cost&&<span style={{fontSize:10,color:"#f87171",background:"#7f1d1d",padding:"1px 6px",borderRadius:4,whiteSpace:"nowrap",marginLeft:8}}>-{fmt(c.cost)}원</span>}
                </div>
                <p style={{fontSize:11,color:"#64748b",marginTop:3}}>{c.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ── 결과 화면 ──────────────────────────────
  if(phase==="result")return(
    <div style={{minHeight:"100vh",background:"#0f172a",padding:16,fontFamily:"monospace"}}>
      <style>{`@keyframes bounce{0%{transform:translateY(0)}100%{transform:translateY(-8px)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
      <div style={{maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column",gap:8}}>
        <Header/>
        <SkyBg weather={gs.weather} isWeekend={isWeekend}/>
        <StoreScene industry={gs.industry} customers={gs.todayCustomers} phase="result"/>

        <div style={{background:"#1e293b",border:`2px solid ${gs.todayProfit>=0?"#4ade80":"#f87171"}`,borderRadius:12,padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div>
              <p style={{color:"#94a3b8",fontSize:11}}>{gs.day}일차 영업 마감</p>
              <p style={{fontSize:24,fontWeight:700,color:gs.todayProfit>=0?"#4ade80":"#f87171"}}>
                {gs.todayProfit>=0?"+"  :""}{fmt(gs.todayProfit)}원
              </p>
            </div>
            <PixelChar emoji={gs.todayProfit>=gs.avgSpend*gs.baseCustomers*0.1?"🎉":gs.todayProfit>=0?"😊":"😰"} size={52} bounce={gs.todayProfit>0}/>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {[
              {label:"방문 고객",value:`${gs.todayCustomers}명`,icon:"👥"},
              {label:"오늘 매출",value:`${fmt(gs.todayRevenue)}원`,icon:"💵"},
              {label:"오늘 비용",value:`${fmt(gs.todayCost)}원`,icon:"📤"},
              {label:"남은 현금",value:`${fmt(gs.cash)}원`,icon:"💰",bad:gs.cash<0},
            ].map(({label,value,icon,bad})=>(
              <div key={label} style={{background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"8px 10px"}}>
                <p style={{fontSize:10,color:"#64748b"}}>{icon} {label}</p>
                <p style={{fontSize:14,fontWeight:700,color:bad?"#f87171":"#e2e8f0"}}>{value}</p>
              </div>
            ))}
          </div>

          {/* 최근 5일 미니 그래프 */}
          {gs.logs.length>1&&(
            <div style={{background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:10}}>
              <p style={{fontSize:10,color:"#64748b",marginBottom:6}}>📊 최근 {Math.min(gs.logs.length,7)}일 손익</p>
              <div style={{display:"flex",gap:3,alignItems:"flex-end",height:40}}>
                {gs.logs.slice(-7).map((l,i)=>{
                  const maxAbs=Math.max(...gs.logs.slice(-7).map(x=>Math.abs(x.profit)),1);
                  const h=Math.max(Math.abs(l.profit)/maxAbs*36,2);
                  return(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",gap:2}}>
                    <div style={{width:"100%",height:h,background:l.profit>=0?"#4ade80":"#f87171",borderRadius:"2px 2px 0 0"}}/>
                    <span style={{fontSize:8,color:"#64748b"}}>{l.day}</span>
                  </div>);
                })}
              </div>
            </div>
          )}
        </div>

        <StatsPanel/>

        <button onClick={nextDay} style={{padding:16,borderRadius:12,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"monospace",letterSpacing:1}}>
          {gs.day>=gs.maxDays?"🏁 최종 결산!":"다음 날로 → (Day "+(gs.day+1)+")"}
        </button>
      </div>
    </div>
  );

  // ── 게임오버 화면 ──────────────────────────
  if(phase==="gameover"&&gs){
    const bankrupt=gs.cash<-5000000;
    const grade=gs.totalProfit>=150000000?"S":gs.totalProfit>=80000000?"A":gs.totalProfit>=30000000?"B":gs.totalProfit>=0?"C":"D";
    const gradeColor:{[k:string]:string}={S:"#fbbf24",A:"#4ade80",B:"#60a5fa",C:"#94a3b8",D:"#f87171"};
    const gradeMsg:{[k:string]:string}={S:"전설의 사장님!!! 🏆",A:"대단한 경영자! 👏",B:"선방했어요! 💪",C:"아슬아슬 생존! 😅",D:"경영이 쉽지 않죠... 😢"};
    return(
      <div style={{minHeight:"100vh",background:"#0f172a",padding:16,fontFamily:"monospace",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <style>{`@keyframes bounce{0%{transform:translateY(0)}100%{transform:translateY(-8px)}}@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}`}</style>
        <div style={{width:"100%",maxWidth:480,display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:"#1e293b",border:`3px solid ${gradeColor[grade]}`,borderRadius:20,padding:28,textAlign:"center"}}>
            <div style={{fontSize:72,marginBottom:8,animation:"bounce 0.6s infinite alternate"}}>{bankrupt?"💸":grade==="S"?"🏆":grade==="A"?"🥇":"💪"}</div>
            <div style={{fontSize:56,fontWeight:700,color:gradeColor[grade],textShadow:`0 0 20px ${gradeColor[grade]}`,marginBottom:8}}>{grade}</div>
            <h2 style={{color:"#f1f5f9",fontSize:20,fontWeight:700,marginBottom:12}}>{bankrupt?"파산! 💀":gradeMsg[grade]}</h2>
            <p style={{color:"#94a3b8",fontSize:13,lineHeight:1.8}}>
              {gs.storeName}<br/>
              {gs.day}일 운영 완료<br/>
              누적 순이익: <span style={{color:gs.totalProfit>=0?"#4ade80":"#f87171",fontWeight:700}}>{fmt(gs.totalProfit)}원</span><br/>
              최종 현금: <span style={{fontWeight:700}}>{fmt(gs.cash)}원</span>
            </p>
          </div>

          <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:14,padding:14}}>
            <p style={{color:"#94a3b8",fontSize:11,marginBottom:8,fontWeight:600}}>📋 최근 기록</p>
            {gs.logs.slice(-8).reverse().map(l=>(
              <div key={l.day} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderTop:"1px solid #1e293b",fontSize:11}}>
                <span style={{color:"#64748b"}}>{l.day}일 {WEATHER[l.weather].icon}</span>
                <span style={{color:"#64748b",flex:1,marginLeft:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.event??""}</span>
                <span style={{color:l.profit>=0?"#4ade80":"#f87171",fontWeight:600,marginLeft:8}}>{l.profit>=0?"+":""}{fmt(l.profit)}</span>
              </div>
            ))}
          </div>

          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{setPhase("select");setGs(null);setStoreName("");}} style={{flex:1,padding:14,borderRadius:12,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"monospace"}}>
              🔄 다시 도전!
            </button>
            <Link href="/simulator" style={{flex:1,padding:14,borderRadius:12,border:"1px solid #334155",color:"#94a3b8",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"monospace",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center"}}>
              📊 실제 시뮬레이터
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
