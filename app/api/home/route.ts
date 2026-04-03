import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function getStocks() {
  const key = process.env.BOK_API_KEY;
  if (!key) return null;
  try {
    const url = `https://ecos.bok.or.kr/api/KeyStatisticList/${key}/json/kr/1/101`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    const rows = data?.KeyStatisticList?.row ?? [];
    if (rows.length === 0) return null;
    const kospiRow  = rows.find((r: {KEYSTAT_NAME:string}) => r.KEYSTAT_NAME.includes("\uCF54\uC2A4\uD53C") && !r.KEYSTAT_NAME.includes("200"));
    const kosdaqRow = rows.find((r: {KEYSTAT_NAME:string}) => r.KEYSTAT_NAME.includes("\uCF54\uC2A4\uB2E5"));
    const usdRow    = rows.find((r: {KEYSTAT_NAME:string}) => r.KEYSTAT_NAME.includes("\uC6D0/\uB2EC\uB7EC"));
    const fmt = (row: {DATA_VALUE:string;CYCLE:string} | undefined, isForex = false) => {
      if (!row) return null;
      const val = parseFloat(row.DATA_VALUE?.replace(/,/g, "") ?? "");
      if (isNaN(val) || val <= 0) return null;
      const c = row.CYCLE ?? "";
      return {
        price: isForex ? val.toFixed(1) : val.toLocaleString("ko-KR", { maximumFractionDigits: 2 }),
        date: c.length === 8 ? `${c.slice(0,4)}.${c.slice(4,6)}.${c.slice(6,8)}` : c,
      };
    };
    return { kospi: fmt(kospiRow), kosdaq: fmt(kosdaqRow), usdkrw: fmt(usdRow, true) };
  } catch (e) { console.error("BOK error:", e); return null; }
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
        model: "claude-opus-4-6",
        max_tokens: 1000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        system: `Today is ${today}. Search for 6 latest Korean news articles. Include a mix of: food service industry news (2), small business/self-employed news (2), AND general Korean economic news like interest rates, inflation, consumer spending, employment (2). For each article, add a "tag" field with one of: "외식업", "소상공인", "경제". Also add an "insight" field: a one-sentence practical tip for a restaurant owner based on this news (under 40 chars, in Korean). Respond ONLY with a JSON array: [{"title":"Korean title","summary":"Korean summary under 30 chars","source":"media name","url":"article URL","tag":"category","insight":"사장님 한줄 인사이트"}]. No markdown, no extra text.`,
        messages: [{ role: "user", content: `${today} 외식업 소상공인 경제 금리 물가 고용 최신 뉴스 6개` }],
      }),
    });
    const json = await res.json();
    const text = (json.content || []).filter((c:{type:string}) => c.type==="text").map((c:{text:string}) => c.text).join("");
    return JSON.parse(text.replace(/```json|```/g,"").trim());
  } catch (e) {
    console.error("News error:", e);
    return [
      { title: "\uCD5C\uC800\uC784\uAE08 \uC778\uC0C1 \uB17C\uC758", summary: "2027\uB144 \uC2EC\uC758 \uC2DC\uC791", source: "\uC5F0\uD569\uB274\uC2A4", url: "https://www.yna.co.kr" },
      { title: "\uBC30\uB2EC\uC559 \uC218\uC218\uB8CC \uC778\uD558", summary: "\uC18C\uC0C1\uACF5\uC778 \uBD80\uB2F4 \uC644\uD654", source: "\uD55C\uAD6D\uACBD\uC81C", url: "https://www.hankyung.com" },
      { title: "\uC678\uC2DD\uBB3C\uAC00 \uC0C1\uC2B9\uC138 \uC9C0\uC18D", summary: "\uC2DD\uC7AC\uB8CC\uBE44 \uB3D9\uBC18 \uC0C1\uC2B9", source: "\uBA38\uB2C8\uD22C\uB370\uC774", url: "https://www.mt.co.kr" },
    ];
  }
}

export async function GET() {
  const [stocks, news] = await Promise.all([getStocks(), getNews()]);
  return NextResponse.json({ stocks, news });
}
