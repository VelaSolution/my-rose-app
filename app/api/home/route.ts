import { NextResponse } from "next/server";

export const revalidate = 300; // 5분 캐시

async function getStocks() {
  try {
    // stooq.com CSV API
    const [r1, r2, r3] = await Promise.all([
      fetch("https://stooq.com/q/l/?s=%5Ekospi&f=sd2ohlcv&e=csv", {headers:{"User-Agent":"Mozilla/5.0"}}),
      fetch("https://stooq.com/q/l/?s=%5Ekosdaq&f=sd2ohlcv&e=csv", {headers:{"User-Agent":"Mozilla/5.0"}}),
      fetch("https://stooq.com/q/l/?s=usdkrw&f=sd2ohlcv&e=csv", {headers:{"User-Agent":"Mozilla/5.0"}}),
    ]);

    const [t1, t2, t3] = await Promise.all([r1.text(), r2.text(), r3.text()]);
    console.log("stooq KOSPI:", t1.slice(0,100));
    console.log("stooq KOSDAQ:", t2.slice(0,100));
    console.log("stooq USD/KRW:", t3.slice(0,100));

    // CSV 파싱: Symbol,Date,Time,Open,High,Low,Close,Volume
    const parseCSV = (csv: string, isForex = false) => {
      const lines = csv.trim().split("\n");
      if (lines.length < 2) return null;
      const vals = lines[1].split(",");
      const close = parseFloat(vals[6]); // Close (index 6)
      const open  = parseFloat(vals[3]); // Open  (index 3)
      if (isNaN(close) || isNaN(open) || close <= 0) return null;
      const diff = close - open;
      const pct  = open > 0 ? (diff / open) * 100 : 0;
      const fmt  = isForex
        ? close.toFixed(1)
        : close.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
      return {
        price: fmt,
        diff:  (diff >= 0 ? "▲" : "▼") + " " + Math.abs(diff).toFixed(isForex ? 1 : 2),
        pct:   (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%",
        up:    diff >= 0,
      };
    };

    const kospi  = parseCSV(t1);
    const kosdaq = parseCSV(t2);
    const usdkrw = parseCSV(t3, true);

    if (!kospi && !kosdaq) return null;
    return { kospi, kosdaq, usdkrw };
  } catch (e) {
    console.error("Stock error:", e);
    return null;
  }
}

async function getNews() {
  const today = new Date().toLocaleDateString("ko-KR", { year:"numeric", month:"long", day:"numeric" });
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        system: `오늘(${today}) 기준 외식업, 자영업, 소상공인, 한국 경제 관련 뉴스 3개를 웹에서 검색 후 JSON 배열로만 응답.
반드시 조선일보, 중앙일보, 동아일보, 한겨레, 연합뉴스, 뉴스1, 머니투데이, 한국경제, 매일경제, 이데일리 등 언론사 기사만 포함.
형식: [{"title":"기사 제목","summary":"한 줄 요약 30자 이내","source":"언론사명","url":"기사 실제 URL"}]
JSON만 출력, 마크다운 없이.`,
        messages: [{ role: "user", content: `오늘 ${today} 외식업·자영업 관련 주요 뉴스 3개 알려줘` }],
      }),
    });
    const data = await res.json();
    const text = (data.content || []).filter((c: {type:string}) => c.type==="text").map((c: {text:string}) => c.text).join("");
    return JSON.parse(text.replace(/```json|```/g,"").trim());
  } catch {
    return [
      { title:"최저임금 인상 논의 본격화", summary:"2027년 최저임금 심의 시작", source:"연합뉴스", url:"https://www.yna.co.kr" },
      { title:"배달앱 수수료 인하 논의", summary:"소상공인 부담 완화 추진", source:"한국경제", url:"https://www.hankyung.com" },
      { title:"외식물가 상승세 지속", summary:"식재료비·인건비 동반 상승", source:"머니투데이", url:"https://www.mt.co.kr" },
    ];
  }
}

export async function GET() {
  const [stocks, news] = await Promise.all([getStocks(), getNews()]);
  return NextResponse.json({ stocks, news });
}
