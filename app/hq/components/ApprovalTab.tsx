"use client";

import { useState, useEffect, useRef } from "react";
import { HQRole, Approval } from "@/app/hq/types";
import { sb, today, I, C, L, B, B2, BADGE, useTeamDisplayNames } from "@/app/hq/utils";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

const STATUS_STYLE: Record<string, string> = {
  "대기": "bg-amber-50 text-amber-700",
  "승인": "bg-emerald-50 text-emerald-700",
  "반려": "bg-red-50 text-red-700",
};

type TeamMember = { name: string; hqRole: string };

interface EnrichedApproval extends Approval {
  urgent?: boolean;
  approved_at?: string;
  seq?: number;
}

export default function ApprovalTab({ userId, userName, myRole, flash }: Props) {
  const [list, setList] = useState<EnrichedApproval[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [comment, setComment] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [filter, setFilter] = useState<"all" | "mine" | "pending">("all");
  const [approvers, setApprovers] = useState<TeamMember[]>([]);
  const [selectedApprover, setSelectedApprover] = useState("");
  const [approverSearch, setApproverSearch] = useState("");
  const [showApproverList, setShowApproverList] = useState(false);
  const [expandedApproval, setExpandedApproval] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { displayName } = useTeamDisplayNames();
  const canApprove = myRole === "대표" || myRole === "이사" || myRole === "팀장";

  const load = async () => {
    const s = sb();
    if (!s) return setLoading(false);
    const [{ data }, { data: teamData }] = await Promise.all([
      s.from("hq_approvals").select("*").order("created_at", { ascending: false }),
      s.from("hq_team").select("name, hq_role").order("created_at", { ascending: true }),
    ]);
    if (data)
      setList(data.map((r: any, index: number) => ({
        id: r.id, title: r.title, content: r.content,
        author: r.author, approver: r.approver,
        status: r.status, comment: r.comment || "",
        fileUrl: r.file_url, fileName: r.file_name,
        date: r.created_at,
        urgent: r.urgent ?? false,
        approved_at: r.approved_at ?? null,
        seq: data.length - index,
      })));
    if (teamData)
      setApprovers(
        (teamData as any[]).map(m => ({ name: m.name, hqRole: m.hq_role ?? "팀원" })).filter(m => ["대표", "이사"].includes(m.hqRole))
      );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!title.trim()) return flash("제목을 입력하세요");
    if (!selectedApprover) return flash("결재자를 선택하세요");
    const s = sb();
    if (!s) return;

    let fileUrl: string | undefined;
    let fileName: string | undefined;
    if (file) {
      const path = `approvals/${Date.now()}_${file.name}`;
      const { error: ue } = await s.storage.from("hq-files").upload(path, file);
      if (!ue) {
        const { data: { publicUrl } } = s.storage.from("hq-files").getPublicUrl(path);
        fileUrl = publicUrl;
        fileName = file.name;
      }
    }

    const { error } = await s.from("hq_approvals").insert({
      title: title.trim(), content: content.trim(),
      author: userName, approver: selectedApprover,
      status: "대기",
      file_url: fileUrl || null, file_name: fileName || null,
      urgent: urgent,
    });
    if (error) return flash("저장 실패: " + error.message);
    flash("결재가 요청되었습니다");
    setTitle(""); setContent(""); setSelectedApprover(""); setFile(null); setUrgent(false);
    setApproverSearch("");
    if (fileRef.current) fileRef.current.value = "";
    load();
  };

  const act = async (id: string, status: "승인" | "반려") => {
    const s = sb();
    if (!s) return;
    await s.from("hq_approvals").update({
      status,
      comment: comment.trim() || null,
      approved_at: new Date().toISOString(),
    }).eq("id", id);
    flash(`${status}되었습니다`);
    setComment("");
    load();
  };

  const delApproval = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    const s = sb();
    if (!s) return;
    await s.from("hq_approvals").delete().eq("id", id);
    flash("삭제되었습니다");
    load();
  };

  const filtered = list.filter(a => {
    if (filter === "mine") return a.author === userName || a.approver === userName;
    if (filter === "pending") return a.status === "대기" && a.approver === userName;
    return true;
  });

  const pendingCount = list.filter(a => a.status === "대기" && a.approver === userName).length;

  function seqLabel(seq: number) {
    return `결재-${String(seq).padStart(3, "0")}`;
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString("ko-KR", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      {/* 결재 요청 폼 */}
      <div className={C}>
        <h3 className="text-lg font-bold text-slate-800 mb-4">결재 요청</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={L}>제목</label>
              <input className={I} placeholder="결재 제목" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="relative">
              <label className={L}>결재자 (대표/이사)</label>
              <input className={I} placeholder="이름으로 검색..." value={approverSearch}
                onChange={e => { setApproverSearch(e.target.value); setShowApproverList(true); setSelectedApprover(""); }}
                onFocus={() => setShowApproverList(true)} />
              {selectedApprover && (
                <span className="absolute right-3 top-[30px] text-xs bg-[#3182F6]/10 text-[#3182F6] px-2 py-0.5 rounded-lg font-semibold">{selectedApprover}</span>
              )}
              {showApproverList && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                  {approvers.filter(a => !approverSearch || a.name.includes(approverSearch)).length === 0 ? (
                    <p className="text-xs text-slate-400 px-3 py-2">검색 결과 없음</p>
                  ) : (
                    approvers.filter(a => !approverSearch || a.name.includes(approverSearch)).map(a => (
                      <button key={a.name} type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between"
                        onClick={() => { setSelectedApprover(a.name); setApproverSearch(a.name); setShowApproverList(false); }}>
                        <span className="font-medium text-slate-700">{a.name}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg">{a.hqRole}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className={L}>보고자</label>
            <div className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200">{userName} ({myRole})</div>
          </div>
          <div>
            <label className={L}>내용</label>
            <textarea
              className={`${I} min-h-[100px] resize-y`}
              placeholder="결재 내용을 작성하세요"
              value={content} onChange={e => setContent(e.target.value)} rows={4}
            />
          </div>
          <div>
            <label className={L}>첨부파일</label>
            <input ref={fileRef} type="file"
              className="text-sm text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={urgent}
                onChange={(e) => setUrgent(e.target.checked)}
                className="rounded border-red-300 text-red-500 focus:ring-red-300"
              />
              <span className="text-red-500 font-semibold">긴급 결재</span>
            </label>
            <button className={B} onClick={submit}>결재 요청</button>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex gap-2 items-center">
        {[
          { key: "all" as const, label: "전체" },
          { key: "mine" as const, label: "내 결재" },
          { key: "pending" as const, label: `승인 대기 ${pendingCount > 0 ? `(${pendingCount})` : ""}` },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              filter === f.key ? "bg-[#3182F6] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* 결재 목록 */}
      <div className={C}>
        <h3 className="text-lg font-bold text-slate-800 mb-4">결재 목록</h3>
        {loading ? (
          <p className="text-sm text-slate-400 py-8 text-center">불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">결재 내역이 없습니다</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(a => {
              const isApprover = a.approver === userName;
              const isAuthor = a.author === userName;
              const isExpanded = expandedApproval === a.id;
              return (
                <div key={a.id} className={`rounded-xl border p-4 hover:bg-slate-50/60 transition-colors ${a.urgent ? "border-red-300 border-l-4 bg-red-50/20" : "border-slate-100"}`}>
                  <div
                    className="flex items-start justify-between gap-3 mb-2 cursor-pointer"
                    onClick={() => setExpandedApproval(isExpanded ? null : a.id)}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded">
                          {seqLabel(a.seq ?? 0)}
                        </span>
                        {a.urgent && (
                          <span className={`${BADGE} text-[10px] bg-red-500 text-white`}>긴급</span>
                        )}
                        <span className="text-sm font-bold text-slate-800">{a.title}</span>
                        <span className={`${BADGE} ${STATUS_STYLE[a.status]}`}>{a.status}</span>
                        {isApprover && a.status === "대기" && (
                          <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">결재 필요</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        보고자: <span className="text-slate-600 font-medium">{displayName(a.author)}</span> → 결재자: <span className="text-slate-600 font-medium">{displayName(a.approver)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAuthor && a.status === "대기" && (
                        <button onClick={(e) => { e.stopPropagation(); delApproval(a.id); }} className="text-xs text-slate-400 hover:text-red-500 transition-colors">취소</button>
                      )}
                      <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                      {a.content && <p className="text-sm text-slate-600 whitespace-pre-wrap">{a.content}</p>}

                      {a.fileUrl && (
                        <a href={a.fileUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#3182F6] hover:underline">
                          📎 {a.fileName || "첨부파일"}
                        </a>
                      )}

                      {a.comment && (
                        <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                          💬 <span className="font-semibold">{displayName(a.approver)}:</span> {a.comment}
                        </p>
                      )}

                      {/* Timeline / History */}
                      <div className="bg-slate-50/80 rounded-xl p-3">
                        <p className="text-xs font-semibold text-slate-500 mb-2">결재 이력</p>
                        <div className="space-y-2">
                          {/* Submitted */}
                          <div className="flex items-start gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#3182F6] mt-1.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-slate-600">
                                <span className="font-semibold">{displayName(a.author)}</span>이(가) 결재를 요청했습니다
                              </p>
                              <p className="text-[10px] text-slate-400">{formatDateTime(a.date)}</p>
                            </div>
                          </div>

                          {/* Approved/Rejected */}
                          {a.status !== "대기" && (
                            <div className="flex items-start gap-2">
                              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.status === "승인" ? "bg-emerald-500" : "bg-red-500"}`} />
                              <div>
                                <p className="text-xs text-slate-600">
                                  <span className="font-semibold">{displayName(a.approver)}</span>이(가){" "}
                                  <span className={a.status === "승인" ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                                    {a.status}
                                  </span>
                                  했습니다
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {a.approved_at ? formatDateTime(a.approved_at) : "-"}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Pending indicator */}
                          {a.status === "대기" && (
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0 animate-pulse" />
                              <p className="text-xs text-amber-600">
                                <span className="font-semibold">{displayName(a.approver)}</span>의 결재를 대기 중입니다...
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 결재자만 승인/반려 가능 */}
                      {a.status === "대기" && isApprover && (
                        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                          <input className={`${I} !text-xs flex-1`} placeholder="코멘트 (선택)"
                            value={comment} onChange={e => setComment(e.target.value)} />
                          <button className="rounded-xl bg-emerald-500 text-white font-semibold px-4 py-2 text-xs hover:bg-emerald-600 transition-colors"
                            onClick={() => act(a.id, "승인")}>승인</button>
                          <button className="rounded-xl bg-red-500 text-white font-semibold px-4 py-2 text-xs hover:bg-red-600 transition-colors"
                            onClick={() => act(a.id, "반려")}>반려</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
