"use client";

import { useState, useEffect, useMemo } from "react";
import { HQRole, Contact } from "@/app/hq/types";
import { sb, I, C, L, B, B2, BADGE } from "@/app/hq/utils";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-600",
  "bg-emerald-100 text-emerald-600",
  "bg-amber-100 text-amber-600",
  "bg-purple-100 text-purple-600",
  "bg-rose-100 text-rose-600",
  "bg-cyan-100 text-cyan-600",
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/* ── 명함 데이터 타입 ── */
interface BusinessCardData {
  company: string;
  name: string;
  position: string;
  department: string;
  phone: string;
  email: string;
  address: string;
  fax: string;
  motto: string;
}

export default function ContactsTab({ userId, userName, myRole, flash }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [view, setView] = useState<"grid" | "org">("grid");
  const [loading, setLoading] = useState(true);

  // Form
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [extension, setExtension] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");

  // 명함 모달
  const [cardContact, setCardContact] = useState<Contact | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);

  // 내 명함 편집
  const [showMyCardEdit, setShowMyCardEdit] = useState(false);
  const [myCardData, setMyCardData] = useState<BusinessCardData>({
    company: "VELA", name: "", position: "", department: "",
    phone: "", email: "", address: "", fax: "", motto: "",
  });
  const [myCardLoading, setMyCardLoading] = useState(false);

  const load = async () => {
    const s = sb();
    if (!s) { setLoading(false); return; }
    try {
      // hq_contacts + hq_team 동시 로드
      const [contactsRes, teamRes] = await Promise.all([
        s.from("hq_contacts").select("*").order("name", { ascending: true }),
        s.from("hq_team").select("*").order("created_at", { ascending: true }),
      ]);

      const contactsList: Contact[] = (contactsRes.data ?? []).map((r: any) => ({
        id: r.id, name: r.name,
        department: r.department || "", position: r.position || "",
        phone: r.phone || "", email: r.email || "",
        extension: r.extension || "", mobile: r.mobile || "",
        address: r.address || "", manager: r.manager,
      }));

      // hq_team 데이터를 Contact 형식으로 변환 (중복 제거: 이메일 기준)
      const contactEmails = new Set(contactsList.map(c => c.email).filter(Boolean));
      const teamAsContacts: Contact[] = (teamRes.data ?? [])
        .filter((t: any) => !contactEmails.has(t.email))
        .map((t: any) => ({
          id: `team-${t.id}`, name: t.name,
          department: t.role || "", position: t.hq_role || "팀원",
          phone: t.phone || "", email: t.email || "",
          extension: "", manager: undefined,
        }));

      setContacts([...contactsList, ...teamAsContacts]);
    } catch (e) {
      console.error("ContactsTab load error:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  /* ── 내 명함 데이터 로드 ── */
  const loadMyCard = async () => {
    const s = sb();
    if (!s) return;
    try {
      const { data } = await s
        .from("hq_settings")
        .select("value")
        .eq("key", `business_card_${userName}`)
        .maybeSingle();
      if (data?.value) {
        const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        setMyCardData({
          company: parsed.company || "VELA",
          name: parsed.name || userName,
          position: parsed.position || "",
          department: parsed.department || "",
          phone: parsed.phone || "",
          email: parsed.email || "",
          address: parsed.address || "",
          fax: parsed.fax || "",
          motto: parsed.motto || "",
        });
      } else {
        // 기본값: 연락처/팀 데이터에서 찾기
        const me = contacts.find(c => c.name === userName);
        setMyCardData({
          company: "VELA",
          name: userName,
          position: me?.position || "",
          department: me?.department || "",
          phone: me?.phone || "",
          email: me?.email || "",
          address: "",
          fax: "",
          motto: "",
        });
      }
    } catch (e) {
      console.error("loadMyCard error:", e);
    }
  };

  const saveMyCard = async () => {
    const s = sb();
    if (!s) { flash("DB 연결 실패"); return; }
    setMyCardLoading(true);
    try {
      const { error } = await s.from("hq_settings").upsert({
        key: `business_card_${userName}`,
        value: JSON.stringify(myCardData),
      }, { onConflict: "key" });
      if (error) throw error;
      flash("명함이 저장되었습니다");
      setShowMyCardEdit(false);
    } catch (e: any) {
      console.error("saveMyCard error:", e);
      flash("명함 저장 실패: " + (e?.message || ""));
    }
    setMyCardLoading(false);
  };

  /* ── 명함 보기 (다른 사람) ── */
  const viewCard = async (c: Contact) => {
    setCardContact(c);
    setShowCardModal(true);
    // hq_settings에서 커스텀 명함 데이터 로드 시도
    const s = sb();
    if (!s) return;
    try {
      const { data } = await s
        .from("hq_settings")
        .select("value")
        .eq("key", `business_card_${c.name}`)
        .maybeSingle();
      if (data?.value) {
        const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        setCardContact({
          ...c,
          phone: parsed.phone || c.phone,
          email: parsed.email || c.email,
          department: parsed.department || c.department,
          position: parsed.position || c.position,
        });
        // 추가 필드를 모달에서 사용하기 위해 별도 state
        setCardExtraData({
          address: parsed.address || "",
          fax: parsed.fax || "",
          motto: parsed.motto || "",
          company: parsed.company || "VELA",
        });
      } else {
        setCardExtraData({ address: "", fax: "", motto: "", company: "VELA" });
      }
    } catch {
      setCardExtraData({ address: "", fax: "", motto: "", company: "VELA" });
    }
  };

  const [cardExtraData, setCardExtraData] = useState<{ address: string; fax: string; motto: string; company: string }>({
    address: "", fax: "", motto: "", company: "VELA",
  });

  /* ── 명함 공유 (클립보드 복사) ── */
  const shareCard = (c: Contact, extra?: { address: string; fax: string; motto: string; company: string }) => {
    const lines = [
      `━━━━━━━━━━━━━━━━━━━━`,
      `  ${extra?.company || "VELA"}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `  ${c.name}`,
      c.position ? `  ${c.position}` : "",
      c.department ? `  ${c.department}` : "",
      ``,
      c.phone ? `  TEL  ${c.phone}` : "",
      c.email ? `  EMAIL  ${c.email}` : "",
      extra?.fax ? `  FAX  ${extra.fax}` : "",
      extra?.address ? `  ADDR  ${extra.address}` : "",
      extra?.motto ? `\n  "${extra.motto}"` : "",
      `━━━━━━━━━━━━━━━━━━━━`,
    ].filter(Boolean).join("\n");

    navigator.clipboard.writeText(lines).then(() => {
      flash("명함 정보가 클립보드에 복사되었습니다");
    }).catch(() => {
      flash("복사 실패");
    });
  };

  const add = async () => {
    if (!name.trim()) return flash("이름을 입력하세요");
    const s = sb();
    if (!s) { flash("DB 연결 실패"); return; }
    try {
      const { error } = await s.from("hq_contacts").insert({
        name: name.trim(),
        department: department.trim(),
        position: position.trim(),
        phone: phone.trim(),
        email: email.trim(),
        extension: extension.trim(),
        mobile: mobile.trim(),
        address: address.trim(),
      });
      if (error) throw error;
      await load();
      flash("연락처가 추가되었습니다");
      setName("");
      setDepartment("");
      setPosition("");
      setPhone("");
      setEmail("");
      setExtension("");
      setMobile("");
      setAddress("");
    } catch (e) {
      console.error("ContactsTab add error:", e);
      flash("연락처 추가 실패");
    }
  };

  const isAdmin = myRole === "대표" || myRole === "이사";
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", department: "", position: "", phone: "", email: "", extension: "", mobile: "", address: "" });

  const startEdit = (c: Contact) => {
    setEditingId(c.id);
    setEditForm({ name: c.name, department: c.department, position: c.position, phone: c.phone, email: c.email, extension: c.extension, mobile: c.mobile || "", address: c.address || "" });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const s = sb();
    if (!s) return;
    const isTeamContact = editingId.startsWith("team-");
    const realId = isTeamContact ? editingId.replace("team-", "") : editingId;
    try {
      let error;
      if (isTeamContact) {
        const res = await s.from("hq_team").update({
          name: editForm.name, role: editForm.department, email: editForm.email,
        }).eq("id", realId);
        error = res.error;
      } else {
        const res = await s.from("hq_contacts").update({
          name: editForm.name, department: editForm.department, position: editForm.position,
          phone: editForm.phone, email: editForm.email, extension: editForm.extension,
          mobile: editForm.mobile, address: editForm.address,
        }).eq("id", editingId);
        error = res.error;
      }
      if (error) { flash("수정 실패: " + error.message); console.error("saveEdit error:", error); return; }
      flash("수정 완료");
      setEditingId(null);
      load();
    } catch (e) { flash("수정 실패"); console.error(e); }
  };

  const remove = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    const s = sb();
    if (!s) { flash("DB 연결 실패"); return; }
    try {
      const { error } = await s.from("hq_contacts").delete().eq("id", id);
      if (error) throw error;
      await load();
      flash("삭제되었습니다");
    } catch (e) {
      console.error("ContactsTab remove error:", e);
      flash("삭제 실패");
    }
  };

  const generateVCard = (c: Contact): string => {
    const nameParts = c.name.length >= 2 ? `${c.name.slice(0, 1)};${c.name.slice(1)}` : `;${c.name}`;
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `N:${nameParts}`,
      `FN:${c.name}`,
      c.department ? `ORG:${c.department}` : "",
      c.position ? `TITLE:${c.position}` : "",
      c.phone ? `TEL;TYPE=WORK:${c.phone}` : "",
      c.email ? `EMAIL:${c.email}` : "",
      "END:VCARD",
    ].filter(Boolean);
    return lines.join("\r\n");
  };

  const downloadVcf = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportSingle = (c: Contact) => {
    downloadVcf(generateVCard(c), `${c.name}.vcf`);
    flash(`${c.name} 연락처를 내보냈습니다`);
  };

  const exportAll = () => {
    if (filtered.length === 0) { flash("내보낼 연락처가 없습니다"); return; }
    const vcards = filtered.map(c => generateVCard(c)).join("\r\n");
    downloadVcf(vcards, "연락처_전체.vcf");
    flash(`${filtered.length}건의 연락처를 내보냈습니다`);
  };

  const departments = useMemo(
    () => [...new Set(contacts.map((c) => c.department).filter(Boolean))].sort(),
    [contacts]
  );

  const POSITION_ORDER: Record<string, number> = { "대표": 0, "이사": 1, "팀장": 2, "부장": 3, "차장": 4, "과장": 5, "대리": 6, "사원": 7, "팀원": 8, "인턴": 9 };
  const posRank = (pos: string) => {
    for (const [key, val] of Object.entries(POSITION_ORDER)) { if (pos.includes(key)) return val; }
    return 99;
  };

  const filtered = useMemo(() => {
    let r = contacts;
    if (deptFilter) r = r.filter((c) => c.department === deptFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.department.toLowerCase().includes(q) ||
          c.position.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q)
      );
    }
    return [...r].sort((a, b) => posRank(a.position) - posRank(b.position));
  }, [contacts, search, deptFilter]);

  // Org chart: group by department
  const orgGroups = useMemo(() => {
    const map: Record<string, Contact[]> = {};
    contacts.forEach((c) => {
      const dept = c.department || "미지정";
      if (!map[dept]) map[dept] = [];
      map[dept].push(c);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [contacts]);

  return (
    <div className="space-y-6">
      {/* ── 명함 보기 모달 ── */}
      {showCardModal && cardContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowCardModal(false)}>
          <div className="w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            {/* 명함 카드 */}
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* 상단 파란 악센트 라인 */}
              <div className="h-2 bg-gradient-to-r from-[#3182F6] to-[#1B64DA]" />
              <div className="p-8">
                {/* 회사명 */}
                <div className="mb-6">
                  <h2 className="text-2xl font-extrabold tracking-tight text-[#3182F6]">{cardExtraData.company}</h2>
                </div>
                {/* 이름/직책/부서 */}
                <div className="mb-6">
                  <p className="text-xl font-bold text-slate-900">{cardContact.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {cardContact.position && <span className="text-sm text-slate-600 font-medium">{cardContact.position}</span>}
                    {cardContact.position && cardContact.department && <span className="text-slate-300">|</span>}
                    {cardContact.department && <span className="text-sm text-slate-500">{cardContact.department}</span>}
                  </div>
                  {cardExtraData.motto && (
                    <p className="text-xs text-slate-400 italic mt-2">&ldquo;{cardExtraData.motto}&rdquo;</p>
                  )}
                </div>
                {/* 구분선 */}
                <div className="border-t border-slate-100 mb-5" />
                {/* 연락처 정보 */}
                <div className="space-y-2.5 text-sm">
                  {cardContact.phone && (
                    <div className="flex items-center gap-3">
                      <span className="w-14 text-xs font-semibold text-slate-400 uppercase tracking-wide">Tel</span>
                      <span className="text-slate-700">{cardContact.phone}</span>
                    </div>
                  )}
                  {cardContact.email && (
                    <div className="flex items-center gap-3">
                      <span className="w-14 text-xs font-semibold text-slate-400 uppercase tracking-wide">Email</span>
                      <span className="text-slate-700">{cardContact.email}</span>
                    </div>
                  )}
                  {cardExtraData.fax && (
                    <div className="flex items-center gap-3">
                      <span className="w-14 text-xs font-semibold text-slate-400 uppercase tracking-wide">Fax</span>
                      <span className="text-slate-700">{cardExtraData.fax}</span>
                    </div>
                  )}
                  {cardExtraData.address && (
                    <div className="flex items-center gap-3">
                      <span className="w-14 text-xs font-semibold text-slate-400 uppercase tracking-wide">Addr</span>
                      <span className="text-slate-700">{cardExtraData.address}</span>
                    </div>
                  )}
                </div>
                {/* QR 코드 플레이스홀더 */}
                <div className="mt-6 flex justify-end">
                  <div className="w-16 h-16 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-300">QR</span>
                  </div>
                </div>
              </div>
            </div>
            {/* 모달 버튼 */}
            <div className="flex gap-2 mt-4">
              <button
                className={`${B} flex-1 !text-sm !py-2.5`}
                onClick={() => shareCard(cardContact, cardExtraData)}
              >
                명함 공유
              </button>
              <button
                className={`${B2} flex-1 !text-sm !py-2.5`}
                onClick={() => setShowCardModal(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 내 명함 편집 모달 ── */}
      {showMyCardEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowMyCardEdit(false)}>
          <div className="w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="h-2 bg-gradient-to-r from-[#3182F6] to-[#1B64DA]" />
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-5">내 명함 편집</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={L}>회사명</label>
                  <input className={I} value={myCardData.company} onChange={e => setMyCardData({ ...myCardData, company: e.target.value })} />
                </div>
                <div>
                  <label className={L}>이름</label>
                  <input className={I} value={myCardData.name} onChange={e => setMyCardData({ ...myCardData, name: e.target.value })} />
                </div>
                <div>
                  <label className={L}>직책</label>
                  <input className={I} value={myCardData.position} onChange={e => setMyCardData({ ...myCardData, position: e.target.value })} />
                </div>
                <div>
                  <label className={L}>부서</label>
                  <input className={I} value={myCardData.department} onChange={e => setMyCardData({ ...myCardData, department: e.target.value })} />
                </div>
                <div>
                  <label className={L}>전화번호</label>
                  <input className={I} placeholder="010-0000-0000" value={myCardData.phone} onChange={e => setMyCardData({ ...myCardData, phone: e.target.value })} />
                </div>
                <div>
                  <label className={L}>이메일</label>
                  <input className={I} placeholder="email@vela.com" value={myCardData.email} onChange={e => setMyCardData({ ...myCardData, email: e.target.value })} />
                </div>
                <div>
                  <label className={L}>팩스</label>
                  <input className={I} placeholder="02-000-0000" value={myCardData.fax} onChange={e => setMyCardData({ ...myCardData, fax: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className={L}>주소</label>
                  <input className={I} placeholder="서울특별시..." value={myCardData.address} onChange={e => setMyCardData({ ...myCardData, address: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className={L}>좌우명</label>
                  <input className={I} placeholder="나의 좌우명 / 한 마디" value={myCardData.motto} onChange={e => setMyCardData({ ...myCardData, motto: e.target.value })} />
                </div>
              </div>

              {/* 미리보기 */}
              <div className="mt-6 border border-slate-200 rounded-2xl overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-[#3182F6] to-[#1B64DA]" />
                <div className="p-5">
                  <p className="text-lg font-extrabold text-[#3182F6] mb-2">{myCardData.company || "VELA"}</p>
                  <p className="text-base font-bold text-slate-900">{myCardData.name || userName}</p>
                  <p className="text-xs text-slate-500">
                    {[myCardData.position, myCardData.department].filter(Boolean).join(" | ")}
                  </p>
                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    {myCardData.phone && <p>TEL {myCardData.phone}</p>}
                    {myCardData.email && <p>EMAIL {myCardData.email}</p>}
                    {myCardData.fax && <p>FAX {myCardData.fax}</p>}
                    {myCardData.address && <p>ADDR {myCardData.address}</p>}
                  </div>
                  {myCardData.motto && <p className="mt-2 text-[11px] text-slate-400 italic">&ldquo;{myCardData.motto}&rdquo;</p>}
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button className={`${B} flex-1`} onClick={saveMyCard} disabled={myCardLoading}>
                  {myCardLoading ? "저장 중..." : "저장"}
                </button>
                <button className={`${B2} flex-1`} onClick={() => setShowMyCardEdit(false)}>
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className={C}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <input
              className={I}
              placeholder="이름, 부서, 직책, 이메일로 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className={`${I} !w-auto min-w-[140px]`}
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="">전체 부서</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button
              className={B2}
              onClick={() => { loadMyCard(); setShowMyCardEdit(true); }}
            >
              내 명함 편집
            </button>
            <button
              className={B2}
              onClick={exportAll}
            >
              전체 내보내기
            </button>
            <div className="flex rounded-xl overflow-hidden border border-slate-200">
              <button
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  view === "grid"
                    ? "bg-[#3182F6] text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
                onClick={() => setView("grid")}
              >
                카드
              </button>
              <button
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  view === "org"
                    ? "bg-[#3182F6] text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
                onClick={() => setView("org")}
              >
                조직도
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add form */}
      <div className={C}>
        <h3 className="text-lg font-bold text-slate-800 mb-4">연락처 추가</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={L}>이름</label>
            <input
              className={I}
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className={L}>부서</label>
            <input
              className={I}
              placeholder="부서"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>
          <div>
            <label className={L}>직책</label>
            <input
              className={I}
              placeholder="직책"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
          </div>
          <div>
            <label className={L}>전화번호</label>
            <input
              className={I}
              placeholder="010-0000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className={L}>이메일</label>
            <input
              className={I}
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className={L}>내선번호</label>
            <input
              className={I}
              placeholder="내선번호"
              value={extension}
              onChange={(e) => setExtension(e.target.value)}
            />
          </div>
          <div>
            <label className={L}>연락처</label>
            <input
              className={I}
              placeholder="010-0000-0000"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={L}>집주소</label>
            <input
              className={I}
              placeholder="서울특별시..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>
        <button className={`${B} mt-4`} onClick={add}>
          추가
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-sm text-slate-400 py-12 text-center">불러오는 중...</p>
      ) : view === "grid" ? (
        /* Card grid */
        filtered.length === 0 ? (
          <p className="text-sm text-slate-400 py-12 text-center">
            연락처가 없습니다
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <div key={c.id} className="group bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative">
                {/* 관리자 버튼 */}
                {isAdmin && (
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(c)} className="text-xs text-slate-300 hover:text-[#3182F6]">✏️</button>
                    <button onClick={() => remove(c.id)} className="text-xs text-slate-300 hover:text-red-500">✕</button>
                  </div>
                )}

                {/* 수정 모드 */}
                {editingId === c.id ? (
                  <div className="space-y-2">
                    <input className={`${I} !text-xs`} placeholder="이름" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                    <div className="grid grid-cols-2 gap-2">
                      <input className={`${I} !text-xs`} placeholder="부서/팀" value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })} />
                      <input className={`${I} !text-xs`} placeholder="직책" value={editForm.position} onChange={e => setEditForm({ ...editForm, position: e.target.value })} />
                    </div>
                    <input className={`${I} !text-xs`} placeholder="전화번호" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                    <input className={`${I} !text-xs`} placeholder="연락처" value={editForm.mobile} onChange={e => setEditForm({ ...editForm, mobile: e.target.value })} />
                    <input className={`${I} !text-xs`} placeholder="이메일" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                    <input className={`${I} !text-xs`} placeholder="내선번호" value={editForm.extension} onChange={e => setEditForm({ ...editForm, extension: e.target.value })} />
                    <input className={`${I} !text-xs`} placeholder="집주소" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
                    <div className="flex gap-2">
                      <button className={`${B} !text-xs !px-3 !py-1.5`} onClick={saveEdit}>저장</button>
                      <button className={`${B2} !text-xs !px-3 !py-1.5`} onClick={() => setEditingId(null)}>취소</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-bold ${avatarColor(c.name)}`}>
                        {c.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800">{c.name}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {c.position && `${c.position}`}
                          {c.position && c.department && " · "}
                          {c.department}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-500">
                      {c.phone && <div className="flex items-center gap-2"><span className="text-slate-300">📱</span><span>{c.phone}</span></div>}
                      {c.mobile && <div className="flex items-center gap-2"><span className="text-slate-300">📞</span><span>{c.mobile}</span></div>}
                      {c.email && <div className="flex items-center gap-2"><span className="text-slate-300">✉️</span><span className="truncate">{c.email}</span></div>}
                      {c.extension && <div className="flex items-center gap-2"><span className="text-slate-300">☎️</span><span>내선 {c.extension}</span></div>}
                      {c.address && <div className="flex items-center gap-2"><span className="text-slate-300">🏠</span><span className="truncate">{c.address}</span></div>}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); viewCard(c); }}
                        className="flex-1 text-xs font-semibold text-[#3182F6] bg-blue-50 hover:bg-blue-100 rounded-lg py-1.5 transition-colors"
                      >
                        명함 보기
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); exportSingle(c); }}
                        className="flex-1 text-xs font-semibold text-slate-400 hover:text-[#3182F6] bg-slate-50 hover:bg-blue-50 rounded-lg py-1.5 transition-colors"
                      >
                        내보내기
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        /* Org chart view */
        orgGroups.length === 0 ? (
          <p className="text-sm text-slate-400 py-12 text-center">
            연락처가 없습니다
          </p>
        ) : (
          <div className="space-y-4">
            {orgGroups.map(([dept, members]) => (
              <div key={dept} className={C}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-[#3182F6]" />
                  <h4 className="text-sm font-bold text-slate-800">{dept}</h4>
                  <span className="text-xs text-slate-400">
                    ({members.length}명)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pl-4 border-l-2 border-blue-100">
                  {members.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => viewCard(c)}
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor(
                          c.name
                        )}`}
                      >
                        {c.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">
                          {c.name}
                          {c.position && (
                            <span className="text-xs font-normal text-slate-400 ml-1.5">
                              {c.position}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {[c.phone, c.email].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
