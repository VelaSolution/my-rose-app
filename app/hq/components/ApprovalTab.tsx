"use client";

import { useState, useEffect, useRef } from "react";
import { HQRole, Approval } from "@/app/hq/types";
import { sb, today, I, C, L, B, B2, BADGE } from "@/app/hq/utils";

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

export default function ApprovalTab({ userId, userName, myRole, flash }: Props) {
  const [list, setList] = useState<Approval[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [filter, setFilter] = useState<"all" | "mine" | "pending">("all");
  const [approvers, setApprovers] = useState<TeamMember[]>([]);
  const [selectedApprover, setSelectedApprover] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const canApprove = myRole === "대표" || myRole === "이사" || myRole === "팀장";

  const load = async () => {
    const s = sb();
    if (!s) return setLoading(false);
    const [{ data }, { data: teamData }] = await Promise.all([
      s.from("hq_approvals").select("*").order("created_at", { ascending: false }),
      s.from("hq_team").select("name, hq_role").order("created_at", { ascending: true }),
    ]);
    if (data)
      setList(data.map((r: any) => ({
        id: r.id, title: r.title, content: r.content,
        author: r.author, approver: r.approver,
        status: r.status, comment: r.comment || "",
        fileUrl: r.file_url, fileName: r.file_name,
        date: r.created_at,
      })));
    if (teamData)
      setApprovers(
        (teamData as TeamMember[]).filter(m => ["대표", "이사", "팀장"].includes(m.hqRole))
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
    });
    if (error) return flash("저장 실패: " + error.message);
    flash("결재가 요청되었습니다");
    setTitle(""); setContent(""); setSelectedApprover(""); setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    load();
  };

  const act = async (id: string, status: "승인" | "반려") => {
    const s = sb();
    if (!s) return;
    await s.from("hq_approvals").update({ status, comment: comment.trim() || null }).eq("id", id);
    flash(`${status}되었습니다`);
    setComment("");
    load();
  };

  const delApproval = async (id: string) => {
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
            <div>
              <label className={L}>결재자</label>
              <select className={I} value={selectedApprover} onChange={e => setSelectedApprover(e.target.value)}>
                <option value="">결재자 선택</option>
                {approvers.map(a => (
                  <option key={a.name} value={a.name}>{a.name} ({a.hqRole})</option>
                ))}
              </select>
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
          <button className={B} onClick={submit}>결재 요청</button>
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
              return (
                <div key={a.id} className="rounded-xl border border-slate-100 p-4 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-slate-800">{a.title}</span>
                        <span className={`${BADGE} ${STATUS_STYLE[a.status]}`}>{a.status}</span>
                        {isApprover && a.status === "대기" && (
                          <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">결재 필요</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        보고자: <span className="text-slate-600 font-medium">{a.author}</span> → 결재자: <span className="text-slate-600 font-medium">{a.approver}</span>
                        {" · "}{new Date(a.date).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    {isAuthor && a.status === "대기" && (
                      <button onClick={() => delApproval(a.id)} className="text-xs text-slate-400 hover:text-red-500 transition-colors">취소</button>
                    )}
                  </div>

                  {a.content && <p className="text-sm text-slate-600 mb-2 whitespace-pre-wrap">{a.content}</p>}

                  {a.fileUrl && (
                    <a href={a.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#3182F6] hover:underline mb-2">
                      📎 {a.fileName || "첨부파일"}
                    </a>
                  )}

                  {a.comment && (
                    <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mb-2">
                      💬 <span className="font-semibold">{a.approver}:</span> {a.comment}
                    </p>
                  )}

                  {/* 결재자만 승인/반려 가능 */}
                  {a.status === "대기" && isApprover && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                      <input className={`${I} !text-xs flex-1`} placeholder="코멘트 (선택)"
                        value={comment} onChange={e => setComment(e.target.value)} />
                      <button className="rounded-xl bg-emerald-500 text-white font-semibold px-4 py-2 text-xs hover:bg-emerald-600 transition-colors"
                        onClick={() => act(a.id, "승인")}>승인</button>
                      <button className="rounded-xl bg-red-500 text-white font-semibold px-4 py-2 text-xs hover:bg-red-600 transition-colors"
                        onClick={() => act(a.id, "반려")}>반려</button>
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
