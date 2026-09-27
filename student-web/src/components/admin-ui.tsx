"use client";

import { useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Shared admin UI primitives (tabs, status pills, modal, table states).
// Used by the /admin moderation pages to keep styling consistent.
// ---------------------------------------------------------------------------

export type PillTone = "amber" | "green" | "red" | "slate" | "blue";

const PILL_STYLES: Record<PillTone, string> = {
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
};

export function StatusPill({ tone, children }: { tone: PillTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${PILL_STYLES[tone]}`}
    >
      {children}
    </span>
  );
}

export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: ReadonlyArray<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={isActive}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2342] focus-visible:ring-offset-2 ${
              isActive
                ? "border-[#0A2342] bg-[#0A2342] text-white"
                : "border-gray-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {opt.label}
            {typeof opt.count === "number" ? ` (${opt.count})` : ""}
          </button>
        );
      })}
    </div>
  );
}

export function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const titleId = "admin-modal-title";
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-lg focus:outline-none"
      >
        <h2 id={titleId} className="text-base font-bold text-slate-900">
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function TableLoading({ label, columns = 5 }: { label: string; columns?: number }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="grid animate-pulse gap-3 rounded-lg border border-slate-200 bg-white p-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="h-4 rounded bg-slate-100" />
          ))}
        </div>
      ))}
      <span className="sr-only">Memuat data…</span>
    </div>
  );
}

export function TableError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center">
      <p className="text-sm font-semibold text-slate-900">Gagal memuat data</p>
      <p className="mt-1 text-xs text-slate-500">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2342] focus-visible:ring-offset-2"
      >
        Coba lagi
      </button>
    </div>
  );
}

export function TableEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div role="status" className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}
