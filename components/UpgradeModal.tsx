"use client";

import Link from "next/link";

export default function UpgradeModal({
  open,
  onClose,
  title,
  description,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl leading-none"
        >
          &times;
        </button>
        <div className="text-4xl mb-4">🚀</div>
        <h2 className="text-xl font-extrabold text-slate-900 mb-2">{title}</h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">{description}</p>
        <Link
          href="/pricing"
          className="block w-full rounded-2xl bg-blue-600 text-white font-semibold py-3.5 hover:bg-blue-700 transition"
        >
          요금제 보기 →
        </Link>
        <button
          onClick={onClose}
          className="mt-3 text-sm text-slate-400 hover:text-slate-600 transition"
        >
          나중에 할게요
        </button>
      </div>
    </div>
  );
}
