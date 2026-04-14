"use client";
import { C, B, B2 } from "@/app/hq/utils";

interface Props {
  weeklyText: string;
  weeklyLoading: boolean;
  onRefresh: () => void;
  flash: (m: string) => void;
}

export default function WeeklyReport({ weeklyText, weeklyLoading, onRefresh, flash }: Props) {
  return (
    <div className={C}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800">주간 보고서 자동 생성</h3>
        <div className="flex gap-2 flex-wrap">
          <button className={B2} onClick={onRefresh} disabled={weeklyLoading}>
            {weeklyLoading ? "생성중..." : "새로고침"}
          </button>
          <button className={B2} onClick={() => { navigator.clipboard.writeText(weeklyText); flash("클립보드에 복사됨"); }}>
            클립보드 복사
          </button>
          <button className={B} onClick={() => {
            if (!weeklyText) { flash("보고서를 먼저 생성하세요"); return; }
            const blob = new Blob([weeklyText], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            const dateStr = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `VELA_주간보고서_${dateStr}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            flash("파일 다운로드 완료");
          }}>
            PDF 다운로드
          </button>
        </div>
      </div>
      <pre className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
        {weeklyLoading ? "데이터를 수집 중입니다..." : weeklyText || "데이터를 불러오는 중..."}
      </pre>
    </div>
  );
}
