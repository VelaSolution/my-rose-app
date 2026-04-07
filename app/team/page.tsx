"use client";

import { useEffect, useState, useCallback } from "react";
import UpgradeModal from "@/components/UpgradeModal";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { usePlan } from "@/lib/usePlan";

type TeamMember = {
  id: string;
  member_email: string;
  role: string;
  status: string;
  created_at: string;
};

const ROLE_LABEL: Record<string, string> = {
  owner: "소유자",
  admin: "관리자",
  editor: "편집자",
  viewer: "뷰어",
};

const STATUS_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: "초대 대기", bg: "bg-amber-100", text: "text-amber-700" },
  accepted: { label: "수락됨", bg: "bg-green-100", text: "text-green-700" },
  declined: { label: "거절됨", bg: "bg-red-100", text: "text-red-700" },
};

export default function TeamPage() {
  const { plan, userId, loading: planLoading } = usePlan();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const maxMembers = 10;
  const isPro = plan === "pro";

  // Get active store from localStorage
  const getActiveStoreId = (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("vela-active-store");
  };

  const fetchMembers = useCallback(async () => {
    const storeId = getActiveStoreId();
    if (!storeId || !userId) return;
    const sb = createSupabaseBrowserClient();
    const { data } = await sb
      .from("team_members")
      .select("id, member_email, role, status, created_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: true });
    setMembers((data ?? []) as TeamMember[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (planLoading) return;
    if (!userId) {
      setLoading(false);
      return;
    }
    // If not pro, don't bother fetching
    if (!isPro) {
      setLoading(false);
      setShowUpgrade(true);
      return;
    }
    const storeId = getActiveStoreId();
    if (!storeId) {
      setLoading(false);
      return;
    }
    fetchMembers();
  }, [planLoading, userId, isPro, fetchMembers]);

  const handleInvite = async () => {
    setError(null);
    const storeId = getActiveStoreId();
    if (!storeId) {
      setError("먼저 다점포 관리에서 활성 매장을 선택해주세요.");
      return;
    }
    if (!inviteEmail.trim()) return;
    // Simple email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
      setError("올바른 이메일 주소를 입력해주세요.");
      return;
    }
    if (members.length >= maxMembers) {
      setError("팀 멤버는 최대 10명까지 초대할 수 있습니다.");
      return;
    }
    // Check for duplicate
    if (members.some((m) => m.member_email === inviteEmail.trim())) {
      setError("이미 초대된 이메일입니다.");
      return;
    }

    setInviting(true);
    const sb = createSupabaseBrowserClient();
    const { error: insertError } = await sb.from("team_members").insert({
      store_id: storeId,
      inviter_id: userId,
      member_email: inviteEmail.trim(),
      role: "viewer",
      status: "pending",
    });
    if (insertError) {
      setError("초대에 실패했습니다. 다시 시도해주세요.");
    } else {
      // 초대 이메일 발송
      fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), storeName: "VELA 매장" }),
      }).catch(() => {});
      setInviteEmail("");
      await fetchMembers();
    }
    setInviting(false);
  };

  const handleRemove = async (id: string) => {
    if (!confirm("이 멤버를 삭제하시겠습니까?")) return;
    setRemoving(id);
    const sb = createSupabaseBrowserClient();
    await sb.from("team_members").delete().eq("id", id);
    await fetchMembers();
    setRemoving(null);
  };

  const fmtDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  };

  if (planLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 pt-24 pb-16 space-y-4 animate-pulse">
          <div className="h-8 bg-slate-200 rounded-2xl w-48" />
          <div className="h-40 bg-slate-200 rounded-3xl" />
          <div className="h-20 bg-slate-200 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 pt-24 pb-16 text-center">
          <p className="text-slate-500 text-lg mt-20">로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  const storeId = getActiveStoreId();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 pt-24 pb-16 md:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">팀 멤버 관리</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isPro
              ? `팀 멤버 ${members.length}/${maxMembers}명`
              : "Pro 요금제에서 팀 멤버를 초대할 수 있습니다."}
          </p>
        </div>

        {!isPro ? (
          // Non-pro users see a prompt
          <div className="rounded-3xl bg-white ring-1 ring-slate-200 p-12 text-center shadow-sm">
            <div className="text-4xl mb-3">👥</div>
            <p className="text-slate-700 font-semibold mb-2">팀 멤버 초대는 Pro 기능입니다</p>
            <p className="text-slate-500 text-sm mb-5">
              Pro 요금제로 업그레이드하면 매장당 최대 10명의 팀 멤버를 초대할 수 있습니다.
            </p>
            <button
              onClick={() => setShowUpgrade(true)}
              className="rounded-2xl bg-blue-600 text-white text-sm font-semibold px-6 py-3 hover:bg-blue-700 transition"
            >
              Pro 업그레이드 보기
            </button>
          </div>
        ) : !storeId ? (
          // No active store selected
          <div className="rounded-3xl bg-white ring-1 ring-slate-200 p-12 text-center shadow-sm">
            <div className="text-4xl mb-3">🏪</div>
            <p className="text-slate-700 font-semibold mb-2">활성 매장을 선택해주세요</p>
            <p className="text-slate-500 text-sm mb-5">
              팀 멤버를 초대하려면 먼저 다점포 관리에서 매장을 선택해야 합니다.
            </p>
            <a
              href="/stores"
              className="inline-block rounded-2xl bg-blue-600 text-white text-sm font-semibold px-6 py-3 hover:bg-blue-700 transition"
            >
              매장 관리로 이동
            </a>
          </div>
        ) : (
          <>
            {/* Invite Form */}
            <div className="rounded-3xl bg-white ring-1 ring-slate-200 p-6 mb-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">멤버 초대</h2>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => { setInviteEmail(e.target.value); setError(null); }}
                  placeholder="이메일 주소 입력"
                  onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim() || inviting}
                  className="rounded-xl bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {inviting ? "초대 중..." : "초대하기"}
                </button>
              </div>
              {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            </div>

            {/* Member List */}
            {members.length === 0 ? (
              <div className="rounded-3xl bg-white ring-1 ring-slate-200 p-12 text-center shadow-sm">
                <div className="text-4xl mb-3">👥</div>
                <p className="text-slate-500 text-sm">아직 초대된 팀 멤버가 없습니다.</p>
                <p className="text-slate-400 text-xs mt-1">위 양식에서 이메일을 입력하여 팀 멤버를 초대하세요.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => {
                  const statusInfo = STATUS_STYLE[member.status] ?? STATUS_STYLE.pending;
                  return (
                    <div
                      key={member.id}
                      className="rounded-3xl bg-white ring-1 ring-slate-200 p-5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg">
                            👤
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm">{member.member_email}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-500">
                                {ROLE_LABEL[member.role] ?? member.role}
                              </span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.text}`}>
                                {statusInfo.label}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 hidden sm:inline">{fmtDate(member.created_at)}</span>
                          <button
                            onClick={() => handleRemove(member.id)}
                            disabled={removing === member.id}
                            className="text-xs text-red-400 hover:text-red-600 transition font-medium disabled:opacity-50"
                          >
                            {removing === member.id ? "삭제 중..." : "삭제"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Capacity notice */}
            {members.length >= maxMembers && (
              <div className="mt-4 rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-4 text-center">
                <p className="text-sm text-amber-800">
                  팀 멤버 최대 인원(10명)에 도달했습니다.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        title="팀 멤버 초대는 Pro 기능입니다"
        description="Pro 요금제로 업그레이드하면 매장당 최대 10명의 팀 멤버를 초대하여 함께 매장을 관리할 수 있습니다."
      />
    </div>
  );
}
