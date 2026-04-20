"use client";
import { useState, useEffect, useMemo } from "react";
import type { HQRole } from "@/app/hq/types";
import { sb, I, C, L, B, B2, BADGE, fmt, today, useTeamDisplayNames } from "@/app/hq/utils";

interface Props { userId: string; userName: string; myRole: HQRole; flash: (m: string) => void }

type Asset = {
  id: string; name: string; category: string; serial_number: string;
  purchase_date: string; purchase_price: number; current_holder: string;
  status: string; description: string; created_at: string;
};
type AssetLog = {
  id: string; asset_id: string; action: string; user_name: string;
  date: string; memo: string; created_at: string;
};

const CATEGORIES = ["노트북", "모니터", "키보드/마우스", "사무가구", "차량", "기타"] as const;
const STATUSES = ["사용중", "보관중", "수리중", "폐기"] as const;
const LOG_ACTIONS = ["대여", "반납", "수리", "폐기"] as const;

const STATUS_COLORS: Record<string, string> = {
  "사용중": "bg-blue-50 text-blue-700", "보관중": "bg-slate-100 text-slate-600",
  "수리중": "bg-amber-50 text-amber-700", "폐기": "bg-red-50 text-red-700",
};
const CAT_COLORS: Record<string, string> = {
  "노트북": "bg-indigo-50 text-indigo-700", "모니터": "bg-cyan-50 text-cyan-700",
  "키보드/마우스": "bg-teal-50 text-teal-700", "사무가구": "bg-orange-50 text-orange-700",
  "차량": "bg-purple-50 text-purple-700", "기타": "bg-slate-50 text-slate-600",
};

const EMPTY_FORM = {
  name: "", category: "노트북" as string, serial_number: "", purchase_date: today(),
  purchase_price: "", current_holder: "", status: "보관중" as string, description: "",
};

export default function AssetTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const canEdit = myRole === "대표" || myRole === "이사" || myRole === "팀장";

  const [assets, setAssets] = useState<Asset[]>([]);
  const [logs, setLogs] = useState<AssetLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // filters
  const [catFilter, setCatFilter] = useState("전체");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [search, setSearch] = useState("");

  // log form
  const [logAssetId, setLogAssetId] = useState<string | null>(null);
  const [logAction, setLogAction] = useState<string>("대여");
  const [logMemo, setLogMemo] = useState("");

  // detail view
  const [detailId, setDetailId] = useState<string | null>(null);

  const [teamNames, setTeamNames] = useState<string[]>([]);

  async function load() {
    const s = sb(); if (!s) { setLoading(false); return; }
    const [r1, r2, r3] = await Promise.all([
      s.from("hq_assets").select("*").order("created_at", { ascending: false }),
      s.from("hq_asset_logs").select("*").order("date", { ascending: false }).limit(200),
      s.from("hq_team").select("name").neq("approved", false),
    ]);
    if (r1.data) setAssets(r1.data as Asset[]);
    if (r2.data) setLogs(r2.data as AssetLog[]);
    if (r3.data) setTeamNames((r3.data as { name: string }[]).map(t => t.name));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return assets.filter(a => {
      if (catFilter !== "전체" && a.category !== catFilter) return false;
      if (statusFilter !== "전체" && a.status !== statusFilter) return false;
      if (search && !a.name.includes(search) && !a.serial_number?.includes(search) && !a.current_holder?.includes(search)) return false;
      return true;
    });
  }, [assets, catFilter, statusFilter, search]);

  const summary = useMemo(() => {
    const total = assets.length;
    const inUse = assets.filter(a => a.status === "사용중").length;
    const stored = assets.filter(a => a.status === "보관중").length;
    const totalValue = assets.reduce((s, a) => s + (a.purchase_price || 0), 0);
    return { total, inUse, stored, totalValue };
  }, [assets]);

  async function saveAsset() {
    if (!form.name.trim()) { flash("자산명을 입력해주세요"); return; }
    setSaving(true);
    const s = sb(); if (!s) { setSaving(false); return; }
    const payload = {
      name: form.name.trim(), category: form.category, serial_number: form.serial_number.trim(),
      purchase_date: form.purchase_date || null, purchase_price: Number(form.purchase_price) || 0,
      current_holder: form.current_holder || null, status: form.status, description: form.description.trim(),
    };
    if (editId) {
      await s.from("hq_assets").update(payload).eq("id", editId);
      flash("자산이 수정되었습니다");
    } else {
      await s.from("hq_assets").insert(payload);
      flash("자산이 등록되었습니다");
    }
    setShowForm(false); setForm(EMPTY_FORM); setEditId(null); setSaving(false);
    load();
  }

  function openEdit(a: Asset) {
    setForm({
      name: a.name, category: a.category, serial_number: a.serial_number || "",
      purchase_date: a.purchase_date || today(), purchase_price: String(a.purchase_price || ""),
      current_holder: a.current_holder || "", status: a.status, description: a.description || "",
    });
    setEditId(a.id); setShowForm(true);
  }

  async function deleteAsset(id: string) {
    if (!confirm("이 자산을 삭제하시겠습니까?")) return;
    const s = sb(); if (!s) return;
    await s.from("hq_assets").delete().eq("id", id);
    flash("삭제되었습니다"); load();
  }

  async function submitLog() {
    if (!logAssetId) return;
    const s = sb(); if (!s) return;
    await s.from("hq_asset_logs").insert({
      asset_id: logAssetId, action: logAction, user_name: userName, date: today(), memo: logMemo.trim(),
    });
    // 상태 자동 변경
    const statusMap: Record<string, string> = { "대여": "사용중", "반납": "보관중", "수리": "수리중", "폐기": "폐기" };
    const holderUpdate: Record<string, string | null> = { "대여": userName, "반납": null, "수리": null, "폐기": null };
    await s.from("hq_assets").update({
      status: statusMap[logAction] || "보관중",
      current_holder: holderUpdate[logAction] ?? undefined,
    }).eq("id", logAssetId);
    flash(`${logAction} 처리되었습니다`);
    setLogAssetId(null); setLogMemo("");
    load();
  }

  const detailAsset = detailId ? assets.find(a => a.id === detailId) : null;
  const detailLogs = detailId ? logs.filter(l => l.asset_id === detailId) : [];

  if (loading) return <div className="text-center py-20 text-slate-400">불러오는 중...</div>;

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "전체 자산", value: `${summary.total}건` },
          { label: "사용중", value: `${summary.inUse}건` },
          { label: "보관중", value: `${summary.stored}건` },
          { label: "총 자산가치", value: `${fmt(summary.totalValue)}원` },
        ].map(c => (
          <div key={c.label} className={C}>
            <p className="text-xs text-slate-400 mb-1">{c.label}</p>
            <p className="text-lg font-bold text-slate-800">{c.value}</p>
          </div>
        ))}
      </div>

      {/* 필터 & 검색 */}
      <div className={`${C} flex flex-wrap gap-3 items-center`}>
        <input className={`${I} max-w-[200px]`} placeholder="검색 (이름/시리얼/사용자)" value={search} onChange={e => setSearch(e.target.value)} />
        <select className={`${I} max-w-[140px]`} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="전체">카테고리 전체</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className={`${I} max-w-[130px]`} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="전체">상태 전체</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <div className="flex-1" />
        {canEdit && <button className={B} onClick={() => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); }}>+ 자산 등록</button>}
      </div>

      {/* 등록/수정 폼 */}
      {showForm && (
        <div className={C}>
          <h3 className="font-bold text-slate-800 mb-4">{editId ? "자산 수정" : "자산 등록"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={L}>자산명 *</label><input className={I} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className={L}>카테고리</label>
              <select className={I} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label className={L}>시리얼 번호</label><input className={I} value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} /></div>
            <div><label className={L}>구매일</label><input type="date" className={I} value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} /></div>
            <div><label className={L}>구매가격 (원)</label><input type="number" className={I} value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })} /></div>
            <div><label className={L}>현재 사용자</label>
              <select className={I} value={form.current_holder} onChange={e => setForm({ ...form, current_holder: e.target.value })}>
                <option value="">없음</option>
                {teamNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div><label className={L}>상태</label>
              <select className={I} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="md:col-span-2"><label className={L}>비고</label><textarea className={`${I} min-h-[60px]`} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className={B} onClick={saveAsset} disabled={saving}>{saving ? "저장중..." : editId ? "수정" : "등록"}</button>
            <button className={B2} onClick={() => { setShowForm(false); setEditId(null); }}>취소</button>
          </div>
        </div>
      )}

      {/* 대여/반납 모달 */}
      {logAssetId && (
        <div className={C}>
          <h3 className="font-bold text-slate-800 mb-3">자산 이력 등록</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div><label className={L}>작업</label>
              <select className={I} value={logAction} onChange={e => setLogAction(e.target.value)}>
                {LOG_ACTIONS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex-1"><label className={L}>메모</label><input className={I} value={logMemo} onChange={e => setLogMemo(e.target.value)} placeholder="메모 (선택)" /></div>
            <button className={B} onClick={submitLog}>등록</button>
            <button className={B2} onClick={() => setLogAssetId(null)}>취소</button>
          </div>
        </div>
      )}

      {/* 자산 상세 */}
      {detailAsset && (
        <div className={C}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-lg text-slate-800">{detailAsset.name}</h3>
              <p className="text-sm text-slate-500">S/N: {detailAsset.serial_number || "-"}</p>
            </div>
            <button className={B2} onClick={() => setDetailId(null)}>닫기</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
            <div><span className="text-slate-400">카테고리</span><br/><span className={`${BADGE} ${CAT_COLORS[detailAsset.category] || ""}`}>{detailAsset.category}</span></div>
            <div><span className="text-slate-400">상태</span><br/><span className={`${BADGE} ${STATUS_COLORS[detailAsset.status] || ""}`}>{detailAsset.status}</span></div>
            <div><span className="text-slate-400">사용자</span><br/>{detailAsset.current_holder ? displayName(detailAsset.current_holder) : "-"}</div>
            <div><span className="text-slate-400">구매가</span><br/>{detailAsset.purchase_price ? `${fmt(detailAsset.purchase_price)}원` : "-"}</div>
          </div>
          {detailAsset.description && <p className="text-sm text-slate-600 mb-4">{detailAsset.description}</p>}
          <h4 className="font-semibold text-slate-700 mb-2">이력</h4>
          {detailLogs.length === 0 ? <p className="text-sm text-slate-400">이력이 없습니다</p> : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {detailLogs.map(l => (
                <div key={l.id} className="flex items-center gap-3 text-sm border-b border-slate-100 pb-2">
                  <span className={`${BADGE} ${STATUS_COLORS[l.action === "대여" ? "사용중" : l.action === "반납" ? "보관중" : l.action === "수리" ? "수리중" : "폐기"] || "bg-slate-100 text-slate-600"}`}>{l.action}</span>
                  <span className="text-slate-600">{displayName(l.user_name)}</span>
                  <span className="text-slate-400">{l.date}</span>
                  {l.memo && <span className="text-slate-500">— {l.memo}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 자산 목록 */}
      <div className={C}>
        <h3 className="font-bold text-slate-800 mb-3">자산 목록 ({filtered.length}건)</h3>
        {filtered.length === 0 ? <p className="text-sm text-slate-400 text-center py-8">등록된 자산이 없습니다</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 font-medium">자산명</th>
                  <th className="pb-2 font-medium">카테고리</th>
                  <th className="pb-2 font-medium">시리얼</th>
                  <th className="pb-2 font-medium">사용자</th>
                  <th className="pb-2 font-medium">상태</th>
                  <th className="pb-2 font-medium">구매가</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 font-medium text-slate-800 cursor-pointer hover:text-[#3182F6]" onClick={() => setDetailId(a.id)}>{a.name}</td>
                    <td><span className={`${BADGE} ${CAT_COLORS[a.category] || "bg-slate-100 text-slate-600"}`}>{a.category}</span></td>
                    <td className="text-slate-500">{a.serial_number || "-"}</td>
                    <td className="text-slate-600">{a.current_holder ? displayName(a.current_holder) : "-"}</td>
                    <td><span className={`${BADGE} ${STATUS_COLORS[a.status] || ""}`}>{a.status}</span></td>
                    <td className="text-slate-600">{a.purchase_price ? `${fmt(a.purchase_price)}원` : "-"}</td>
                    <td>
                      <div className="flex gap-1">
                        <button className="text-xs text-[#3182F6] hover:underline" onClick={() => { setLogAssetId(a.id); setLogAction("대여"); }}>이력</button>
                        {canEdit && <>
                          <button className="text-xs text-slate-400 hover:underline" onClick={() => openEdit(a)}>수정</button>
                          <button className="text-xs text-red-400 hover:underline" onClick={() => deleteAsset(a.id)}>삭제</button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
