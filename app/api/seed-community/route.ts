import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = ["mnhyuk@velaanalytics.com", "mnhyuk0213@gmail.com"];

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    return NextResponse.json({ error: "관리자만 접근 가능" }, { status: 403 });
  }

  const uid = user.id;
  const errors: string[] = [];

  // ── 1. 수익 피드 (simulation_shares) ──
  const shares = [
    { nickname: "카페사장님", industry: "cafe", title: "홍대 카페 6개월 운영 후기", total_sales: 12000000, profit: 3600000, net_profit: 2800000, net_margin: 23.3, cogs_ratio: 32, labor_ratio: 28, bep: 8500000, recovery_months: 14, memo: "디저트 메뉴 추가 후 객단가가 30% 올랐어요. 음료만으로는 한계가 있더라고요." },
    { nickname: "파스타집주인", industry: "restaurant", title: "강남 파스타집 월매출 2천만 달성기", total_sales: 20000000, profit: 5000000, net_profit: 3800000, net_margin: 19.0, cogs_ratio: 35, labor_ratio: 30, bep: 14000000, recovery_months: 18, memo: "런치 세트 메뉴가 효자예요. 점심 회전율이 핵심입니다." },
    { nickname: "이자카야마스터", industry: "bar", title: "연남동 이자카야 1년 결산", total_sales: 18000000, profit: 5400000, net_profit: 4200000, net_margin: 23.3, cogs_ratio: 30, labor_ratio: 25, bep: 11000000, recovery_months: 12, memo: "주류 마진이 높아서 원가율 관리가 수월합니다. 안주 퀄리티가 재방문율을 결정해요." },
    { nickname: "동네빵집사장", industry: "cafe", title: "베이커리카페 원가율 관리 팁", total_sales: 8500000, profit: 2550000, net_profit: 1900000, net_margin: 22.4, cogs_ratio: 28, labor_ratio: 32, bep: 6200000, recovery_months: 20, memo: "직접 굽는 빵 원가가 낮아서 마진이 좋아요. 인건비가 문제지만 맛으로 승부하니 단골이 늘었습니다." },
    { nickname: "고깃집사장", industry: "restaurant", title: "숙성고기 전문점 3개월 리뷰", total_sales: 25000000, profit: 5000000, net_profit: 3500000, net_margin: 14.0, cogs_ratio: 42, labor_ratio: 22, bep: 18000000, recovery_months: 24, memo: "원가율이 높지만 객단가도 높아서 BEP만 넘기면 순이익이 큽니다." },
    { nickname: "와인바운영자", industry: "bar", title: "와인바 소규모 운영 수익 공개", total_sales: 9000000, profit: 3150000, net_profit: 2500000, net_margin: 27.8, cogs_ratio: 28, labor_ratio: 20, bep: 5500000, recovery_months: 16, memo: "15석 소규모로 인건비 최소화. 와인 마진이 정말 좋습니다." },
    { nickname: "브런치카페", industry: "cafe", title: "성수동 브런치카페 현실 매출", total_sales: 15000000, profit: 3750000, net_profit: 2700000, net_margin: 18.0, cogs_ratio: 38, labor_ratio: 28, bep: 11500000, recovery_months: 22, memo: "주말 매출이 평일의 3배예요. 브런치 메뉴는 원가가 높지만 SNS 효과가 큽니다." },
  ];

  const { error: e1 } = await supabase.from("simulation_shares").insert(
    shares.map(s => ({ ...s, user_id: uid, likes: Math.floor(Math.random() * 20) + 3, views: Math.floor(Math.random() * 150) + 30 }))
  );
  if (e1) errors.push(`shares: ${e1.message}`);

  // ── 2. 게시판 (posts) ──
  const posts = [
    { nickname: "카페초보", category: "question", industry: "cafe", title: "카페 창업 초기 비용 얼마나 들었나요?", content: "15평 정도 카페 창업 준비 중인데, 인테리어부터 장비까지 실제로 얼마나 드셨는지 궁금합니다. 보증금 제외하고 순수 인테리어+장비 비용이요!" },
    { nickname: "매장운영3년차", category: "tip", industry: "restaurant", title: "배달앱 수수료 줄이는 현실적인 방법", content: "배달앱 수수료가 너무 아까워서 여러 방법을 시도해봤어요.\n\n1. 자체 배달 시스템 구축 (카카오톡 채널)\n2. 단골 고객 직접 주문 유도 (전단지에 QR코드)\n3. 네이버 스마트플레이스 주문 활용\n\n수수료를 15%에서 8%까지 줄였습니다." },
    { nickname: "외식업선배", category: "tip", industry: "restaurant", title: "식재료 원가 절감 실전 노하우 5가지", content: "10년 운영하면서 터득한 원가 절감 팁입니다.\n\n1. 주 2회 시장 직접 방문 (유통마진 절약)\n2. 제철 식재료 메뉴 구성\n3. 전처리 식재료 활용 (인건비 절약)\n4. 재고 회전율 관리 (폐기 최소화)\n5. 거래처 2곳 이상 유지 (가격 경쟁)" },
    { nickname: "술집고민중", category: "question", industry: "bar", title: "바 창업 vs 이자카야 창업, 뭐가 나을까요?", content: "혼술 트렌드에 맞춰 소규모 바를 생각 중인데, 이자카야가 매출은 더 안정적이라고 하더라고요. 실제 운영하시는 분들 의견 듣고 싶습니다. 초기 투자금은 1억 정도 생각하고 있어요." },
    { nickname: "카페사장2호점", category: "free", industry: "cafe", title: "2호점 낼 때 꼭 체크해야 할 것들", content: "1호점 안정화 후 2호점 준비하면서 느낀 점 공유합니다.\n\n- 1호점과 동일한 맛 유지를 위한 레시피 매뉴얼화\n- 직원 교육 시스템 구축이 먼저\n- 입지 선정 시 1호점과의 거리 고려\n- POS 데이터 기반 메뉴 선별\n\n무작정 확장보다 시스템부터 잡으세요." },
    { nickname: "프랜차이즈탈출", category: "free", industry: "restaurant", title: "프랜차이즈에서 개인 매장으로 전환한 후기", content: "3년간 프랜차이즈 운영 후 개인 매장으로 바꿨습니다.\n\n장점: 로열티 없음, 메뉴 자유, 마진 개선\n단점: 마케팅 직접 해야 함, 초기 인지도 부족\n\n결론적으로 매출은 20% 줄었지만 순이익은 비슷합니다. 자유도가 확실히 좋아요." },
    { nickname: "신메뉴개발중", category: "question", industry: "cafe", title: "시즌 메뉴 출시 주기 어떻게 하세요?", content: "분기별로 시즌 메뉴를 바꾸고 있는데 너무 자주 바꾸면 원가 관리가 어렵고, 안 바꾸면 손님이 질려하는 것 같아요. 다들 어떤 주기로 메뉴를 교체하시나요?" },
    { nickname: "외식업뉴비", category: "question", industry: "restaurant", title: "첫 달 매출이 너무 낮은데 정상인가요?", content: "음식점 오픈한 지 한 달 됐는데 일 매출 30만원도 안 되는 날이 많아요. 맛은 자신 있는데 손님이 안 오니 답답합니다. 다들 초반에 이랬나요? 언제쯤 안정되나요?" },
  ];

  const { error: e2 } = await supabase.from("posts").insert(
    posts.map(p => ({ ...p, user_id: uid, likes: Math.floor(Math.random() * 15) + 1, views: Math.floor(Math.random() * 100) + 20, comment_count: 0 }))
  );
  if (e2) errors.push(`posts: ${e2.message}`);

  // ── 3. 익명 상담 (anonymous_posts) ──
  const anons = [
    { industry: "cafe", title: "카페 매출이 계속 하락하고 있어요", content: "오픈 6개월 됐는데 처음 3개월은 괜찮았거든요. 근데 최근 3개월 연속 매출이 떨어지고 있어요. 주변에 카페가 2개나 더 생겼는데 이게 원인일까요? 메뉴를 바꿔야 할지 마케팅을 해야 할지 모르겠어요." },
    { industry: "restaurant", title: "직원이 자꾸 그만둬요", content: "6개월 사이에 직원이 3명 바뀌었어요. 급여도 업계 평균 이상으로 주고 있는데 왜 안 남는 걸까요? 혼자 주방과 홀 다 보는 날이 많아서 체력적으로 한계입니다." },
    { industry: "bar", title: "술집 매출은 괜찮은데 순이익이 안 남아요", content: "월 매출 1500만원 정도 나오는데 순이익이 100만원도 안 돼요. 어디서 새는 건지 모르겠어요. VELA로 분석해봤는데 인건비 비율이 35%더라고요. 이게 정상인가요?" },
    { industry: "restaurant", title: "공동 창업 파트너와 갈등 중입니다", content: "친구와 5:5로 시작한 음식점인데, 운영 방향이 너무 달라요. 저는 품질에 투자하고 싶고 파트너는 비용 절감을 원해요. 이런 경우 어떻게 해결하셨나요?" },
    { industry: "cafe", title: "카페 폐업을 고민 중입니다", content: "1년 반 운영했는데 적자가 계속되고 있어요. 대출 이자까지 합하면 매달 200만원씩 마이너스입니다. 더 버텨야 할까요 아니면 손절해야 할까요? 정말 힘드네요." },
  ];

  const { error: e3 } = await supabase.from("anonymous_posts").insert(
    anons.map(a => ({ ...a, user_id: uid, likes: Math.floor(Math.random() * 10) + 2, comment_count: 0 }))
  );
  if (e3) errors.push(`anon: ${e3.message}`);

  if (errors.length > 0) {
    return NextResponse.json({ success: false, errors }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    inserted: { shares: shares.length, posts: posts.length, anons: anons.length },
  });
}
