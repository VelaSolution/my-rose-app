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
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="mt-1 text-xs text-slate-400">{hint}</p>
        </div>
        {suffix && (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
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
        className={`h-14 w-full rounded-2xl border bg-slate-50 px-4 text-xl font-semibold text-slate-900 outline-none transition focus:bg-white ${
          error
            ? "border-red-300 focus:border-red-400"
            : "border-slate-200 focus:border-slate-400"
        }`}
      />

      {error ? (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      ) : (
        <p className="mt-2 text-xs text-slate-400">
          현재 입력값: {money ? fmt(value) : value}
          {suffix ?? ""}
        </p>
      )}
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
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="mt-1 text-xs text-slate-400">{hint}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
          {suffix}
        </span>
      </div>

      <div className={`rounded-2xl p-4 ${error ? "bg-red-50" : "bg-slate-50"}`}>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-slate-500">현재 값</span>
          <span className="text-lg font-bold text-slate-900">
            {value}
            {suffix}
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

        <div className="mt-2 flex justify-between text-xs text-slate-400">
          <span>
            {min}
            {suffix}
          </span>
          <span>
            {max}
            {suffix}
          </span>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
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
        className={`relative h-[31px] w-[51px] rounded-full transition-colors duration-200 ease-in-out flex-shrink-0 ${
          value ? "bg-[#34C759]" : "bg-[#E5E5EA]"
        }`}
      >
        <span
          className={`absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.06)] transition-transform duration-200 ease-in-out ${
            value ? "translate-x-[22px]" : "translate-x-[2px]"
          }`}
        />
      </button>
    </div>
  );
}
