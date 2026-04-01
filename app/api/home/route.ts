import { NextResponse } from "next/server";

export const revalidate = 3600; // 1시간 캐시

async function getStocks() {
    const key = process.env.BOK_API_KEY;
    if (!key) return null;

  try {
        // KeyStatisticList: 한국은행 100대 지표 전체 조회
      const res = await fetch(
              `https://ecos.bok.or.kr/api/KeyStatisticList/${key}/json/kr/1/101`
            );
        const data = await res.json();
        const rows: { KEYSTAT_NAME: string; DATA_VALUE: string; UNIT_NAME: string; CYCLE: string }[] =
                data?.KeyStatisticList?.row ?? [];

      if (rows.length === 0) return null;

      // 이름으로 필터링
      const kospiRow  = rows.find(r => r.KEYSTAT_NAME.includes("코스피") && !r.KEYSTAT_NAME.includes("200"));
        const kosdaqRow = rows.find(r => r.KEYSTAT_NAME.includes("코스닥"));
        const usdRow    = rows.find(r => r.KEYSTAT_NAME.includes("원/달러") || r.KEYSTAT_NAME.includes("원달러"));

      const fmt = (row: typeof rows[0] | undefined, isForex = false) => {
              if (!row) return null;
              const val = parseFloat(row.DATA_VALUE?.replace(/,/g, "") ?? "");
              if (isNaN(val) || val <= 0) return null;
              const cycle = row.CYCLE ?? "";
              const date = cycle.length === 8
                ? `${cycle.slice(0,4)}.${cycle.slice(4,6)}.${cycle.slice(6,8)}`
                        : cycle;
              return {
                        price: isForex
                          ? val.toFixed(1)
                                    : val.toLocaleString("ko-KR", { maximumFractionDigits: 2 }),
                        date,
              };
      };

      return {
              kospi:  fmt(kospiRow),
              kosdaq: fmt(kosdaqRow),
              usdkrw: fmt(usdRow, true),
      };
  } catch (e) {
        console.error("BOK error:", e);
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
                            system: `오늘(${today}) 기준 외식업, 자영업, 소상공인, 한국 경제 관련 뉴스 3개를 웹에서 검색 후 JSON 배열로만 응답. 반드시 조선일보, 중앙일보, 동아일보, 한겨레, 연합뉴스, 뉴스1, 머니투데이, 한국경제, 매일경제, 이데일리 등 언론사 기사만 포함. 형식: [{"title":"기사 제목","summary":"한 줄 요약 30자 이내","source":"언론사명","url":"기사 실제 URL"}] JSON만 출력, 마크다운 없이.`,
                            messages: [{ role: "user", content: `오늘 ${today} 외식업·자영업 관련 주요 뉴스 3개 알려줘` }],
                  }),
          });
          const json = await res.json();
          const text = (json.content || []).filter((c:{type:string}) => c.type==="text").map((c:{text:string}) => c.text).join("");
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
