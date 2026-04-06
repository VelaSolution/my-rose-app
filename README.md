# VELA - 외식업 수익 분석 플랫폼

> 외식업/소상공인 사장님을 위한 AI 기반 수익 시뮬레이터 & 경영 도구 모음

**[velaanalytics.com](https://velaanalytics.com)** | 벨라솔루션 (사업자등록번호: 777-17-02386)

## 주요 기능

| 기능 | 설명 |
|---|---|
| 수익 시뮬레이터 | 업종별 매출·비용·순이익·BEP 자동 계산 (5개 업종 지원) |
| AI 브리핑 & 전략 | Claude AI 기반 경영 진단 및 맞춤 전략 추천 |
| 메뉴 원가 계산기 | 식재료 원가 입력 → 원가율·건당 순익 자동 계산 |
| AI 도구 모음 | SNS 콘텐츠 생성, 리뷰 답변, 상권 분석, 배달앱 분석 등 |
| 대시보드 | 월별 매출·순이익 추이, 목표 관리 |
| 손익계산서 PDF | 시뮬레이션 데이터 기반 P&L 리포트 출력 |
| 커뮤니티 | 사장님 수익 공유, 게시판, 업종 벤치마크 |
| 식당 경영 게임 | 시뮬레이션 기반 경영 체험 게임 |

## 기술 스택

- **프레임워크**: Next.js 16 (App Router, Turbopack)
- **언어**: TypeScript 5
- **스타일링**: Tailwind CSS 4
- **DB/인증**: Supabase (PostgreSQL + Auth)
- **AI**: Anthropic Claude API
- **결제**: 토스페이먼츠
- **이메일**: Resend
- **차트**: Recharts
- **배포**: Vercel

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build && npm start
```

## 환경변수

`.env.local` 파일을 루트에 생성하고 아래 키를 설정하세요.

```env
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI (필수)
ANTHROPIC_API_KEY=

# 결제 (토스페이먼츠)
NEXT_PUBLIC_TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=

# 카카오 로그인
NEXT_PUBLIC_KAKAO_JS_KEY=

# 이메일 (Resend)
RESEND_API_KEY=

# 관리자
NEXT_PUBLIC_ADMIN_EMAIL=
ADMIN_EMAIL=

# 외부 API
BOK_API_KEY=          # 한국은행 경제지표
CREFIA_API_KEY=       # 여신금융협회 카드매출
KAMIS_API_KEY=        # 농산물 시세
```

## 프로젝트 구조

```
app/
├── (auth)/          # 로그인/회원가입
├── admin/           # 관리자 대시보드
├── api/             # API 라우트 (18개)
├── community/       # 커뮤니티
├── dashboard/       # 대시보드
├── event/           # 이벤트 (체험단 피드백)
├── game/            # 경영 시뮬레이션 게임
├── my-store/        # 내 매장 현황
├── result/          # 시뮬레이션 결과
├── simulator/       # 수익 시뮬레이터
├── tools/           # AI 도구 모음 (17개)
│   ├── menu-cost/   # 메뉴 원가 계산기
│   ├── labor-law/   # 인건비 계산기
│   ├── tax/         # 세금 계산기
│   ├── pl-report/   # 손익계산서 PDF
│   └── ...
└── ...

components/          # 공유 컴포넌트
lib/                 # 유틸리티, 타입, Supabase 클라이언트
```

## API 엔드포인트

| 엔드포인트 | 메서드 | 설명 | 인증 | Rate Limit |
|---|---|---|---|---|
| `/api/briefing` | POST | AI 경영 브리핑 생성 | - | - |
| `/api/ai-strategy` | POST | AI 전략 추천 | - | - |
| `/api/chat` | POST | AI 상담 챗봇 | - | - |
| `/api/tools/generate` | POST | AI 도구 콘텐츠 생성 | O | 10/분 |
| `/api/event/feedback` | POST | 이벤트 피드백 제출 | O | 3/분 |
| `/api/payment/confirm` | POST | 결제 승인 (토스) | O | - |
| `/api/benchmark` | GET | 업종 벤치마크 조회 | - | 10/분 |
| `/api/home` | GET | 경제지표 (KOSPI 등) | - | - |
| `/api/card-sales` | POST | 카드매출 조회 | - | 5/분 |
| `/api/delivery-analysis` | POST | 배달앱 정산 분석 | - | 5/분 |
| `/api/parse-excel` | POST | CSV/Excel 파싱 | - | - |
| `/api/contact` | POST | 문의하기 이메일 | - | - |
| `/api/newsletter` | POST | 뉴스레터 발송 | 관리자 | - |
| `/api/reminder` | POST | 매출 등록 리마인더 | 관리자 | 2/분 |
| `/api/weekly-report` | POST | 주간 리포트 발송 | 관리자 | 2/분 |
| `/api/anon-ai-reply` | POST | 익명 게시글 AI 답변 | - | - |
| `/api/ingredient-price` | GET | 식재료 시세 | - | O |
| `/api/report-card` | GET | OG 이미지 생성 | - | - |

## 요금제

| | Free | Standard |
|---|---|---|
| 가격 | 0원 | 월 9,900원 |
| 시뮬레이터 | 월 3회 | 무제한 |
| AI 브리핑·전략 | - | 무제한 |
| AI 도구 | - | 무제한 |
| 대시보드·PDF | - | O |
| 기본 도구 | 5종 | 전체 |

## 배포

Vercel에 자동 배포됩니다. `main` 브랜치에 push하면 프로덕션 배포가 트리거됩니다.

```bash
# 수동 배포 (Vercel CLI)
npx vercel --prod
```

## 보안

- 모든 페이지에 보안 헤더 적용 (X-Frame-Options, CSP 등)
- Supabase Row Level Security (RLS) 활성화
- API Rate Limiting (IP 기반)
- 서버 사이드 입력 검증

## 라이선스

Private - 벨라솔루션 내부 프로젝트
