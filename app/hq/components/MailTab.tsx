"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { HQRole } from "@/app/hq/types";
import { sb, I, C, L, B, B2, BADGE, fmt, today, useTeamDisplayNames } from "@/app/hq/utils";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

type Folder = "받은편지함" | "보낸편지함" | "중요" | "임시보관함" | "휴지통";

interface Mail {
  id: string;
  from_name: string;
  to_name: string;
  subject: string;
  body: string;
  read: boolean;
  starred: boolean;
  folder: string;
  attachments: { name: string; url: string }[] | null;
  created_at: string;
  read_at: string | null;
}

type TeamMember = { name: string; hqRole: string };

interface MailSignature {
  name: string;
  position: string;
  phone: string;
  email: string;
  company: string;
  customHtml: string;
}

// ── Auto-classification rule types ──
interface MailRule {
  id: string;
  conditionField: "from_name" | "subject" | "body";
  conditionValue: string;
  targetFolder: string;
}

// ── OOO (Out of Office) types ──
interface OOOSetting {
  active: boolean;
  start: string;
  end: string;
  message: string;
}

const DEFAULT_FOLDERS: { key: Folder; icon: string }[] = [
  { key: "받은편지함", icon: "📥" },
  { key: "보낸편지함", icon: "📤" },
  { key: "중요", icon: "⭐" },
  { key: "임시보관함", icon: "📝" },
  { key: "휴지통", icon: "🗑️" },
];

const DEFAULT_SIGNATURE: MailSignature = {
  name: "",
  position: "",
  phone: "",
  email: "",
  company: "",
  customHtml: "",
};

function buildSignatureText(sig: MailSignature): string {
  if (sig.customHtml.trim()) return sig.customHtml;
  const lines: string[] = ["--"];
  if (sig.name) lines.push(sig.name);
  if (sig.position) lines.push(sig.position);
  if (sig.company) lines.push(sig.company);
  if (sig.phone) lines.push(`Tel: ${sig.phone}`);
  if (sig.email) lines.push(`Email: ${sig.email}`);
  if (lines.length <= 1) return "";
  return "\n\n" + lines.join("\n");
}

function loadSignature(): MailSignature {
  if (typeof window === "undefined") return DEFAULT_SIGNATURE;
  try {
    const raw = localStorage.getItem("hq_mail_signature");
    if (raw) return { ...DEFAULT_SIGNATURE, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_SIGNATURE;
}

function saveSignature(sig: MailSignature) {
  if (typeof window === "undefined") return;
  localStorage.setItem("hq_mail_signature", JSON.stringify(sig));
}

// ── Rule helpers ──
function loadRules(): MailRule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("hq_mail_rules");
    if (raw) return JSON.parse(raw) as MailRule[];
  } catch { /* ignore */ }
  return [];
}

function saveRules(rules: MailRule[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("hq_mail_rules", JSON.stringify(rules));
}

function loadCustomFolders(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("hq_mail_custom_folders");
    if (raw) return JSON.parse(raw) as string[];
  } catch { /* ignore */ }
  return [];
}

function saveCustomFolders(folders: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("hq_mail_custom_folders", JSON.stringify(folders));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function MailTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const [mails, setMails] = useState<Mail[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<string>("받은편지함");
  const [selectedMail, setSelectedMail] = useState<Mail | null>(null);
  const [search, setSearch] = useState("");
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Compose state
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeAttachments, setComposeAttachments] = useState<File[]>([]);
  const [replyMode, setReplyMode] = useState<"reply" | "forward" | null>(null);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [toSearch, setToSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // AI Draft state
  const [showAiDraft, setShowAiDraft] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiTone, setAiTone] = useState<"공식" | "친근" | "간결">("공식");
  const [aiLoading, setAiLoading] = useState(false);

  // AI Summary state
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(true);

  // Signature state
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signature, setSignature] = useState<MailSignature>(DEFAULT_SIGNATURE);
  const [sigEditing, setSigEditing] = useState<MailSignature>(DEFAULT_SIGNATURE);
  const [includeSignature, setIncludeSignature] = useState(true);

  // Rule state
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [rules, setRules] = useState<MailRule[]>([]);
  const [ruleEditing, setRuleEditing] = useState<MailRule | null>(null);
  const [ruleCondField, setRuleCondField] = useState<MailRule["conditionField"]>("from_name");
  const [ruleCondValue, setRuleCondValue] = useState("");
  const [ruleTargetFolder, setRuleTargetFolder] = useState("");
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState("");

  // OOO state
  const [showOOOModal, setShowOOOModal] = useState(false);
  const [oooActive, setOooActive] = useState(false);
  const [oooStart, setOooStart] = useState("");
  const [oooEnd, setOooEnd] = useState("");
  const [oooMessage, setOooMessage] = useState("");
  const [oooUsers, setOooUsers] = useState<Record<string, OOOSetting>>({});

  // Load signature from localStorage on mount
  useEffect(() => {
    const saved = loadSignature();
    setSignature(saved);
    setSigEditing(saved);
    setRules(loadRules());
    setCustomFolders(loadCustomFolders());
  }, []);

  // Load OOO settings for all users
  const loadOOOSettings = useCallback(async () => {
    const s = sb();
    if (!s) return;
    const { data } = await s.from("hq_settings").select("key, value").like("key", "mail_ooo_%");
    if (data) {
      const map: Record<string, OOOSetting> = {};
      for (const row of data) {
        const name = row.key.replace("mail_ooo_", "");
        try {
          map[name] = JSON.parse(row.value);
        } catch { /* ignore */ }
      }
      setOooUsers(map);
      // Load own OOO
      if (map[userName]) {
        setOooActive(map[userName].active);
        setOooStart(map[userName].start);
        setOooEnd(map[userName].end);
        setOooMessage(map[userName].message);
      }
    }
  }, [userName]);

  // Check if user has active OOO right now
  const isOOOActive = (name: string): boolean => {
    const setting = oooUsers[name];
    if (!setting || !setting.active) return false;
    const now = new Date();
    const start = new Date(setting.start);
    const end = new Date(setting.end + "T23:59:59");
    return now >= start && now <= end;
  };

  // Apply auto-classification rules to inbox mails
  const applyRules = useCallback(async (mailList: Mail[]) => {
    const currentRules = loadRules();
    if (currentRules.length === 0) return;
    const s = sb();
    if (!s) return;

    for (const mail of mailList) {
      if (mail.to_name !== userName) continue;
      if (mail.folder === "휴지통" || mail.folder === "임시보관함") continue;

      for (const rule of currentRules) {
        const fieldValue = mail[rule.conditionField]?.toLowerCase() || "";
        if (fieldValue.includes(rule.conditionValue.toLowerCase())) {
          // Move to target folder
          if (mail.folder !== rule.targetFolder) {
            await s.from("hq_mail").update({ folder: rule.targetFolder }).eq("id", mail.id);
            mail.folder = rule.targetFolder;
          }
          break; // First matching rule wins
        }
      }
    }
  }, [userName]);

  const load = async () => {
    const s = sb();
    if (!s) return setLoading(false);
    const [{ data: mailData }, { data: teamData }] = await Promise.all([
      s.from("hq_mail").select("*").or(`to_name.eq.${userName},from_name.eq.${userName}`).order("created_at", { ascending: false }),
      s.from("hq_team").select("name, hq_role").order("name", { ascending: true }),
    ]);
    if (mailData) {
      const typedMails = mailData as Mail[];
      await applyRules(typedMails);
      setMails(typedMails);
    }
    if (teamData) setTeamMembers((teamData as any[]).map(m => ({ name: m.name, hqRole: m.hq_role ?? "팀원" })));
    setLoading(false);
  };

  useEffect(() => {
    load();
    loadOOOSettings();
  }, []);

  // Build combined folder list (default + custom)
  const allFolders: { key: string; icon: string }[] = [
    ...DEFAULT_FOLDERS,
    ...customFolders.map(f => ({ key: f, icon: "📁" })),
  ];

  const folderMails = mails.filter(m => {
    if (activeFolder === "받은편지함") return m.to_name === userName && (m.folder === "받은편지함" || !m.folder) && m.folder !== "휴지통";
    if (activeFolder === "보낸편지함") return m.from_name === userName && m.folder !== "휴지통" && m.folder !== "임시보관함" && !customFolders.includes(m.folder);
    if (activeFolder === "중요") return m.starred && m.folder !== "휴지통" && (m.to_name === userName || m.from_name === userName);
    if (activeFolder === "임시보관함") return m.folder === "임시보관함" && m.from_name === userName;
    if (activeFolder === "휴지통") return m.folder === "휴지통" && (m.to_name === userName || m.from_name === userName);
    // Custom folder
    return m.folder === activeFolder && (m.to_name === userName || m.from_name === userName);
  });

  const filtered = folderMails.filter(m => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return m.subject.toLowerCase().includes(q) || m.from_name.toLowerCase().includes(q) || m.to_name.toLowerCase().includes(q);
  });

  const unreadCount = mails.filter(m => m.to_name === userName && !m.read && m.folder !== "휴지통").length;

  const resetCompose = () => {
    setComposeTo("");
    setComposeSubject("");
    setComposeBody("");
    setComposeAttachments([]);
    setReplyMode(null);
    setToSearch("");
    setShowToDropdown(false);
    setIncludeSignature(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const openCompose = () => {
    resetCompose();
    setShowCompose(true);
  };

  const openReply = (mail: Mail) => {
    resetCompose();
    setReplyMode("reply");
    setComposeTo(mail.from_name);
    setComposeSubject(`Re: ${mail.subject.replace(/^Re:\s*/i, "")}`);
    setComposeBody(`\n\n--- 원본 메시지 ---\n보낸사람: ${mail.from_name}\n날짜: ${formatDate(mail.created_at)}\n\n${mail.body}`);
    setShowCompose(true);
  };

  const openForward = (mail: Mail) => {
    resetCompose();
    setReplyMode("forward");
    setComposeTo("");
    setComposeSubject(`Fwd: ${mail.subject.replace(/^Fwd:\s*/i, "")}`);
    setComposeBody(`\n\n--- 전달된 메시지 ---\n보낸사람: ${mail.from_name}\n받는사람: ${mail.to_name}\n날짜: ${formatDate(mail.created_at)}\n\n${mail.body}`);
    setShowCompose(true);
  };

  const sendMail = async () => {
    if (!composeTo.trim()) return flash("받는 사람을 선택하세요");
    if (!composeSubject.trim()) return flash("제목을 입력하세요");
    const s = sb();
    if (!s) return;

    let attachments: { name: string; url: string }[] | null = null;
    if (composeAttachments.length > 0) {
      attachments = [];
      for (const file of composeAttachments) {
        const path = `mail/${Date.now()}_${file.name}`;
        const { error: ue } = await s.storage.from("hq-files").upload(path, file);
        if (!ue) {
          const { data: { publicUrl } } = s.storage.from("hq-files").getPublicUrl(path);
          attachments.push({ name: file.name, url: publicUrl });
        }
      }
    }

    // 서명 추가
    let finalBody = composeBody.trim();
    if (includeSignature) {
      const sigText = buildSignatureText(signature);
      if (sigText) finalBody += sigText;
    }

    const { error } = await s.from("hq_mail").insert({
      from_name: userName,
      to_name: composeTo.trim(),
      subject: composeSubject.trim(),
      body: finalBody,
      read: false,
      starred: false,
      folder: "받은편지함",
      attachments: attachments,
      created_at: new Date().toISOString(),
      read_at: null,
    });
    if (error) return flash("전송 실패: " + error.message);

    // OOO auto-reply: check if recipient has active OOO
    const recipientName = composeTo.trim();
    if (isOOOActive(recipientName)) {
      const ooo = oooUsers[recipientName];
      await s.from("hq_mail").insert({
        from_name: recipientName,
        to_name: userName,
        subject: `Re: ${composeSubject.trim()} [자동응답]`,
        body: ooo.message,
        read: false,
        starred: false,
        folder: "받은편지함",
        attachments: null,
        created_at: new Date().toISOString(),
        read_at: null,
      });
    }

    flash("메일이 전송되었습니다");
    setShowCompose(false);
    resetCompose();
    load();
  };

  const saveDraft = async () => {
    const s = sb();
    if (!s) return;
    const { error } = await s.from("hq_mail").insert({
      from_name: userName,
      to_name: composeTo.trim() || userName,
      subject: composeSubject.trim() || "(제목 없음)",
      body: composeBody.trim(),
      read: true,
      starred: false,
      folder: "임시보관함",
      attachments: null,
      created_at: new Date().toISOString(),
      read_at: null,
    });
    if (error) return flash("저장 실패: " + error.message);
    flash("임시보관함에 저장되었습니다");
    setShowCompose(false);
    resetCompose();
    load();
  };

  const toggleRead = async (mail: Mail) => {
    const s = sb();
    if (!s) return;
    await s.from("hq_mail").update({ read: !mail.read }).eq("id", mail.id);
    flash(mail.read ? "읽지 않음으로 표시" : "읽음으로 표시");
    load();
  };

  const toggleStar = async (mail: Mail) => {
    const s = sb();
    if (!s) return;
    await s.from("hq_mail").update({ starred: !mail.starred }).eq("id", mail.id);
    load();
  };

  const moveToTrash = async (mail: Mail) => {
    const s = sb();
    if (!s) return;
    await s.from("hq_mail").update({ folder: "휴지통" }).eq("id", mail.id);
    flash("휴지통으로 이동했습니다");
    setSelectedMail(null);
    load();
  };

  const deletePermanently = async (mail: Mail) => {
    if (!confirm("영구 삭제하시겠습니까?")) return;
    const s = sb();
    if (!s) return;
    await s.from("hq_mail").delete().eq("id", mail.id);
    flash("영구 삭제되었습니다");
    setSelectedMail(null);
    load();
  };

  const markAsRead = async (mail: Mail) => {
    if (mail.to_name !== userName) return;
    const s = sb();
    if (!s) return;
    const updates: Record<string, any> = {};
    if (!mail.read) updates.read = true;
    // Set read_at for read receipt
    if (!mail.read_at) updates.read_at = new Date().toISOString();
    if (Object.keys(updates).length === 0) return;
    await s.from("hq_mail").update(updates).eq("id", mail.id);
    load();
  };

  const selectMail = (mail: Mail) => {
    setSelectedMail(mail);
    setMobileShowDetail(true);
    setAiSummary(null);
    setShowSummary(true);
    markAsRead(mail);
  };

  // Signature handlers
  const openSignatureModal = () => {
    setSigEditing({ ...signature });
    setShowSignatureModal(true);
  };

  const saveSignatureHandler = () => {
    setSignature(sigEditing);
    saveSignature(sigEditing);
    setShowSignatureModal(false);
    flash("서명이 저장되었습니다");
  };

  // AI Draft handler
  const generateAiDraft = async () => {
    if (!aiTopic.trim()) return flash("주제/키워드를 입력하세요");
    setAiLoading(true);
    try {
      const toneMap = { "공식": "공식적이고 격식있는", "친근": "친근하고 따뜻한", "간결": "간결하고 핵심만 전달하는" };
      const systemPrompt = `당신은 비즈니스 메일 작성 도우미입니다. 사용자가 제공하는 주제와 키워드를 바탕으로 ${toneMap[aiTone]} 톤으로 메일 본문을 작성하세요. 인사말과 마무리를 포함하되, 제목은 포함하지 마세요. 서명도 포함하지 마세요. 한국어로 작성하세요.`;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `다음 주제로 메일을 작성해주세요: ${aiTopic}` }],
          context: { isAnonymousConsult: false, systemOverride: systemPrompt },
        }),
      });
      if (!res.ok) throw new Error("AI 응답 오류");
      const reader = res.body?.getReader();
      if (!reader) throw new Error("스트림 없음");
      const decoder = new TextDecoder();
      let result = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
      }
      setComposeBody(prev => prev ? prev + "\n\n" + result : result);
      setShowAiDraft(false);
      setAiTopic("");
      flash("AI 초안이 삽입되었습니다");
    } catch (e) {
      flash("AI 초안 생성 실패");
    }
    setAiLoading(false);
  };

  // AI Summary handler
  const generateAiSummary = async (mail: Mail) => {
    if (aiSummaryLoading) return;
    setAiSummaryLoading(true);
    setAiSummary(null);
    setShowSummary(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `다음 메일 내용을 2-3개의 핵심 요점(bullet point)으로 요약해주세요. 각 요점은 "- "로 시작하세요:\n\n제목: ${mail.subject}\n\n${mail.body}` }],
          context: { isAnonymousConsult: false },
        }),
      });
      if (!res.ok) throw new Error("AI 응답 오류");
      const reader = res.body?.getReader();
      if (!reader) throw new Error("스트림 없음");
      const decoder = new TextDecoder();
      let result = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
      }
      setAiSummary(result);
    } catch (e) {
      flash("AI 요약 생성 실패");
    }
    setAiSummaryLoading(false);
  };

  // Rule handlers
  const openRuleModal = () => {
    setRules(loadRules());
    setRuleEditing(null);
    resetRuleForm();
    setShowRuleModal(true);
  };

  const resetRuleForm = () => {
    setRuleCondField("from_name");
    setRuleCondValue("");
    setRuleTargetFolder("");
    setRuleEditing(null);
  };

  const saveRule = () => {
    if (!ruleCondValue.trim()) return flash("조건 값을 입력하세요");
    if (!ruleTargetFolder.trim()) return flash("대상 폴더를 선택하세요");

    const updated = [...rules];
    if (ruleEditing) {
      const idx = updated.findIndex(r => r.id === ruleEditing.id);
      if (idx >= 0) {
        updated[idx] = { ...ruleEditing, conditionField: ruleCondField, conditionValue: ruleCondValue.trim(), targetFolder: ruleTargetFolder };
      }
    } else {
      updated.push({
        id: generateId(),
        conditionField: ruleCondField,
        conditionValue: ruleCondValue.trim(),
        targetFolder: ruleTargetFolder,
      });
    }
    setRules(updated);
    saveRules(updated);
    resetRuleForm();
    flash(ruleEditing ? "규칙이 수정되었습니다" : "규칙이 추가되었습니다");
  };

  const deleteRule = (id: string) => {
    const updated = rules.filter(r => r.id !== id);
    setRules(updated);
    saveRules(updated);
    flash("규칙이 삭제되었습니다");
  };

  const editRule = (rule: MailRule) => {
    setRuleEditing(rule);
    setRuleCondField(rule.conditionField);
    setRuleCondValue(rule.conditionValue);
    setRuleTargetFolder(rule.targetFolder);
  };

  const addCustomFolder = () => {
    const name = newFolderName.trim();
    if (!name) return flash("폴더 이름을 입력하세요");
    if (DEFAULT_FOLDERS.some(f => f.key === name) || customFolders.includes(name)) return flash("이미 존재하는 폴더입니다");
    const updated = [...customFolders, name];
    setCustomFolders(updated);
    saveCustomFolders(updated);
    setNewFolderName("");
    flash(`"${name}" 폴더가 추가되었습니다`);
  };

  const removeCustomFolder = (name: string) => {
    const updated = customFolders.filter(f => f !== name);
    setCustomFolders(updated);
    saveCustomFolders(updated);
    flash(`"${name}" 폴더가 삭제되었습니다`);
  };

  // OOO handlers
  const openOOOModal = () => {
    setShowOOOModal(true);
  };

  const saveOOO = async () => {
    const s = sb();
    if (!s) return;
    const setting: OOOSetting = {
      active: oooActive,
      start: oooStart,
      end: oooEnd,
      message: oooMessage.trim(),
    };
    if (oooActive && (!oooStart || !oooEnd)) return flash("시작일과 종료일을 입력하세요");
    if (oooActive && !oooMessage.trim()) return flash("자동응답 메시지를 입력하세요");

    const key = `mail_ooo_${userName}`;
    // Upsert into hq_settings
    const { error } = await s.from("hq_settings").upsert({ key, value: JSON.stringify(setting) }, { onConflict: "key" });
    if (error) return flash("저장 실패: " + error.message);

    setOooUsers(prev => ({ ...prev, [userName]: setting }));
    setShowOOOModal(false);
    flash(oooActive ? "부재중 자동응답이 설정되었습니다" : "부재중 자동응답이 해제되었습니다");
  };

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
  }

  function formatFullDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("ko-KR", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function formatReadAt(dateStr: string) {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }

  const conditionFieldLabel = (f: MailRule["conditionField"]) => {
    switch (f) {
      case "from_name": return "보낸사람 포함";
      case "subject": return "제목 포함";
      case "body": return "본문 포함";
    }
  };

  const filteredTeamMembers = teamMembers.filter(m =>
    m.name !== userName && (!toSearch || m.name.includes(toSearch) || m.hqRole.includes(toSearch))
  );

  // Preview signature text
  const signaturePreview = buildSignatureText(sigEditing);

  // All available target folders for rules
  const allTargetFolders = [...DEFAULT_FOLDERS.map(f => f.key), ...customFolders];

  if (loading) {
    return (
      <div className={C}>
        <p className="text-sm text-slate-400 py-8 text-center">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">서명 설정</h3>
              <button onClick={() => setShowSignatureModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={L}>이름</label>
                  <input className={I} placeholder="홍길동"
                    value={sigEditing.name}
                    onChange={e => setSigEditing(prev => ({ ...prev, name: e.target.value }))} />
                </div>
                <div>
                  <label className={L}>직책</label>
                  <input className={I} placeholder="대리 / 과장 / 팀장 등"
                    value={sigEditing.position}
                    onChange={e => setSigEditing(prev => ({ ...prev, position: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={L}>전화번호</label>
                  <input className={I} placeholder="010-1234-5678"
                    value={sigEditing.phone}
                    onChange={e => setSigEditing(prev => ({ ...prev, phone: e.target.value }))} />
                </div>
                <div>
                  <label className={L}>이메일</label>
                  <input className={I} placeholder="user@company.com"
                    value={sigEditing.email}
                    onChange={e => setSigEditing(prev => ({ ...prev, email: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={L}>회사명</label>
                <input className={I} placeholder="주식회사 OO"
                  value={sigEditing.company}
                  onChange={e => setSigEditing(prev => ({ ...prev, company: e.target.value }))} />
              </div>
              <div>
                <label className={L}>커스텀 서명 (직접 입력 시 위 필드 무시)</label>
                <textarea
                  className={`${I} min-h-[100px] resize-y font-mono text-sm`}
                  placeholder={"--\n홍길동 | 개발팀 팀장\n주식회사 OO\nTel: 010-1234-5678"}
                  value={sigEditing.customHtml}
                  onChange={e => setSigEditing(prev => ({ ...prev, customHtml: e.target.value }))}
                  rows={4}
                />
              </div>

              {/* 서명 미리보기 */}
              <div>
                <label className={L}>미리보기</label>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 min-h-[60px]">
                  {signaturePreview ? (
                    <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">{signaturePreview.replace(/^\n\n/, "")}</pre>
                  ) : (
                    <p className="text-sm text-slate-400">서명 정보를 입력하면 미리보기가 표시됩니다</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button className={B2} onClick={() => setShowSignatureModal(false)}>취소</button>
                <button className={B} onClick={saveSignatureHandler}>저장</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">분류 규칙 관리</h3>
              <button onClick={() => setShowRuleModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
            </div>
            <div className="p-5 space-y-5">
              {/* Custom folder management */}
              <div>
                <label className={L}>커스텀 폴더 추가</label>
                <div className="flex gap-2">
                  <input className={`${I} flex-1`} placeholder="새 폴더 이름"
                    value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addCustomFolder()} />
                  <button className={B2} onClick={addCustomFolder}>추가</button>
                </div>
                {customFolders.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {customFolders.map(f => (
                      <span key={f} className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                        📁 {f}
                        <button onClick={() => removeCustomFolder(f)}
                          className="text-slate-400 hover:text-red-500">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <hr className="border-slate-100" />

              {/* Add/Edit rule form */}
              <div>
                <label className={L}>{ruleEditing ? "규칙 수정" : "새 규칙 추가"}</label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <select
                      className={`${I} !w-auto`}
                      value={ruleCondField}
                      onChange={e => setRuleCondField(e.target.value as MailRule["conditionField"])}>
                      <option value="from_name">보낸사람 포함</option>
                      <option value="subject">제목 포함</option>
                      <option value="body">본문 포함</option>
                    </select>
                    <input className={`${I} flex-1`} placeholder="조건 값 (예: 김철수, 회의, 보고서)"
                      value={ruleCondValue} onChange={e => setRuleCondValue(e.target.value)} />
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-slate-500 font-medium whitespace-nowrap">이동 폴더:</span>
                    <select className={`${I} flex-1`}
                      value={ruleTargetFolder}
                      onChange={e => setRuleTargetFolder(e.target.value)}>
                      <option value="">폴더 선택...</option>
                      {allTargetFolders.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 justify-end">
                    {ruleEditing && (
                      <button className={B2} onClick={resetRuleForm}>취소</button>
                    )}
                    <button className={B} onClick={saveRule}>
                      {ruleEditing ? "수정" : "추가"}
                    </button>
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Rule list */}
              <div>
                <label className={L}>등록된 규칙 ({rules.length})</label>
                {rules.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">등록된 규칙이 없습니다</p>
                ) : (
                  <div className="space-y-2">
                    {rules.map(rule => (
                      <div key={rule.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-sm text-slate-700">
                          <span className="font-semibold text-[#3182F6]">{conditionFieldLabel(rule.conditionField)}</span>
                          {" "}
                          <span className="bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-slate-800 font-medium">"{rule.conditionValue}"</span>
                          {" → "}
                          <span className="font-semibold">📁 {rule.targetFolder}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => editRule(rule)}
                            className="text-xs text-[#3182F6] hover:text-[#2672DE] px-2 py-1 rounded-lg hover:bg-[#3182F6]/5">수정</button>
                          <button onClick={() => deleteRule(rule.id)}
                            className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50">삭제</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button className={B2} onClick={() => setShowRuleModal(false)}>닫기</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OOO Modal */}
      {showOOOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">부재중 자동응답 설정</h3>
              <button onClick={() => setShowOOOModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">자동응답 활성화</label>
                <button
                  onClick={() => setOooActive(!oooActive)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${oooActive ? "bg-[#3182F6]" : "bg-slate-200"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${oooActive ? "left-[26px]" : "left-0.5"}`} />
                </button>
              </div>

              {oooActive && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={L}>시작일</label>
                      <input type="date" className={I} value={oooStart} onChange={e => setOooStart(e.target.value)} />
                    </div>
                    <div>
                      <label className={L}>종료일</label>
                      <input type="date" className={I} value={oooEnd} onChange={e => setOooEnd(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className={L}>자동응답 메시지</label>
                    <textarea
                      className={`${I} min-h-[120px] resize-y`}
                      placeholder="안녕하세요. 현재 부재중입니다. OO/OO까지 자리를 비우며, 돌아온 후 답변드리겠습니다."
                      value={oooMessage}
                      onChange={e => setOooMessage(e.target.value)}
                      rows={4}
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button className={B2} onClick={() => setShowOOOModal(false)}>취소</button>
                <button className={B} onClick={saveOOO}>저장</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">
                {replyMode === "reply" ? "답장" : replyMode === "forward" ? "전달" : "새 메일 작성"}
              </h3>
              <button onClick={() => { setShowCompose(false); resetCompose(); }}
                className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={L}>받는 사람</label>
                <div className="relative">
                  <input className={I}
                    placeholder="이름으로 검색..."
                    value={composeTo || toSearch}
                    onChange={e => {
                      if (composeTo) setComposeTo("");
                      setToSearch(e.target.value);
                      setShowToDropdown(true);
                    }}
                    onFocus={() => setShowToDropdown(true)}
                  />
                  {composeTo && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <span className="text-xs bg-[#3182F6]/10 text-[#3182F6] px-2 py-0.5 rounded-full font-semibold">
                        {composeTo}
                        {isOOOActive(composeTo) && <span className="ml-1">🏖️</span>}
                      </span>
                      <button onClick={() => { setComposeTo(""); setToSearch(""); }}
                        className="text-slate-300 hover:text-red-500 text-sm">&times;</button>
                    </div>
                  )}
                  {showToDropdown && !composeTo && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                      {filteredTeamMembers.length === 0 ? (
                        <p className="text-xs text-slate-400 px-3 py-2">검색 결과 없음</p>
                      ) : (
                        filteredTeamMembers.map(m => (
                          <button key={m.name} type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between"
                            onClick={() => { setComposeTo(m.name); setToSearch(""); setShowToDropdown(false); }}>
                            <span className="font-medium text-slate-700 flex items-center gap-1.5">
                              {m.name}
                              {isOOOActive(m.name) && (
                                <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-semibold">🏖️ 부재중</span>
                              )}
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg">{m.hqRole}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {composeTo && isOOOActive(composeTo) && (
                  <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                    <span>🏖️</span>
                    <span>{composeTo}님은 현재 부재중입니다. 자동응답이 전송될 수 있습니다.</span>
                  </p>
                )}
              </div>
              <div>
                <label className={L}>제목</label>
                <input className={I} placeholder="메일 제목" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`${L} !mb-0`}>내용</label>
                  <button
                    type="button"
                    className="text-xs font-semibold text-[#3182F6] hover:text-[#2672DE] bg-[#3182F6]/5 hover:bg-[#3182F6]/10 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                    onClick={() => setShowAiDraft(!showAiDraft)}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    AI 초안 작성
                  </button>
                </div>

                {/* AI Draft Form */}
                {showAiDraft && (
                  <div className="mb-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
                    <p className="text-xs font-bold text-blue-700">AI가 메일 초안을 작성해 드립니다</p>
                    <div>
                      <label className="block text-xs font-semibold text-blue-600 mb-1">주제/키워드</label>
                      <input
                        className={`${I} !text-sm !py-2 !border-blue-200 !bg-white`}
                        placeholder="예: 프로젝트 진행 상황 보고, 미팅 일정 조율, 견적서 요청..."
                        value={aiTopic}
                        onChange={e => setAiTopic(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-blue-600 mb-1">톤</label>
                      <div className="flex gap-2">
                        {(["공식", "친근", "간결"] as const).map(tone => (
                          <button
                            key={tone}
                            type="button"
                            onClick={() => setAiTone(tone)}
                            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                              aiTone === tone
                                ? "bg-[#3182F6] text-white"
                                : "bg-white text-slate-500 border border-blue-200 hover:bg-blue-50"
                            }`}
                          >
                            {tone}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" className={`${B2} !text-xs !px-3 !py-1.5`}
                        onClick={() => setShowAiDraft(false)}>취소</button>
                      <button
                        type="button"
                        className="text-xs font-bold text-white bg-[#3182F6] hover:bg-[#2672DE] px-4 py-1.5 rounded-lg transition-all disabled:opacity-50"
                        onClick={generateAiDraft}
                        disabled={aiLoading}
                      >
                        {aiLoading ? "생성 중..." : "초안 생성"}
                      </button>
                    </div>
                  </div>
                )}

                <textarea className={`${I} min-h-[120px] md:min-h-[200px] resize-y`}
                  placeholder="내용을 입력하세요..."
                  value={composeBody} onChange={e => setComposeBody(e.target.value)} rows={8}
                />
              </div>
              {/* 서명 포함 토글 */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSignature}
                    onChange={e => setIncludeSignature(e.target.checked)}
                    className="rounded border-slate-300 text-[#3182F6] focus:ring-[#3182F6]/30"
                  />
                  <span className="text-slate-600 font-medium">서명 포함</span>
                </label>
                {includeSignature && buildSignatureText(signature) && (
                  <div className="text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg max-w-[300px] truncate">
                    {buildSignatureText(signature).replace(/^\n\n/, "").split("\n").slice(0, 2).join(" | ")}...
                  </div>
                )}
              </div>
              <div>
                <label className={L}>첨부파일</label>
                <input ref={fileRef} type="file" multiple
                  className="text-sm text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                  onChange={e => {
                    if (e.target.files) setComposeAttachments(Array.from(e.target.files));
                  }}
                />
                {composeAttachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {composeAttachments.map((f, i) => (
                      <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg flex items-center gap-1">
                        {f.name}
                        <button onClick={() => setComposeAttachments(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-slate-400 hover:text-red-500">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button className={B2} onClick={saveDraft}>임시저장</button>
                <button className={B2} onClick={() => { setShowCompose(false); resetCompose(); }}>취소</button>
                <button className={B} onClick={sendMail}>보내기</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile folder selector (shown on mobile only) */}
      <div className="md:hidden flex items-center gap-2 flex-wrap">
        <button className={`${B} !text-sm !px-3 !py-2`} onClick={openCompose}>+ 새 메일</button>
        <select
          className={`${I} !py-2 !text-sm flex-1 min-w-[140px]`}
          value={activeFolder}
          onChange={e => { setActiveFolder(e.target.value); setSelectedMail(null); setMobileShowDetail(false); }}
        >
          {allFolders.map(f => {
            const count = f.key === "받은편지함" ? unreadCount : 0;
            return (
              <option key={f.key} value={f.key}>
                {f.icon} {f.key}{count > 0 ? ` (${count})` : ""}
              </option>
            );
          })}
        </select>
        <div className="flex gap-1">
          <button className={`${B2} !text-xs !px-2 !py-1.5`} onClick={openSignatureModal}>서명</button>
          <button className={`${B2} !text-xs !px-2 !py-1.5`} onClick={openRuleModal}>규칙</button>
          <button className={`${B2} !text-xs !px-2 !py-1.5`} onClick={openOOOModal}>
            {isOOOActive(userName) ? "🏖️" : "부재중"}
          </button>
        </div>
      </div>

      <div className="flex gap-4 min-h-[600px]">
        {/* Left Panel - Folder Tree (hidden on mobile) */}
        <div className="hidden md:block w-56 flex-shrink-0 space-y-2">
          <button className={`${B} w-full mb-3`} onClick={openCompose}>+ 새 메일</button>
          <div className="flex gap-1.5 mb-3">
            <button className={`${B2} flex-1 !text-sm !px-3 !py-2`} onClick={openSignatureModal}>서명 설정</button>
          </div>
          <div className="flex gap-1.5 mb-3">
            <button className={`${B2} flex-1 !text-sm !px-3 !py-2`} onClick={openRuleModal}>분류 규칙</button>
            <button className={`${B2} flex-1 !text-sm !px-3 !py-2`} onClick={openOOOModal}>
              {isOOOActive(userName) ? "🏖️ 부재중" : "부재중 설정"}
            </button>
          </div>
          <div className={`${C} !p-2`}>
            {allFolders.map(f => {
              const count = f.key === "받은편지함" ? unreadCount : 0;
              return (
                <button key={f.key}
                  onClick={() => { setActiveFolder(f.key); setSelectedMail(null); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeFolder === f.key
                      ? "bg-[#3182F6]/10 text-[#3182F6]"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}>
                  <span className="flex items-center gap-2">
                    <span>{f.icon}</span>
                    <span>{f.key}</span>
                  </span>
                  {count > 0 && (
                    <span className="text-[10px] bg-[#3182F6] text-white px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center / Right Panel */}
        <div className="flex-1 flex gap-4">
          {/* Mail List - hidden on mobile when detail is shown */}
          <div className={`${selectedMail ? "hidden md:flex md:w-2/5" : "flex"} ${!mobileShowDetail ? "flex" : "hidden md:flex"} flex-col flex-1 md:flex-none ${selectedMail ? "md:w-2/5" : "md:flex-1"}`}>
            <div className={`${C} !p-3 mb-3`}>
              <input className={`${I} !py-2 !text-sm`}
                placeholder="제목, 보낸사람 검색..."
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className={`${C} !p-2 flex-1 overflow-y-auto`}>
              {filtered.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">메일이 없습니다</p>
              ) : (
                <div className="space-y-0.5">
                  {filtered.map(m => {
                    const isSelected = selectedMail?.id === m.id;
                    const isUnread = !m.read && m.to_name === userName;
                    const isSentFolder = activeFolder === "보낸편지함";
                    const otherPerson = isSentFolder ? m.to_name : m.from_name;
                    return (
                      <div key={m.id}
                        onClick={() => selectMail(m)}
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${
                          isSelected ? "bg-[#3182F6]/10" : "hover:bg-slate-50"
                        } ${isUnread ? "bg-blue-50/50" : ""}`}>
                        <button
                          onClick={e => { e.stopPropagation(); toggleStar(m); }}
                          className={`text-sm flex-shrink-0 ${m.starred ? "text-amber-400" : "text-slate-200 hover:text-amber-300"}`}>
                          {m.starred ? "★" : "☆"}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-sm truncate ${isUnread ? "font-bold text-slate-900" : "font-medium text-slate-600"}`}>
                              {displayName(otherPerson)}
                            </span>
                            {isOOOActive(otherPerson) && (
                              <span className="text-[10px] text-amber-500" title="부재중">🏖️</span>
                            )}
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-[#3182F6] flex-shrink-0" />
                            )}
                          </div>
                          <p className={`text-sm truncate ${isUnread ? "font-semibold text-slate-800" : "text-slate-500"}`}>
                            {m.subject}
                          </p>
                          <p className="text-xs text-slate-400 truncate mt-0.5">{m.body.slice(0, 60)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-xs text-slate-400">{formatDate(m.created_at)}</span>
                          {m.attachments && m.attachments.length > 0 && (
                            <span className="text-[10px] text-slate-400">📎</span>
                          )}
                          {/* Read receipt indicator in sent folder */}
                          {isSentFolder && m.from_name === userName && (
                            <span className={`text-[10px] ${m.read_at ? "text-[#3182F6]" : "text-slate-300"}`} title={m.read_at ? `읽음 (${formatReadAt(m.read_at)})` : "안읽음"}>
                              {m.read_at ? "✓✓" : "✓"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Mail Detail */}
          {selectedMail && (
            <div className={`${mobileShowDetail ? "flex" : "hidden"} md:flex flex-1 flex-col ${C} overflow-y-auto`}>
              {/* Mobile back button */}
              <button
                onClick={() => { setMobileShowDetail(false); setSelectedMail(null); }}
                className="md:hidden flex items-center gap-1 text-sm font-semibold text-[#3182F6] mb-3 hover:text-[#2672DE] transition-colors"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
                목록
              </button>

              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800 flex-1 mr-4">{selectedMail.subject}</h2>
                <button onClick={() => { setSelectedMail(null); setMobileShowDetail(false); }}
                  className="text-slate-400 hover:text-slate-600 text-lg flex-shrink-0 hidden md:block">&times;</button>
              </div>

              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {displayName(selectedMail.from_name)}
                    {isOOOActive(selectedMail.from_name) && (
                      <span className="ml-1.5 text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-semibold">🏖️ 부재중</span>
                    )}
                    <span className="text-slate-400 font-normal ml-2">&rarr;</span>
                    <span className="ml-2">
                      {displayName(selectedMail.to_name)}
                      {isOOOActive(selectedMail.to_name) && (
                        <span className="ml-1.5 text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-semibold">🏖️ 부재중</span>
                      )}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{formatFullDate(selectedMail.created_at)}</p>
                  {/* Read receipt in detail view for sent mail */}
                  {selectedMail.from_name === userName && (
                    <p className="text-xs mt-1 flex items-center gap-1">
                      {selectedMail.read_at ? (
                        <span className="text-[#3182F6] flex items-center gap-1">
                          <span className="font-bold">✓✓</span>
                          <span>읽음 ({formatReadAt(selectedMail.read_at)})</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1">
                          <span>✓</span>
                          <span>안읽음</span>
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleStar(selectedMail)}
                    className={`p-1.5 rounded-lg transition-colors ${selectedMail.starred ? "text-amber-400" : "text-slate-300 hover:text-amber-300"}`}
                    title={selectedMail.starred ? "중요 해제" : "중요 표시"}>
                    {selectedMail.starred ? "★" : "☆"}
                  </button>
                  <button onClick={() => toggleRead(selectedMail)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-colors text-xs"
                    title={selectedMail.read ? "읽지않음 표시" : "읽음 표시"}>
                    {selectedMail.read ? "📭" : "📬"}
                  </button>
                  {activeFolder === "휴지통" ? (
                    <button onClick={() => deletePermanently(selectedMail)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 transition-colors text-xs" title="영구 삭제">
                      🗑️
                    </button>
                  ) : (
                    <button onClick={() => moveToTrash(selectedMail)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition-colors text-xs" title="삭제">
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              {/* AI Summary */}
              {selectedMail.to_name === userName && selectedMail.body.length > 100 && (
                <div className="mb-4">
                  <button
                    className="text-xs font-semibold text-[#3182F6] hover:text-[#2672DE] bg-[#3182F6]/5 hover:bg-[#3182F6]/10 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 mb-2"
                    onClick={() => generateAiSummary(selectedMail)}
                    disabled={aiSummaryLoading}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    {aiSummaryLoading ? "요약 중..." : "AI 요약"}
                  </button>
                  {aiSummary && showSummary && (
                    <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-blue-700 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          AI 요약
                        </p>
                        <button
                          className="text-xs text-blue-400 hover:text-blue-600"
                          onClick={() => setShowSummary(false)}
                        >접기</button>
                      </div>
                      <p className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">{aiSummary}</p>
                    </div>
                  )}
                  {aiSummary && !showSummary && (
                    <button
                      className="text-xs text-blue-400 hover:text-blue-600 mb-2"
                      onClick={() => setShowSummary(true)}
                    >AI 요약 펼치기</button>
                  )}
                </div>
              )}

              <div className="prose prose-sm max-w-none mb-6">
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedMail.body}</p>
              </div>

              {selectedMail.attachments && selectedMail.attachments.length > 0 && (
                <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 mb-2">첨부파일 ({selectedMail.attachments.length})</p>
                  <div className="space-y-1">
                    {selectedMail.attachments.map((att, i) => (
                      <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-[#3182F6] hover:underline p-1.5 rounded-lg hover:bg-white transition-colors">
                        <span>📎</span>
                        <span>{att.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                <button className={B2} onClick={() => openReply(selectedMail)}>↩ 답장</button>
                <button className={B2} onClick={() => openForward(selectedMail)}>↪ 전달</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
