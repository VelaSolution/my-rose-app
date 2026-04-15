"use client";

import React, { useEffect, useState } from "react";
import { fmt } from "@/lib/vela";

export function InputCard({
  label,
  hint,
  value,
  onChange,
  suffix = "원",
  money = false,
  error,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  money?: boolean;
  error?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState(String(value));

  useEffect(() => {
    if (!focused) setRaw(String(value));
  }, [value, focused]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
        </div>
        {suffix && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {suffix}
          </span>
        )}
      </div>

      <input
        type={money && focused ? "number" : money ? "text" : "number"}
        inputMode="numeric"
        value={money ? (focused ? raw : fmt(value)) : String(value)}
        onFocus={() => {
          setFocused(true);
          setRaw(String(value));
        }}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9.]/g, "");
          setRaw(v);
          const n = Number(v);
          if (!isNaN(n)) onChange(n);
        }}
        onBlur={() => {
          setFocused(false);
          const n = Number(raw.replace(/[^0-9.]/g, ""));
          if (!isNaN(n)) onChange(n);
        }}
        className={`h-11 w-full rounded-xl border bg-slate-50 px-4 text-lg font-semibold text-slate-900 outline-none transition focus:bg-white ${
          error
            ? "border-red-300 focus:border-red-400"
            : "border-slate-200 focus:border-slate-400"
        }`}
      />

      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function SliderCard({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  error,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  suffix: string;
  error?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
        </div>
        <span className="text-lg font-bold text-slate-900 flex-shrink-0">
          {value}{suffix}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />

      <div className="mt-1 flex justify-between text-xs text-slate-400">
        <span>{min}{suffix}</span>
        <span>{max}{suffix}</span>
      </div>

      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-[31px] w-[51px] rounded-full transition-colors duration-200 ease-in-out flex-shrink-0 ${
          value ? "bg-[#34C759]" : "bg-[#E5E5EA]"
        }`}
        style={{ minHeight: 31, minWidth: 51 }}
      >
        <span
          className="absolute rounded-full bg-white"
          style={{
            width: 27, height: 27, top: 2,
            left: value ? 22 : 2,
            boxShadow: "0 3px 8px rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.06)",
            transition: "left 0.2s ease-in-out",
          }}
        />
      </button>
    </div>
  );
}
