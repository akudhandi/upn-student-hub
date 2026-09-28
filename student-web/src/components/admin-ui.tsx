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
            className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
              isActive
                ? "border-slate-900 bg-slate-900 text-white shadow-2xs"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
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

// Page title block matching the design HTML: eyebrow chip + ref code,
// 2xl/3xl bold title, subtitle, and a right-aligned actions toolbar.
export function AdminPageHeader({
  title,
  subtitle,
  eyebrow,
  refCode,
  actions,
}: {
  title: string;
  subtitle: string;
  eyebrow?: string;
  refCode?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-4">
      <div>
        {(eyebrow || refCode) && (
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            {eyebrow && (
              <span className="rounded px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide bg-amber-500/10 text-amber-700">
                {eyebrow}
              </span>
            )}
            {refCode && (
              <span className="font-mono text-xs tracking-wide text-slate-500">{refCode}</span>
            )}
          </div>
        )}
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
        <p className="mt-1 max-w-[640px] text-sm text-slate-500">{subtitle}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">{actions}</div>}
    </section>
  );
}

// Metric summary card matching the design HTML: top accent bar, uppercase
// label, large value, icon square, and a trend/footer line.
export function AdminMetricCard({
  label,
  value,
  icon,
  iconClass,
  accentClass,
  trend,
  footer,
  ariaLabel,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconClass: string;
  accentClass: string;
  trend?: { text: string; className: string };
  footer?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      aria-label={ariaLabel ?? label}
      className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-white p-5 shadow-sm"
    >
      <div aria-hidden="true" className={`absolute left-0 right-0 top-0 h-1 ${accentClass}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="font-mono text-xs uppercase tracking-wide text-slate-500">{label}</span>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900" role="status">
            {value}
          </div>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClass}`} aria-hidden="true">
          {icon}
        </div>
      </div>
      {(trend || footer) && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
          {trend && <span className={`font-medium ${trend.className}`}>{trend.text}</span>}
          {footer && <span className="font-normal text-slate-500">· {footer}</span>}
        </div>
      )}
    </div>
  );
}

// Client-side CSV download for the design-HTML "Ekspor" toolbar buttons.
// Operates only on already-loaded rows; no backend change required.
export function exportToCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (cell: string | number | null | undefined) => {
    const s = cell === null || cell === undefined ? "" : String(cell);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Dark toolbar button matching the design HTML header actions.
export function ToolbarButton({
  children,
  onClick,
  ariaLabel,
  title,
  variant = "dark",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  title?: string;
  variant?: "dark" | "light";
}) {
  const styles =
    variant === "dark"
      ? "border-slate-800 bg-slate-900 text-white hover:bg-slate-800"
      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-2xs transition ${styles}`}
    >
      {children}
    </button>
  );
}

// Small inline SVG icon used by metric cards (stroke style like the designs).
export function MetricIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
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
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-lg focus:outline-none"
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
        <div key={i} className="grid animate-pulse gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
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
    <div role="alert" className="rounded-2xl border border-slate-200/80 bg-white px-6 py-10 text-center shadow-xs">
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
    <div role="status" className="rounded-2xl border border-slate-200/80 bg-white px-6 py-10 text-center shadow-xs">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

export function Pagination({
  page,
  lastPage,
  total,
  unit,
  onChange,
}: {
  page: number;
  lastPage: number;
  total: number;
  unit: string;
  onChange: (page: number) => void;
}) {
  if (lastPage <= 1) return null;
  return (
    <nav aria-label="Navigasi halaman" className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
      <p className="text-xs text-slate-500" role="status">
        Halaman {page} dari {lastPage} • {total.toLocaleString("id-ID")} {unit}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2342] focus-visible:ring-offset-2"
        >
          ← Sebelumnya
        </button>
        <button
          type="button"
          disabled={page >= lastPage}
          onClick={() => onChange(page + 1)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2342] focus-visible:ring-offset-2"
        >
          Berikutnya →
        </button>
      </div>
    </nav>
  );
}

// Slide-over drawer for detail inspection with an action toolbar.
// Used for user profiles, report evidence, and listing previews.
export function AdminDrawer({
  title,
  description,
  onClose,
  actions,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const titleId = "admin-drawer-title";
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <button
        aria-label="Tutup panel detail"
        className="absolute inset-0 h-full w-full cursor-default bg-slate-900/40"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-base font-bold text-slate-900">
              {title}
            </h2>
            {description ? <p className="mt-0.5 line-clamp-2 text-[13px] text-slate-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel detail"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2342]"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
