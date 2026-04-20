import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4 flex items-center justify-center">
      <style>{`
        @keyframes astronaut-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-18px) rotate(3deg); }
          50% { transform: translateY(-8px) rotate(-2deg); }
          75% { transform: translateY(-22px) rotate(1deg); }
        }
        @keyframes star-twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes drift-slow {
          0%, 100% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(6px) translateY(-4px); }
        }
        .astronaut-anim { animation: astronaut-float 6s ease-in-out infinite; }
        .star-1 { animation: star-twinkle 3s ease-in-out infinite; }
        .star-2 { animation: star-twinkle 3s ease-in-out 0.8s infinite; }
        .star-3 { animation: star-twinkle 3s ease-in-out 1.6s infinite; }
        .star-4 { animation: star-twinkle 2.5s ease-in-out 0.4s infinite; }
        .planet-drift { animation: drift-slow 8s ease-in-out infinite; }
      `}</style>

      <div className="mx-auto max-w-lg text-center">
        {/* Animated space illustration */}
        <div className="relative w-64 h-52 mx-auto mb-8">
          {/* Stars */}
          <div className="star-1 absolute top-4 left-8 w-1.5 h-1.5 bg-blue-400 rounded-full" />
          <div className="star-2 absolute top-12 right-10 w-2 h-2 bg-indigo-400 rounded-full" />
          <div className="star-3 absolute bottom-16 left-12 w-1 h-1 bg-purple-400 rounded-full" />
          <div className="star-4 absolute top-8 right-24 w-1 h-1 bg-blue-300 rounded-full" />
          <div className="star-1 absolute bottom-20 right-16 w-1.5 h-1.5 bg-indigo-300 rounded-full" />

          {/* Small planet */}
          <div className="planet-drift absolute bottom-8 left-6 w-10 h-10 rounded-full bg-gradient-to-br from-purple-200 to-indigo-300 opacity-60" />

          {/* Astronaut */}
          <div className="astronaut-anim absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* Helmet */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 border-4 border-slate-400 flex items-center justify-center shadow-lg">
                <div className="w-10 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 opacity-80" />
              </div>
              {/* Body */}
              <div className="w-14 h-16 bg-slate-200 rounded-xl mx-auto -mt-2 border-2 border-slate-300 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-red-400" />
              </div>
              {/* Backpack */}
              <div className="absolute top-4 -right-3 w-5 h-12 bg-slate-300 rounded-lg border border-slate-400" />
            </div>
          </div>

          {/* 404 text floating behind */}
          <div className="absolute inset-0 flex items-center justify-center -z-10">
            <span className="text-9xl font-black text-slate-100 select-none">404</span>
          </div>
        </div>

        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">앗, 여기는 미지의 공간이에요</h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          찾으시는 페이지가 이동했거나 존재하지 않아요.<br />
          아래에서 검색하거나 인기 페이지로 바로 이동해보세요.
        </p>

        {/* Search bar */}
        <form action="/search" method="GET" className="mb-8">
          <div className="relative max-w-sm mx-auto">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              name="q"
              placeholder="찾고 있는 페이지를 검색해보세요"
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white ring-1 ring-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm"
            />
          </div>
        </form>

        {/* Popular pages */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">인기 페이지</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link href="/simulator" className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 font-semibold px-4 py-2 text-sm hover:bg-blue-100 active:scale-[0.97] transition">
              <span>🔮</span> 시뮬레이터
            </Link>
            <Link href="/tools" className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 text-purple-700 font-semibold px-4 py-2 text-sm hover:bg-purple-100 active:scale-[0.97] transition">
              <span>🛠️</span> 도구 모음
            </Link>
            <Link href="/pricing" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold px-4 py-2 text-sm hover:bg-emerald-100 active:scale-[0.97] transition">
              <span>💰</span> 가격
            </Link>
          </div>
        </div>

        {/* Home button */}
        <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white font-semibold px-6 py-3 text-sm hover:bg-slate-800 active:scale-[0.98] transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
          </svg>
          홈으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
