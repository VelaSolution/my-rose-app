"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import NavBarComponent from "@/components/NavBar";



type Industry = "cafe" | "restaurant" | "bar" | "finedining" | "gogi";
type Weather  = "sunny" | "rainy" | "cloudy" | "hot" | "snow";
type Phase    = "menu" | "setup" | "playing" | "gameover";
type Day      = "morning" | "event" | "result";

interface Staff   { id:string; name:string; role:string; emoji:string; wage:number; mood:number; skill:number; absent:boolean }
interface Eff     { type:string; value:number; duration:number; label:string }
interface Log     { day:number; wx:Weather; customers:number; revenue:number; profit:number; event?:string }
interface Float   { id:number; text:string; x:number; color:string }
interface Ev {
  id:string; title:string; desc:string; icon:string; char:string; charName:string;
  type:"crisis"|"opportunity"|"random";
  choices:{ label:string; desc:string; cost?:number; apply:(s:S)=>Partial<S>&{efx?:Eff[]} }[];
}
type GameMode = "free" | "target" | "survive" | "growth";
interface S {
  day:number; maxDays:number; cash:number; rep:number; phase:Day;
  ind:Industry; name:string; base:number; spend:number; cogs:number; rent:number; util:number;
  staff:Staff[]; ev:Ev|null; efx:Eff[];
  totalRev:number; totalProfit:number; logs:Log[];
  wx:Weather; cust:number; rev:number; cost:number; todayProfit:number;
  flags:Record<string, boolean|number>; exp:number; streak:number; best:number;
  savedAt?:string;
  mode:GameMode; monthlyProfit:number; negStreak:number;
  targetRevenue?:number; targetProfit?:number; growthTarget?:number; firstMonthRev?:number;
}

// Colors
const B="#3182F6", BL="#EBF3FF";
const G50="#F9FAFB", G100="#F2F4F6", G200="#E5E8EB", G400="#9EA6B3", G600="#6B7684", G800="#333D4B", G900="#191F28";
const GN="#10b981", GNL="#ECFDF5";
const RD="#EF4444", RDL="#FEF2F2";

const IND: Record<Industry, {
  label:string; icon:string; color:string; desc:string;
  base:number; spend:number; cogs:number; rent:number; util:number;
  emojis:string[]; staff:Staff[];
}> = {
  cafe: {
    label:"카페", icon:"☕", color:B, desc:"회전율 높고 안정적인 매출",
    base:80, spend:7000, cogs:28, rent:1500000, util:400000,
    emojis:["👩‍💻","👨‍🎓","👩","👨","🧕","🧔"],
    staff:[
      {id:"s1",name:"김바리",role:"바리스타",emoji:"👩‍🍳",wage:80000,mood:75,skill:70,absent:false},
      {id:"s2",name:"이루미",role:"서버",emoji:"🧑‍🦰",wage:65000,mood:80,skill:60,absent:false},
    ],
  },
  restaurant: {
    label:"음식점", icon:"🍽️", color:"#EF4444", desc:"점심·저녁 피크타임 운영",
    base:60, spend:22000, cogs:33, rent:3000000, util:800000,
    emojis:["👨‍👩‍👧","👫","👨","👩","🧑","👴"],
    staff:[
      {id:"s1",name:"박셰프",role:"주방장",emoji:"👨‍🍳",wage:150000,mood:70,skill:85,absent:false},
      {id:"s2",name:"최서버",role:"홀서버",emoji:"🧑‍🦱",wage:70000,mood:75,skill:65,absent:false},
      {id:"s3",name:"강알바",role:"알바",emoji:"🧒",wage:55000,mood:65,skill:40,absent:false},
    ],
  },
  bar: {
    label:"술집/바", icon:"🍺", color:"#F59E0B", desc:"주말·야간 특수, 높은 마진",
    base:45, spend:35000, cogs:22, rent:2500000, util:600000,
    emojis:["🧔","👱","🧑‍🦲","👩‍🦱","🧑‍🤝‍🧑","🥳"],
    staff:[
      {id:"s1",name:"윤텐더",role:"바텐더",emoji:"🧑‍🍳",wage:100000,mood:80,skill:80,absent:false},
      {id:"s2",name:"정서버",role:"서버",emoji:"👩‍🦰",wage:70000,mood:70,skill:60,absent:false},
    ],
  },
  finedining: {
    label:"파인다이닝", icon:"✨", color:"#6366F1", desc:"고객 수 적지만 최고 단가",
    base:20, spend:90000, cogs:34, rent:5000000, util:1200000,
    emojis:["🤵","👗","🧣","💼","👔","💍"],
    staff:[
      {id:"s1",name:"오헤드",role:"헤드셰프",emoji:"👨‍🍳",wage:250000,mood:75,skill:95,absent:false},
      {id:"s2",name:"류소믈",role:"소믈리에",emoji:"🥂",wage:120000,mood:80,skill:85,absent:false},
    ],
  },
  gogi: {
    label:"고깃집", icon:"🥩", color:"#DC2626", desc:"테이블 단가 높고 주류 매출 큼",
    base:50, spend:45000, cogs:38, rent:3500000, util:900000,
    emojis:["👨‍👩‍👧‍👦","👫","👴","👵","🧑‍🤝‍🧑","👨‍👦"],
    staff:[
      {id:"s1",name:"김그릴",role:"주방장",emoji:"👨‍🍳",wage:160000,mood:72,skill:80,absent:false},
      {id:"s2",name:"박서버",role:"홀서버",emoji:"🧑‍🦱",wage:75000,mood:70,skill:65,absent:false},
    ],
  },
};

const WX: Record<Weather, {icon:string; label:string; mod:number}> = {
  sunny:{icon:"☀️",label:"맑음",mod:1.1},
  cloudy:{icon:"🌥️",label:"흐림",mod:1.0},
  rainy:{icon:"🌧️",label:"비",mod:0.75},
  hot:{icon:"🥵",label:"폭염",mod:0.85},
  snow:{icon:"❄️",label:"눈",mod:0.65},
};

const EVENTS: Ev[] = [
  // ── 기회 이벤트 ──────────────────────────────────────────
  {id:"influencer",type:"opportunity",icon:"📱",char:"🤳",charName:"인플루언서",
   title:"인플루언서 방문!",desc:"팔로워 10만 맛집 계정이 방문했어요! 포스팅을 부탁해볼까요?",
   choices:[
     {label:"서비스+포스팅 요청",desc:"비용 10만원, 손님 +30% 14일",cost:100000,apply:s=>({rep:Math.min(s.rep+15,100),efx:[{type:"customers",value:0.3,duration:14,label:"인플루언서 효과"}]})},
     {label:"일반 손님처럼 대응",desc:"자연스러운 리뷰 기대",apply:s=>({rep:Math.min(s.rep+8,100),efx:[{type:"customers",value:0.15,duration:7,label:"자연 홍보"}]})},
   ]},
  {id:"group",type:"opportunity",icon:"👥",char:"🤵",charName:"예약 담당자",
   title:"단체 예약 요청!",desc:"회사 회식으로 30명 예약 문의가 왔어요!",
   choices:[
     {label:"전석 수락",desc:"오늘 손님 +50%",apply:(_s:S)=>({efx:[{type:"customers",value:0.5,duration:1,label:"단체 예약"}]})},
     {label:"절반 수락",desc:"오늘 손님 +25%",apply:(_s:S)=>({efx:[{type:"customers",value:0.25,duration:1,label:"단체 부분"}]})},
     {label:"거절",desc:"변화 없음",apply:(_s:S)=>({})},
   ]},
  {id:"tv",type:"opportunity",icon:"📺",char:"🎬",charName:"TV 작가",
   title:"TV 맛집 섭외!",desc:"지역 TV 맛집 프로그램에서 출연 제의가 왔어요!",
   choices:[
     {label:"출연 수락!",desc:"평판 +20, 손님 +50% 한달",apply:s=>({rep:Math.min(s.rep+20,100),efx:[{type:"customers",value:0.5,duration:30,label:"TV 방영 효과"}]})},
     {label:"거절",desc:"변화 없음",apply:(_s:S)=>({})},
   ]},
  {id:"festival",type:"opportunity",icon:"🎪",char:"🎉",charName:"축제 안내원",
   title:"근처 지역 축제!",desc:"매장 근처에서 축제가 열려요. 유동인구 폭발!",
   choices:[
     {label:"야외 테이블 설치",desc:"비용 20만원, 손님 +50% 3일",cost:200000,apply:(_s:S)=>({efx:[{type:"customers",value:0.5,duration:3,label:"축제 특수"}]})},
     {label:"가격 소폭 인상",desc:"객단가 +10%, 손님 +20%",apply:s=>({spend:Math.round(s.spend*1.1),efx:[{type:"customers",value:0.2,duration:3,label:"축제 유동인구"}]})},
   ]},
  {id:"vip",type:"opportunity",icon:"👑",char:"🤵",charName:"VIP 고객",
   title:"단골 VIP 등장!",desc:"매달 100만원 이상 쓰는 VIP 고객이 나타났어요.",
   choices:[
     {label:"VIP 카드 발급",desc:"평판 +8, 안정 매출",apply:s=>({rep:Math.min(s.rep+8,100),efx:[{type:"customers",value:0.05,duration:90,label:"VIP 단골"}]})},
     {label:"특별 서비스 제공",desc:"평판 +5",apply:s=>({rep:Math.min(s.rep+5,100)})},
   ]},
  {id:"delivery_boom",type:"opportunity",icon:"🛵",char:"📦",charName:"배달 플랫폼",
   title:"배달 주문 폭발!",desc:"주변 경쟁업체가 문을 닫아 배달 주문이 몰려들고 있어요!",
   choices:[
     {label:"배달 인력 추가",desc:"비용 5만원, 손님 +40% 7일",cost:50000,apply:(_s:S)=>({efx:[{type:"customers",value:0.4,duration:7,label:"배달 특수"}]})},
     {label:"현재 인력으로",desc:"손님 +20% 7일",apply:(_s:S)=>({efx:[{type:"customers",value:0.2,duration:7,label:"배달 증가"}]})},
   ]},
  {id:"sns_viral",type:"opportunity",icon:"🔥",char:"😲",charName:"SNS 유저",
   title:"SNS 바이럴!",desc:"메뉴 사진이 SNS에서 엄청난 반응을 얻고 있어요!",
   choices:[
     {label:"메뉴 집중 홍보",desc:"비용 5만원, 손님 +35% 10일",cost:50000,apply:s=>({rep:Math.min(s.rep+10,100),efx:[{type:"customers",value:0.35,duration:10,label:"SNS 바이럴"}]})},
     {label:"자연스럽게 두기",desc:"손님 +20% 7일",apply:(_s:S)=>({efx:[{type:"customers",value:0.2,duration:7,label:"SNS 효과"}]})},
   ]},
  {id:"celeb_visit",type:"opportunity",icon:"⭐",char:"🕶️",charName:"연예인",
   title:"연예인이 왔다!",desc:"팔로워 100만 연예인이 방문해 스토리에 올렸어요!",
   choices:[
     {label:"사진 촬영 협조",desc:"평판 +25, 손님 +60% 3주",apply:s=>({rep:Math.min(s.rep+25,100),efx:[{type:"customers",value:0.6,duration:21,label:"연예인 방문 효과"}]})},
     {label:"조용히 대접",desc:"평판 +15, 손님 +30% 2주",apply:s=>({rep:Math.min(s.rep+15,100),efx:[{type:"customers",value:0.3,duration:14,label:"입소문"}]})},
   ]},
  {id:"supplier_discount",type:"opportunity",icon:"📦",char:"🚚",charName:"공급업체",
   title:"재료 대량 할인 제안!",desc:"공급업체에서 선결제 시 10% 할인을 제안합니다.",
   choices:[
     {label:"선결제 계약",desc:"비용 200만원, 원가율 -3%p 3달",cost:2000000,apply:s=>({cogs:Math.max(s.cogs-3,10)})},
     {label:"거절",desc:"변화 없음",apply:(_s:S)=>({})},
   ]},
  {id:"menu_hit",type:"opportunity",icon:"🍜",char:"😋",charName:"손님",
   title:"신메뉴 대박!",desc:"최근 출시한 메뉴가 입소문을 타고 있어요!",
   choices:[
     {label:"메뉴 적극 홍보",desc:"비용 3만원, 손님 +25% 2주",cost:30000,apply:(_s:S)=>({efx:[{type:"customers",value:0.25,duration:14,label:"신메뉴 인기"}]})},
     {label:"자연스럽게 두기",desc:"손님 +15% 1주",apply:(_s:S)=>({efx:[{type:"customers",value:0.15,duration:7,label:"메뉴 입소문"}]})},
   ]},
  {id:"holiday_special",type:"opportunity",icon:"🎊",char:"🎁",charName:"연휴 손님",
   title:"연휴 특수!",desc:"명절 연휴가 시작됩니다. 외식 수요가 폭발할 예정이에요!",
   choices:[
     {label:"특별 메뉴 준비",desc:"비용 10만원, 손님 +50% 5일",cost:100000,apply:(_s:S)=>({efx:[{type:"customers",value:0.5,duration:5,label:"연휴 특수"}]})},
     {label:"평소처럼 운영",desc:"손님 +30% 5일",apply:(_s:S)=>({efx:[{type:"customers",value:0.3,duration:5,label:"연휴 자연 증가"}]})},
   ]},
  // ── 위기 이벤트 ──────────────────────────────────────────
  {id:"food_poison",type:"crisis",icon:"🤢",char:"😱",charName:"단골손님",
   title:"식중독 신고!",desc:"단골손님이 식중독 증세를 호소하며 SNS에 올렸습니다.",
   choices:[
     {label:"즉각 사과+보상",desc:"비용 50만원, 평판 -10",cost:500000,apply:s=>({rep:Math.max(s.rep-10,0),efx:[{type:"customers",value:-0.1,duration:3,label:"식중독 여파"}]})},
     {label:"조용히 합의",desc:"비용 150만원, 평판 유지",cost:1500000,apply:(_s:S)=>({})},
     {label:"사실 부인",desc:"평판 -35 폭락",apply:s=>({rep:Math.max(s.rep-35,0),efx:[{type:"customers",value:-0.35,duration:10,label:"신뢰 추락"}]})},
   ]},
  {id:"health",type:"crisis",icon:"🧹",char:"👮",charName:"보건소 직원",
   title:"위생 점검 나왔다!",desc:"보건소 직원이 갑자기 위생 점검을 나왔어요!",
   choices:[
     {label:"당당하게 통과",desc:"청결하면 OK, 아니면 벌금",apply:s=>s.flags.clean?{rep:Math.min(s.rep+5,100)}:{cash:s.cash-300000,rep:Math.max(s.rep-15,0)}},
     {label:"사전 청소 (반나절)",desc:"통과 100%, 매출 -40%",apply:(_s:S)=>({flags:{clean:true},efx:[{type:"customers",value:-0.4,duration:1,label:"청소 반나절"}]})},
   ]},
  {id:"blackout",type:"crisis",icon:"🔌",char:"😰",charName:"사장님",
   title:"정전 발생!",desc:"갑작스런 정전으로 모든 기기가 멈췄어요!",
   choices:[
     {label:"발전기 대여 (30만원)",desc:"정상 영업",cost:300000,apply:(_s:S)=>({})},
     {label:"임시 휴업",desc:"매출 0원",apply:(_s:S)=>({efx:[{type:"customers",value:-1.0,duration:1,label:"임시 휴업"}]})},
   ]},
  {id:"review",type:"crisis",icon:"⭐",char:"😤",charName:"악성 리뷰어",
   title:"악성 리뷰 등록!",desc:"1점짜리 악성 리뷰가 달렸어요!",
   choices:[
     {label:"정중한 답변",desc:"평판 -5",apply:s=>({rep:Math.max(s.rep-5,0)})},
     {label:"사과+보상",desc:"비용 10만원, 평판 +3",cost:100000,apply:s=>({rep:Math.min(s.rep+3,100)})},
     {label:"무시",desc:"평판 -15, 손님 감소",apply:s=>({rep:Math.max(s.rep-15,0),efx:[{type:"customers",value:-0.1,duration:5,label:"악성 리뷰 여파"}]})},
   ]},
  {id:"rent",type:"crisis",icon:"🏠",char:"😤",charName:"건물주",
   title:"임대료 인상 통보!",desc:"건물주에게서 임대료 20% 인상 통보가 왔어요!",
   choices:[
     {label:"협상 시도",desc:"50% 확률로 10%만 인상",apply:s=>({rent:s.rent*(Math.random()>0.5?1.1:1.2)})},
     {label:"그냥 수용",desc:"임대료 +20%",apply:s=>({rent:s.rent*1.2})},
     {label:"이전 준비",desc:"비용 200만원, 이후 임대료 -15%",cost:2000000,apply:s=>({rent:s.rent*0.85})},
   ]},
  {id:"staff_quit",type:"crisis",icon:"😢",char:"😭",charName:"직원",
   title:"직원이 그만두겠대요!",desc:"핵심 직원이 갑자기 그만두겠다고 합니다.",
   choices:[
     {label:"연봉 인상으로 붙잡기",desc:"일당 +20%, 직원 유지",apply:s=>({staff:s.staff.map((st,i)=>i===0?{...st,wage:Math.round(st.wage*1.2),mood:90}:st)})},
     {label:"새로 채용",desc:"2일간 서비스 저하",apply:(_s:S)=>({efx:[{type:"customers",value:-0.15,duration:2,label:"인수인계"}]})},
     {label:"사정해서 달램",desc:"성공 50%",apply:s=>Math.random()>0.5?{staff:s.staff.map((st,i)=>i===0?{...st,mood:85}:st)}:{efx:[{type:"customers",value:-0.15,duration:3,label:"직원 공백"}]}},
   ]},
  {id:"ingredient_up",type:"crisis",icon:"📈",char:"😱",charName:"공급업체",
   title:"재료값 폭등!",desc:"기상이변으로 식재료 가격이 급등했습니다.",
   choices:[
     {label:"다른 공급처 수배",desc:"비용 20만원, 원가율 +2%p",cost:200000,apply:s=>({cogs:Math.min(s.cogs+2,70)})},
     {label:"현재 유지",desc:"원가율 +6%p",apply:s=>({cogs:Math.min(s.cogs+6,70)})},
     {label:"메뉴 가격 인상",desc:"객단가 +8%, 손님 -10%",apply:s=>({spend:Math.round(s.spend*1.08),efx:[{type:"customers",value:-0.1,duration:7,label:"가격인상 여파"}]})},
   ]},
  {id:"competitor",type:"crisis",icon:"🏪",char:"😠",charName:"경쟁자",
   title:"경쟁업체 오픈!",desc:"바로 옆에 비슷한 콘셉트 가게가 생겼어요!",
   choices:[
     {label:"차별화 메뉴 개발",desc:"원가율 +2%p, 손님 +5%",apply:s=>({cogs:Math.min(s.cogs+2,70),efx:[{type:"customers",value:0.05,duration:30,label:"차별화 효과"}]})},
     {label:"가격 인하 경쟁",desc:"객단가 -8%",apply:s=>({spend:Math.round(s.spend*0.92)})},
     {label:"서비스 강화",desc:"손님 -5% 2주 후 회복",apply:(_s:S)=>({efx:[{type:"customers",value:-0.05,duration:14,label:"경쟁 초기"}]})},
   ]},
  {id:"fire_alarm",type:"crisis",icon:"🚒",char:"👨‍🚒",charName:"소방관",
   title:"화재 경보 오작동!",desc:"주방 화재 경보기가 오작동해 손님들이 대피했어요.",
   choices:[
     {label:"즉시 상황 설명+보상",desc:"비용 5만원, 평판 유지",cost:50000,apply:s=>({rep:Math.max(s.rep-5,0),efx:[{type:"customers",value:-0.3,duration:1,label:"화재 경보 여파"}]})},
     {label:"그냥 재개",desc:"평판 -10",apply:s=>({rep:Math.max(s.rep-10,0),efx:[{type:"customers",value:-0.5,duration:1,label:"화재 소동"}]})},
   ]},
  {id:"water_leak",type:"crisis",icon:"💧",char:"🔧",charName:"배관공",
   title:"수도관 누수!",desc:"천장에서 물이 새기 시작했어요!",
   choices:[
     {label:"즉시 수리 (40만원)",desc:"정상 영업 유지",cost:400000,apply:(_s:S)=>({})},
     {label:"임시 조치 후 영업",desc:"손님 -20%",apply:(_s:S)=>({efx:[{type:"customers",value:-0.2,duration:1,label:"누수 임시조치"}]})},
   ]},
  {id:"pos_broken",type:"crisis",icon:"💳",char:"😰",charName:"사장님",
   title:"POS 시스템 고장!",desc:"결제 단말기가 갑자기 먹통이에요!",
   choices:[
     {label:"즉시 수리 (15만원)",desc:"정상 영업",cost:150000,apply:(_s:S)=>({})},
     {label:"현금만 받기",desc:"손님 -30%",apply:(_s:S)=>({efx:[{type:"customers",value:-0.3,duration:1,label:"현금 영업"}]})},
   ]},
  {id:"bad_weather_streak",type:"crisis",icon:"⛈️",char:"🌩️",charName:"기상청",
   title:"악천후 일주일!",desc:"태풍 예보로 이번 주 내내 비바람이 몰아칩니다.",
   choices:[
     {label:"배달 프로모션 강화",desc:"비용 5만원, 피해 최소화",cost:50000,apply:(_s:S)=>({efx:[{type:"customers",value:-0.2,duration:7,label:"악천후"}]})},
     {label:"그냥 버팀",desc:"손님 -35% 7일",apply:(_s:S)=>({efx:[{type:"customers",value:-0.35,duration:7,label:"악천후 직격"}]})},
   ]},
  {id:"staff_conflict",type:"crisis",icon:"😤",char:"😡",charName:"직원들",
   title:"직원 간 갈등 발생!",desc:"홀 직원과 주방 직원 사이에 심한 말다툼이 있었어요.",
   choices:[
     {label:"면담으로 중재",desc:"직원 사기 +15",apply:s=>({staff:s.staff.map(st=>({...st,mood:Math.min(st.mood+15,100)}))})},
     {label:"문제 직원 경고",desc:"직원 사기 -10",apply:s=>({staff:s.staff.map(st=>({...st,mood:Math.max(st.mood-10,0)}))})},
     {label:"모른 척",desc:"손님 -10% 5일",apply:(_s:S)=>({efx:[{type:"customers",value:-0.1,duration:5,label:"직원 갈등"}]})},
   ]},
  {id:"delivery_fee_up",type:"crisis",icon:"🛵",char:"📱",charName:"배달앱",
   title:"배달앱 수수료 인상!",desc:"배달앱에서 수수료를 3%p 올리겠다고 통보했어요.",
   choices:[
     {label:"수수료 수용",desc:"원가율 +2%p",apply:s=>({cogs:Math.min(s.cogs+2,70)})},
     {label:"배달 중단",desc:"손님 -10% 지속",apply:(_s:S)=>({efx:[{type:"customers",value:-0.1,duration:30,label:"배달 중단"}]})},
     {label:"자체 배달 시작",desc:"비용 50만원, 손님 +5%",cost:500000,apply:(_s:S)=>({efx:[{type:"customers",value:0.05,duration:90,label:"자체 배달"}]})},
   ]},
  // ── 랜덤 이벤트 ──────────────────────────────────────────
  {id:"staff_birthday",type:"random",icon:"🎂",char:"🥳",charName:"직원",
   title:"직원 생일!",desc:"오늘은 직원 생일이에요. 작은 파티를 열어줄까요?",
   choices:[
     {label:"파티 열어주기",desc:"비용 3만원, 사기 +30",cost:30000,apply:s=>({staff:s.staff.map(st=>({...st,mood:Math.min(st.mood+30,100)}))})},
     {label:"그냥 넘어가기",desc:"사기 -5",apply:s=>({staff:s.staff.map(st=>({...st,mood:Math.max(st.mood-5,0)}))})},
   ]},
  {id:"ingredient_windfall",type:"random",icon:"🎁",char:"🚚",charName:"공급업체",
   title:"식재료 특가!",desc:"공급업체에서 반짝 할인 행사를 진행합니다.",
   choices:[
     {label:"대량 구매",desc:"비용 50만원, 원가율 -2%p 한달",cost:500000,apply:s=>({cogs:Math.max(s.cogs-2,10)})},
     {label:"패스",desc:"변화 없음",apply:(_s:S)=>({})},
   ]},
  {id:"health_inspection_good",type:"random",icon:"🏅",char:"👮",charName:"보건소",
   title:"위생 우수업소 선정!",desc:"보건소에서 위생 우수업소로 선정했다는 통보가 왔어요!",
   choices:[
     {label:"현판 달고 홍보",desc:"평판 +15, 손님 +10% 한달",apply:s=>({rep:Math.min(s.rep+15,100),efx:[{type:"customers",value:0.1,duration:30,label:"위생 우수업소"}]})},
   ]},
  {id:"night_market",type:"random",icon:"🌙",char:"🏮",charName:"구청",
   title:"야시장 개최!",desc:"근처에 야시장이 열려요. 저녁 유동인구가 늘어납니다.",
   choices:[
     {label:"야간 영업 연장",desc:"비용 3만원, 손님 +30%",cost:30000,apply:(_s:S)=>({efx:[{type:"customers",value:0.3,duration:5,label:"야시장 특수"}]})},
     {label:"평소처럼 운영",desc:"자연 증가만",apply:(_s:S)=>({efx:[{type:"customers",value:0.15,duration:5,label:"야시장 유동인구"}]})},
   ]},
];


// Utils
const fmt = (n: number) => {
  const a = Math.abs(n);
  const v = a>=100000000?((a/100000000).toFixed(1)+"억") : a>=10000?(Math.round(a/10000)+"만") : Math.round(a).toLocaleString("ko-KR");
  return (n<0?"-":"") + v + "원";
};
const fmtN = (n: number) => Math.round(n).toLocaleString("ko-KR");
const getLv = (exp: number) => Math.floor(exp/200)+1;

function getWx(day: number): Weather {
  const r = Math.random();
  const s = Math.floor(((day-1)%90)/22);
  if (s===1) { if(r<0.3) return "hot"; if(r<0.55) return "rainy"; return "sunny"; }
  if (s===3) { if(r<0.25) return "snow"; if(r<0.5) return "cloudy"; return "rainy"; }
  if(r<0.4) return "sunny"; if(r<0.65) return "cloudy"; return "rainy";
}

function calcDay(s: S) {
  const wm = WX[s.wx].mod;
  const rm = 0.6+(s.rep/100)*0.8;
  const sk = s.staff.filter(x=>!x.absent).reduce((a,x)=>a+x.skill,0)/Math.max(s.staff.filter(x=>!x.absent).length,1);
  const stm = 0.65+(sk/100)*0.7;
  const wk = ((s.day-1)%7)>=5 ? 1.4 : 1.0;
  let cm=wm*rm*stm*wk, spm=1.0, cgm=0;
  for (const e of s.efx) {
    if(e.type==="customers") cm*=(1+e.value);
    if(e.type==="avgSpend") spm*=(1+e.value);
    if(e.type==="cogsRate") cgm+=e.value;
  }
  const cust = Math.max(0, Math.round(s.base*cm*(0.8+Math.random()*0.4)));
  const spend = s.spend*spm*(0.9+Math.random()*0.2);
  const rev = cust*spend;
  const cogs = rev*(Math.min(s.cogs+cgm,95)/100);
  const labor = s.staff.filter(x=>!x.absent).reduce((a,x)=>a+x.wage,0);
  const fixed = s.day%30===0 ? (s.rent+s.util) : 0;
  const cost = cogs+rev*0.015+labor+fixed;
  return {cust:Math.round(cust), rev:Math.round(rev), cost:Math.round(cost), profit:Math.round(rev-cost)};
}

const SAVE_KEY = "vela-game-v3";
function saveGame(state: S) {
  if (typeof window==="undefined") return;
  localStorage.setItem(SAVE_KEY, JSON.stringify({...state, savedAt:new Date().toISOString()}));
}
function loadGame(): S|null {
  if (typeof window==="undefined") return null;
  try { const d=localStorage.getItem(SAVE_KEY); return d?JSON.parse(d):null; } catch { return null; }
}
function delSave() {
  if (typeof window==="undefined") return;
  localStorage.removeItem(SAVE_KEY);
}

function calcScore(s: S) {
  return Math.max(0,Math.floor(s.totalProfit/10000))
    + Math.floor(s.rep*5)
    + s.streak*100
    + (getLv(s.exp)-1)*200
    + (s.day>=90?5000:Math.floor(s.day*30));
}
function gradeOf(sc: number) {
  if(sc>=50000) return {g:"S",c:"#F59E0B",e:"🏆"};
  if(sc>=25000) return {g:"A",c:GN,e:"🥇"};
  if(sc>=10000) return {g:"B",c:B,e:"🥈"};
  if(sc>=3000)  return {g:"C",c:"#8B5CF6",e:"🥉"};
  return {g:"D",c:RD,e:"💸"};
}

// ── NavBar ──────────────────────────────────────────────────
// ── NavBar: 공통 컴포넌트 사용 (랜딩페이지와 동일)
const NavBar = () => <NavBarComponent />;

// ── 메인 메뉴 ───────────────────────────────────────────────
function Menu({onNew,onLoad,saved}:{onNew:()=>void;onLoad:()=>void;saved:S|null}) {
  return (
    <div style={{minHeight:"100vh",background:G50,fontFamily:"'Pretendard','Apple SD Gothic Neo',system-ui,sans-serif"}}>
      <NavBar />
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

// ── 셋업 ────────────────────────────────────────────────────
function Setup({onStart}:{onStart:(s:S)=>void}) {
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
      const current = localStorage.getItem("vela-form-v3");
      if (current) {
        const f = JSON.parse(current);
        if (f.industry) all.push({ id:"current", name:"최근 시뮬레이션 (임시저장)", industry:f.industry||"restaurant", avgSpend:Number(f.avgSpend||0), cogsRate:Number(f.cogsRate||0), savedAt:"현재", source:"sim" });
      }

      // 2. localStorage 저장 목록 (vela-saves-v1)
      const localSaves = JSON.parse(localStorage.getItem("vela-saves-v1") || "[]");
      localSaves.forEach((s: {id:string; name?:string; form?:{industry?:string; avgSpend?:number; cogsRate?:number}; savedAt?:string}) => {
        all.push({ id:"local-"+s.id, name:s.name||"저장된 시뮬레이션", industry:s.form?.industry||"restaurant", avgSpend:Number(s.form?.avgSpend||0), cogsRate:Number(s.form?.cogsRate||0), savedAt:s.savedAt||"", source:"sim" });
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
    <div style={{minHeight:"100vh",background:G50,fontFamily:"'Pretendard','Apple SD Gothic Neo',system-ui,sans-serif"}}><NavBar />
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
    <div style={{minHeight:"100vh",background:G50,fontFamily:"'Pretendard','Apple SD Gothic Neo',system-ui,sans-serif"}}><NavBar />
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
    <div style={{minHeight:"100vh",background:G50,fontFamily:"'Pretendard','Apple SD Gothic Neo',system-ui,sans-serif"}}><NavBar />
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
          <button onClick={()=>setStep(0)} style={{flex:1,padding:"14px",borderRadius:14,border:"1px solid "+G200,background:"#fff",color:G800,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>← 이전</button>
          <button onClick={()=>setStep(2)} style={{flex:2,padding:"14px",borderRadius:14,border:"none",background:cfg.color,color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>다음 →</button>
        </div>
      </div>
    </div>
  );

  if (step!==3) return null;
  return (
    <div style={{minHeight:"100vh",background:G50,fontFamily:"'Pretendard','Apple SD Gothic Neo',system-ui,sans-serif"}}><NavBar />
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

// ── 게임 플레이 ─────────────────────────────────────────────
function Play({s, setS, onOver}:{s:S; setS:React.Dispatch<React.SetStateAction<S|null>>; onOver:()=>void}) {
  const [floats, setFloats] = useState<Float[]>([]);
  const fid = useRef(0);
  const cfg = IND[s.ind];
  const isWk = ((s.day-1)%7)>=5;

  const addFloat = (text:string, color:string) => {
    const id = ++fid.current;
    setFloats(p=>[...p,{id,text,x:15+Math.random()*60,color}]);
    setTimeout(()=>setFloats(p=>p.filter(f=>f.id!==id)),1600);
  };

  const openDay = useCallback(() => {
    const ev = Math.random()<0.40 ? EVENTS[Math.floor(Math.random()*EVENTS.length)] : null;
    if (ev) { setS(p=>p?{...p,ev,phase:"event"}:p); return; }
    const r = calcDay(s);
    const ne = s.efx.map(e=>({...e,duration:e.duration>0?e.duration-1:e.duration})).filter(e=>e.duration!==0);
    const ns: S = {...s, cash:s.cash+r.profit, totalRev:s.totalRev+r.rev, totalProfit:s.totalProfit+r.profit,
      cust:r.cust, rev:r.rev, cost:r.cost, todayProfit:r.profit,
      logs:[...s.logs,{day:s.day,wx:s.wx,customers:r.cust,revenue:r.rev,profit:r.profit}],
      phase:"result", efx:ne, exp:s.exp+(r.profit>500000?30:r.profit>0?15:5),
      streak:r.profit>0?s.streak+1:0, best:Math.max(s.best,r.profit)};
    setS(ns); saveGame(ns);
    addFloat(r.profit>=0?("+"+fmt(r.profit)+" 💰"):(fmt(r.profit)+" 😢"), r.profit>=0?GN:RD);
  }, [s]);

  const choose = useCallback((idx:number) => {
    if (!s.ev) return;
    const ch = s.ev.choices[idx];
    if (ch.cost && s.cash<ch.cost) { alert("현금 부족! (필요: "+fmtN(ch.cost)+"원)"); return; }
    const res = ch.apply(s);
    const newEfx = res.efx ?? [];
    const tmp: S = {...s, ...res, cash:s.cash-(ch.cost||0), efx:[...s.efx,...newEfx], ev:null};
    const r = calcDay(tmp);
    const ne = tmp.efx.map(e=>({...e,duration:e.duration>0?e.duration-1:e.duration})).filter(e=>e.duration!==0);
    const ns: S = {...tmp, cash:tmp.cash+r.profit, totalRev:tmp.totalRev+r.rev, totalProfit:tmp.totalProfit+r.profit,
      cust:r.cust, rev:r.rev, cost:r.cost, todayProfit:r.profit,
      logs:[...s.logs,{day:s.day,wx:s.wx,customers:r.cust,revenue:r.rev,profit:r.profit,event:s.ev.title}],
      phase:"result", efx:ne, exp:tmp.exp+(r.profit>500000?30:r.profit>0?15:5),
      streak:r.profit>0?tmp.streak+1:0, best:Math.max(tmp.best,r.profit),
      negStreak:r.profit<0?tmp.negStreak+1:0,
      monthlyProfit:tmp.monthlyProfit+r.profit};
    setS(ns); saveGame(ns);
    addFloat(r.profit>=0?("+"+fmt(r.profit)+" 💰"):(fmt(r.profit)+" 😢"), r.profit>=0?GN:RD);
  }, [s]);

  const nextDay = useCallback(() => {
    if (s.day >= s.maxDays) { onOver(); return; }

    // 모드별 패배 조건
    if (s.mode === "survive") {
      // 생존 모드: 3일 연속 적자면 게임오버
      if (s.negStreak >= 3) { onOver(); return; }
    } else {
      // 기타 모드: 현금흐름이 -500만 이하면 위기
      if (s.cash < -5000000) { onOver(); return; }
    }

    // 목표 달성 모드: 달성 시 즉시 승리
    if (s.mode === "target") {
      const monthDone = s.day % 30 === 0;
      if (monthDone) {
        const monthRev = s.logs.slice(-30).reduce((a, l) => a + l.revenue, 0);
        const monthPro = s.logs.slice(-30).reduce((a, l) => a + l.profit, 0);
        const revOk = s.targetRevenue ? monthRev >= s.targetRevenue : true;
        const proOk = s.targetProfit  ? monthPro >= s.targetProfit  : true;
        if (revOk && proOk) { onOver(); return; }
      }
    }

    // 성장 모드: 첫 달 이후 배수 달성 시 승리
    if (s.mode === "growth" && s.day >= 30 && s.firstMonthRev) {
      const recentMonthRev = s.logs.slice(-30).reduce((a, l) => a + l.revenue, 0);
      if (recentMonthRev >= s.firstMonthRev * (s.growthTarget || 2)) { onOver(); return; }
    }

    const nd = s.day + 1;
    // 30일마다 firstMonthRev 기록
    const newFirstMonth = (s.mode === "growth" && s.day === 30 && !s.firstMonthRev)
      ? s.logs.slice(-30).reduce((a, l) => a + l.revenue, 0)
      : s.firstMonthRev;

    setS(p => p ? {
      ...p, day:nd, phase:"morning", wx:getWx(nd), ev:null,
      firstMonthRev: newFirstMonth,
      staff: p.staff.map(st => ({...st, mood:Math.min(Math.max(st.mood+(Math.random()>0.7?3:-1),0),100), absent:Math.random()<0.025}))
    } : p);
  }, [s, onOver]);

  const ec = s.ev?.type==="crisis"
    ? {bg:RDL,bd:"#FECACA",tx:RD,lb:"#FEE2E2",lbl:"⚠️ 위기!"}
    : s.ev?.type==="opportunity"
    ? {bg:GNL,bd:"#A7F3D0",tx:GN,lb:"#D1FAE5",lbl:"✨ 기회!"}
    : {bg:G50,bd:G200,tx:G800,lb:G100,lbl:"📢 이벤트"};

  const busy = Math.min(s.cust/(s.base*1.5),1);
  const showCust = s.phase==="result" ? Math.round(busy*5) : 0;

  return (
    <div style={{minHeight:"100vh",background:G50,fontFamily:"'Pretendard','Apple SD Gothic Neo',system-ui,sans-serif"}}>
      <style>{`
        @keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes fup{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-70px)}}
        @keyframes pin{0%{opacity:0;transform:scale(0.93)}100%{opacity:1;transform:scale(1)}}
        @keyframes rain{0%{opacity:0;transform:translateY(-10px)}80%{opacity:.5}100%{transform:translateY(185px);opacity:0}}
        @keyframes snow{0%{opacity:0;transform:translateY(-10px)rotate(0)}100%{opacity:0;transform:translateY(185px)rotate(360deg)}}
      `}</style>
      <NavBar />
      <div style={{maxWidth:500,margin:"0 auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>

        {/* HUD */}
        <div style={{background:"#fff",border:"1px solid "+cfg.color+"44",borderRadius:20,padding:"14px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{background:cfg.color,borderRadius:8,padding:"4px 10px",fontSize:13,fontWeight:800,color:"#fff"}}>LV.{getLv(s.exp)}</div>
              <div>
                <p style={{fontSize:17,fontWeight:800,color:G900,margin:0}}>{s.day}일차 {isWk?"🎉":""}</p>
                <p style={{fontSize:13,color:G400,margin:0}}>{WX[s.wx].icon} {WX[s.wx].label} · {s.maxDays-s.day}일 남음
                  {s.mode==="survive" && s.negStreak>0 && <span style={{color:RD,fontWeight:700,marginLeft:8}}>⚠️ 적자 {s.negStreak}일 연속!</span>}
                  {s.mode==="target" && <span style={{color:"#00B386",fontWeight:600,marginLeft:8}}>📈 목표달성모드</span>}
                  {s.mode==="growth" && <span style={{color:"#8B5CF6",fontWeight:600,marginLeft:8}}>🚀 성장모드</span>}
                </p>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <p style={{fontSize:12,color:G400,margin:0}}>잔고</p>
              <p style={{fontSize:17,fontWeight:800,color:s.cash>=0?G900:RD,margin:0}}>{fmtN(s.cash)}원</p>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:10}}>
            {[{l:"💰 누적",v:fmt(s.totalProfit),c:s.totalProfit>=0?GN:RD},{l:"⭐ 평판",v:s.rep+"점",c:"#F59E0B"},{l:"🔥 연속",v:s.streak+"일",c:s.streak>=3?B:G600}].map(item=>(
              <div key={item.l} style={{background:G50,borderRadius:10,padding:"9px 10px"}}>
                <p style={{fontSize:12,color:G400,margin:"0 0 2px"}}>{item.l}</p>
                <p style={{fontSize:15,fontWeight:700,color:item.c,margin:0}}>{item.v}</p>
              </div>
            ))}
          </div>
          <div style={{background:G100,borderRadius:4,height:5,overflow:"hidden",marginBottom:8}}>
            <div style={{height:"100%",width:((s.day/s.maxDays)*100)+"%",background:cfg.color,borderRadius:4,transition:"width 0.5s"}} />
          </div>
          {s.efx.length>0 && (
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {s.efx.slice(0,4).map((e,i)=>(
                <span key={i} style={{fontSize:11,padding:"2px 8px",borderRadius:100,background:e.value>0?GNL:RDL,color:e.value>0?GN:RD}}>
                  {e.value>0?"▲":"▼"} {e.label} {e.duration>0?e.duration+"일":"∞"}
                </span>
              ))}
            </div>
          )}
          <div style={{display:"flex",gap:6,marginTop:8,justifyContent:"flex-end"}}>
            <button onClick={()=>{saveGame(s);alert("저장됐어요 💾");}} style={{fontSize:13,color:G400,background:"none",border:"1px solid "+G200,borderRadius:8,padding:"4px 10px",cursor:"pointer",fontFamily:"inherit"}}>💾 저장</button>
            <button onClick={()=>{if(confirm("종료할까요?"))onOver();}} style={{fontSize:13,color:G400,background:"none",border:"1px solid "+G200,borderRadius:8,padding:"4px 10px",cursor:"pointer",fontFamily:"inherit"}}>🚪 나가기</button>
          </div>
        </div>

        {/* 매장 씬 */}
        <div style={{position:"relative",borderRadius:20,overflow:"hidden",height:185,background:s.wx==="sunny"?"#FFF9E6":s.wx==="rainy"?"#EFF6FF":s.wx==="snow"?"#F0F9FF":s.wx==="hot"?"#FFF7ED":"#F8FAFC",border:"1px solid "+cfg.color+"33"}}>
          {s.wx==="rainy"&&[0,1,2,3,4,5].map(i=><div key={i} style={{position:"absolute",top:0,left:(8+i*15)+"%",width:1.5,height:12,background:"#93C5FD",animation:"rain "+(0.7+i*0.08)+"s linear infinite",animationDelay:(i*0.12)+"s"}} />)}
          {s.wx==="snow"&&[0,1,2,3,4].map(i=><div key={i} style={{position:"absolute",top:0,left:(5+i*18)+"%",fontSize:12,animation:"snow "+(1.8+i*0.2)+"s linear infinite",animationDelay:(i*0.3)+"s"}}>❄️</div>)}
          {s.wx==="sunny"&&<div style={{position:"absolute",top:10,right:14,fontSize:26,opacity:0.6}}>☀️</div>}
          <div style={{position:"absolute",top:10,left:0,right:0,textAlign:"center"}}>
            <span style={{background:cfg.color,color:"#fff",borderRadius:20,padding:"4px 16px",fontSize:14,fontWeight:800}}>{s.name}</span>
          </div>
          <div style={{position:"absolute",bottom:40,left:14,display:"flex",gap:7,alignItems:"flex-end"}}>
            <div style={{fontSize:30}}>{cfg.icon}</div>
            {s.staff.filter(x=>!x.absent).map((st,i)=>(
              <div key={st.id} style={{textAlign:"center"}}>
                <div style={{fontSize:24,animation:"bob "+(1+i*0.3)+"s ease-in-out infinite",animationDelay:(i*0.2)+"s"}}>{st.emoji}</div>
                <div style={{fontSize:9,color:cfg.color,fontWeight:700,background:cfg.color+"20",borderRadius:4,padding:"1px 4px"}}>{st.name}</div>
              </div>
            ))}
          </div>
          <div style={{position:"absolute",bottom:40,right:14,display:"flex",gap:5,alignItems:"flex-end"}}>
            {[...Array(Math.min(showCust,5))].map((_,i)=>(
              <div key={i} style={{textAlign:"center",animation:"bob "+(1.2+i*0.2)+"s ease-in-out infinite",animationDelay:(i*0.15)+"s"}}>
                <div style={{fontSize:18}}>{cfg.emojis[i%cfg.emojis.length]}</div>
                <div style={{fontSize:12}}>🪑</div>
              </div>
            ))}
            {showCust>5&&<div style={{fontSize:12,color:cfg.color,fontWeight:700,alignSelf:"center"}}>+{showCust-5}</div>}
          </div>
          <div style={{position:"absolute",bottom:0,left:0,right:0,height:36,background:cfg.color+"18",borderTop:"1px solid "+cfg.color+"33",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 14px"}}>
            <span style={{fontSize:14,color:cfg.color,fontWeight:700}}>{WX[s.wx].icon} {WX[s.wx].label}</span>
            <span style={{fontSize:13,color:G600}}>손님 {s.cust}명</span>
            <span style={{fontSize:14,color:s.todayProfit>=0?GN:RD,fontWeight:700}}>{s.todayProfit>=0?"+":""}{fmt(s.todayProfit)}</span>
          </div>
          {floats.map(f=><div key={f.id} style={{position:"absolute",top:"22%",left:f.x+"%",fontSize:15,fontWeight:800,color:f.color,pointerEvents:"none",animation:"fup 1.6s ease-out forwards",whiteSpace:"nowrap",zIndex:10}}>{f.text}</div>)}
        </div>

        {/* 아침 */}
        {s.phase==="morning" && (
          <div style={{background:"#fff",border:"1px solid "+G200,borderRadius:20,padding:18,animation:"pin 0.3s ease-out"}}>
            <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:36,background:G50,borderRadius:50,width:54,height:54,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>🌅</div>
              <div>
                <p style={{fontSize:17,fontWeight:800,color:G900,margin:0}}>좋은 아침이에요!</p>
                <p style={{fontSize:14,color:G600,margin:"3px 0 0"}}>{WX[s.wx].icon} {WX[s.wx].label} — 손님 {WX[s.wx].mod>=1?"많을":"적을"} 것 같아요</p>
              </div>
            </div>
            {s.staff.some(x=>x.absent) && (
              <div style={{background:RDL,border:"1px solid #FECACA",borderRadius:12,padding:"9px 13px",marginBottom:10}}>
                <p style={{fontSize:14,color:RD,margin:0,fontWeight:600}}>😷 {s.staff.filter(x=>x.absent).map(x=>x.name).join(", ")} 결근!</p>
              </div>
            )}
            {s.day%30===0 && (
              <div style={{background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:12,padding:"9px 13px",marginBottom:10}}>
                <p style={{fontSize:14,color:"#92400E",margin:0,fontWeight:600}}>📅 월세 납부일! -{fmt(s.rent+s.util)}</p>
              </div>
            )}
            {s.streak>=3 && (
              <div style={{background:BL,border:"1px solid #BFDBFE",borderRadius:12,padding:"9px 13px",marginBottom:10}}>
                <p style={{fontSize:14,color:"#1B64DA",margin:0,fontWeight:600}}>🔥 {s.streak}일 연속 흑자 중!</p>
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"repeat("+Math.min(s.staff.length,3)+",1fr)",gap:7,marginBottom:14}}>
              {s.staff.map(st=>(
                <div key={st.id} style={{background:G50,borderRadius:14,padding:"9px 7px",textAlign:"center",opacity:st.absent?0.3:1,border:"1px solid "+G200}}>
                  <div style={{fontSize:28,marginBottom:4}}>{st.emoji}</div>
                  <p style={{fontSize:14,color:G900,margin:"0 0 1px",fontWeight:600}}>{st.name}</p>
                  <p style={{fontSize:12,color:G400,margin:"0 0 5px"}}>{st.role}</p>
                  <div style={{background:G200,borderRadius:3,height:4,overflow:"hidden"}}>
                    <div style={{height:"100%",width:st.mood+"%",background:st.mood>=70?GN:st.mood>=40?"#F59E0B":RD,borderRadius:3}} />
                  </div>
                </div>
              ))}
            </div>
            <button onClick={openDay} style={{width:"100%",padding:"15px",borderRadius:14,border:"none",background:cfg.color,color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              🚪 영업 시작! {isWk?"🎉 주말 특수!":""}
            </button>
          </div>
        )}

        {/* 이벤트 */}
        {s.phase==="event" && s.ev && (
          <div style={{background:ec.bg,border:"1px solid "+ec.bd,borderRadius:20,padding:18,animation:"pin 0.3s ease-out"}}>
            <div style={{display:"flex",gap:12,marginBottom:14,alignItems:"flex-start"}}>
              <div style={{flexShrink:0,textAlign:"center"}}>
                <div style={{fontSize:40,background:"#fff",borderRadius:50,width:62,height:62,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid "+ec.bd}}>{s.ev.char}</div>
                <p style={{fontSize:11,color:ec.tx,margin:"4px 0 0",fontWeight:700}}>{s.ev.charName}</p>
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
                  <span style={{background:ec.lb,color:ec.tx,fontSize:12,fontWeight:700,padding:"2px 9px",borderRadius:6}}>{ec.lbl}</span>
                  <span style={{fontSize:15}}>{s.ev.icon}</span>
                </div>
                <p style={{fontSize:17,fontWeight:800,color:G900,margin:"0 0 7px"}}>{s.ev.title}</p>
                <div style={{background:"#fff",borderRadius:"0 14px 14px 14px",padding:"11px 13px",border:"1px solid "+ec.bd}}>
                  <p style={{fontSize:14,color:G800,lineHeight:1.6,margin:0}}>{s.ev.desc}</p>
                </div>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {s.ev.choices.map((c,i)=>(
                <button key={i} onClick={()=>choose(i)} disabled={!!(c.cost&&s.cash<c.cost)}
                  style={{padding:"12px 15px",borderRadius:12,border:"1px solid "+ec.bd,background:"#fff",cursor:c.cost&&s.cash<c.cost?"not-allowed":"pointer",textAlign:"left",opacity:c.cost&&s.cash<c.cost?0.4:1,fontFamily:"inherit"}}>
                  <p style={{fontSize:15,fontWeight:700,color:G900,margin:"0 0 3px"}}>{c.label}</p>
                  <p style={{fontSize:13,color:G600,margin:0}}>{c.desc}{c.cost?" · 💸 "+fmtN(c.cost)+"원":""}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 결과 */}
        {s.phase==="result" && (
          <div style={{background:"#fff",border:"1px solid "+(s.todayProfit>=0?"#A7F3D0":"#FECACA"),borderRadius:20,padding:18,animation:"pin 0.3s ease-out"}}>
            <div style={{textAlign:"center",marginBottom:14}}>
              <div style={{fontSize:44,marginBottom:7}}>{s.todayProfit>1000000?"🤑":s.todayProfit>0?"😊":s.todayProfit>-500000?"😬":"😭"}</div>
              <p style={{fontSize:15,color:s.todayProfit>=0?GN:RD,fontWeight:700,margin:"0 0 5px"}}>{s.day}일차 마감</p>
              <p style={{fontSize:30,fontWeight:800,color:s.todayProfit>=0?GN:RD,margin:0}}>{s.todayProfit>=0?"+ ":"- "}{fmtN(Math.abs(s.todayProfit))}원</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              {[{l:"👥 방문 고객",v:s.cust+"명",c:B},{l:"💵 매출",v:fmtN(s.rev)+"원",c:GN},{l:"💸 비용",v:fmtN(s.cost)+"원",c:RD},{l:"🏦 잔고",v:fmtN(s.cash)+"원",c:s.cash>=0?G900:RD}].map(item=>(
                <div key={item.l} style={{background:G50,borderRadius:12,padding:"10px 12px"}}>
                  <p style={{fontSize:13,color:G400,margin:"0 0 3px"}}>{item.l}</p>
                  <p style={{fontSize:16,fontWeight:700,color:item.c,margin:0}}>{item.v}</p>
                </div>
              ))}
            </div>
            <div style={{background:G50,borderRadius:12,padding:"9px 12px",marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:13,color:G600,fontWeight:600}}>EXP +{s.todayProfit>500000?30:s.todayProfit>0?15:5}</span>
                <span style={{fontSize:13,color:cfg.color,fontWeight:700}}>LV.{getLv(s.exp)}</span>
              </div>
              <div style={{background:G200,borderRadius:3,height:5,overflow:"hidden"}}>
                <div style={{height:"100%",width:((s.exp%200)/2)+"%",background:cfg.color,borderRadius:3,transition:"width 0.5s"}} />
              </div>
            </div>
            <button onClick={nextDay} style={{width:"100%",padding:"15px",borderRadius:14,border:"none",background:cfg.color,color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              {s.day>=s.maxDays?"🏆 최종 결산 보기":(s.day+1)+"일차로 →"}
            </button>
          </div>
        )}

        {/* 로그 */}
        {s.logs.length>0 && s.phase==="morning" && (
          <div style={{background:"#fff",border:"1px solid "+G200,borderRadius:16,padding:"12px 15px"}}>
            <p style={{fontSize:14,color:G400,margin:"0 0 8px",fontWeight:600}}>📋 최근 기록</p>
            {s.logs.slice(-4).reverse().map(l=>(
              <div key={l.day} style={{display:"flex",justifyContent:"space-between",fontSize:14,padding:"5px 0",borderTop:"1px solid "+G100}}>
                <span style={{color:G400}}>{l.day}일 {WX[l.wx].icon}</span>
                <span style={{color:G600,flex:1,margin:"0 10px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.event??"평범한 하루"}</span>
                <span style={{color:l.profit>=0?GN:RD,fontWeight:700}}>{l.profit>=0?"+":"-"}{fmt(Math.abs(l.profit))}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 게임오버 ────────────────────────────────────────────────
function Over({s, onMenu, onRestart}:{s:S; onMenu:()=>void; onRestart:()=>void}) {
  const sc = calcScore(s);
  const {g, c, e} = gradeOf(sc);
  const cfg = IND[s.ind];
  const [submitted, setSubmitted] = useState(false);
  const [myRank, setMyRank] = useState<number|null>(null);
  const [nick, setNick] = useState("익명 사장님");

  useEffect(()=>{
    delSave();
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
      <NavBar />
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

// ── 메인 엔트리 ────────────────────────────────────────────
export default function GamePage() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [gs, setGs]       = useState<S|null>(null);
  const [saved, setSaved] = useState<S|null>(null);

  useEffect(()=>{ setSaved(loadGame()); }, []);

  if (phase==="menu")    return <Menu onNew={()=>setPhase("setup")} onLoad={()=>{setGs(saved);setPhase("playing");}} saved={saved} />;
  if (phase==="setup")   return <Setup onStart={s=>{setGs(s);setPhase("playing");}} />;
  if (phase==="playing" && gs) return <Play s={gs} setS={setGs} onOver={()=>setPhase("gameover")} />;
  if (phase==="gameover" && gs) return <Over s={gs} onMenu={()=>{setGs(null);setSaved(null);setPhase("menu");}} onRestart={()=>setPhase("setup")} />;
  return null;
}
