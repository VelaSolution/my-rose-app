"use client";

import React, { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatContext = {
  form?: Record<string, unknown>;
  result?: Record<string, unknown>;
};

const QUICK_QUESTIONS = [
  "순이익을 높이려면 뭐가 제일 효과적인가요?",
  "손익분기점 달성하려면 얼마나 더 팔아야 하나요?",
  "인건비를 줄이는 현실적인 방법이 있나요?",
  "객단가를 올릴 수 있는 방법을 알려주세요",
  "배달 채널을 시작하는 게 유리할까요?",
];

export default function VelaChat({ context }: { context?: ChatContext }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: context?.result
        ? "안녕하세요! 현재 매장 데이터를 기반으로 궁금한 점을 무엇이든 물어보세요. 경영 전략, 비용 절감, 매출 향상 등 다양한 주제로 도움드릴 수 있어요 😊"
        : "안녕하세요! 외식업 창업과 운영에 관해 궁금한 점을 물어보세요 😊",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content };
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "" };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          context,
        }),
      });

      if (!res.ok) throw new Error("API 오류");
      if (!res.body) throw new Error("스트림 없음");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
        );
      }

      if (!open) setUnread((n) => n + 1);
    } catch (e) {
      console.error(e);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: "오류가 발생했습니다. 다시 시도해주세요." } : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 left-5 md:left-auto md:right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 shadow-lg transition hover:bg-slate-700 active:scale-95 print:hidden"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 4l12 12M16 4L4 16" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <div className="relative">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.03 2 11c0 2.67 1.19 5.07 3.09 6.77L4 20l3.23-1.08A10.1 10.1 0 0012 20c5.52 0 10-4.03 10-9s-4.48-9-10-9z" fill="white" />
            </svg>
            {unread > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {unread}
              </span>
            )}
          </div>
        )}
      </button>

      {/* 채팅 창 */}
      {open && (
        <div
          className="fixed bottom-24 left-5 md:left-auto md:right-6 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col rounded-[28px] bg-white shadow-2xl ring-1 ring-slate-200 print:hidden"
          style={{ height: "520px" }}
        >
          {/* 헤더 */}
          <div className="flex items-center gap-3 rounded-t-[28px] bg-slate-900 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.03 2 11c0 2.67 1.19 5.07 3.09 6.77L4 20l3.23-1.08A10.1 10.1 0 0012 20c5.52 0 10-4.03 10-9s-4.48-9-10-9z" fill="white" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">VELA AI 상담</p>
              <p className="text-xs text-slate-400">매장 데이터 기반 실시간 답변</p>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto rounded-full p-1 hover:bg-white/10">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M4 4l12 12M16 4L4 16" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 1 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-400">빠른 질문</p>
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-100"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C6.48 2 2 6.03 2 11c0 2.67 1.19 5.07 3.09 6.77L4 20l3.23-1.08A10.1 10.1 0 0012 20c5.52 0 10-4.03 10-9s-4.48-9-10-9z" fill="white" />
                    </svg>
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    msg.role === "user" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {msg.content || (
                    <span className="flex gap-1 items-center">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "300ms" }} />
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* 입력 영역 */}
          <div className="rounded-b-[28px] border-t border-slate-100 px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="질문을 입력하세요... (Enter로 전송)"
                rows={1}
                disabled={loading}
                className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white disabled:opacity-50"
                style={{ maxHeight: "100px" }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 transition hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-slate-400">Shift+Enter로 줄바꿈</p>
          </div>
        </div>
      )}
    </>
  );
}
