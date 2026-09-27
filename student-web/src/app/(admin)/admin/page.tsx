"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type AdminStats = {
  users_count: number;
  active_listings: number;
  pending_events_count: number;
  pending_reports_count: number;
};

type StatsResponse = {
  message: string;
  data: AdminStats;
};

function StatIcon({ kind }: { kind: "users" | "listings" | "events" | "reports" }) {
  const paths: Record<string, React.ReactNode> = {
    users: (
      <>
        <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M3 13.5C3 11 5 9.5 8 9.5C11 9.5 13 11 13 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </>
    ),
    listings: (
      <>
        <path d="M2.5 5.5L8 2.5L13.5 5.5V13.5H2.5V5.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M6 13.5V8.5H10V13.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </>
    ),
    events: (
      <>
        <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M2.5 6.5H13.5M6 2.5V4M10 2.5V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </>
    ),
    reports: (
      <>
        <path d="M4.5 2.5H9.5L12 5V13.5H4.5V2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M9.5 2.5V5H12" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M6.5 8.5H9.5M6.5 11H9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </>
    ),
  };
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {paths[kind]}
    </svg>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
  href,
  actionLabel,
  attention,
}: {
  title: string;
  value: number | null;
  description: string;
  icon: "users" | "listings" | "events" | "reports";
  href: string;
  actionLabel: string;
  attention?: boolean;
}) {
  return (
    <section
      aria-label={title}
      className={`flex flex-col rounded-xl border bg-white p-5 ${
        attention ? "border-amber-300" : "border-slate-200"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
            attention ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-600"
          }`}
        >
          <StatIcon kind={icon} />
        </span>
        <h2 className="text-[13px] font-semibold text-slate-600">{title}</h2>
      </div>
      <p className="mt-3 text-[28px] font-bold leading-none tracking-tight text-slate-900" role="status">
        {value === null ? "…" : value.toLocaleString("id-ID")}
      </p>
      <p className="mt-1.5 text-xs leading-5 text-slate-500">{description}</p>
      <Link
        href={href}
        className="mt-3 w-fit text-[13px] font-semibold text-[#0A2342] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2342] focus-visible:ring-offset-2"
      >
        {actionLabel} →
      </Link>
    </section>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiFetch<StatsResponse>("/v1/admin/stats");
      if (signal?.aborted) return;
      setStats(res.data);
    } catch {
      if (signal?.aborted) return;
      setStats(null);
      setError("Gagal memuat statistik. Periksa koneksi ke backend lalu coba lagi.");
    } finally {
      if (signal?.aborted) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch must populate state on mount
    void loadStats(controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadStats]);

  return (
    <div>
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900 sm:text-[26px]">Ringkasan</h1>
        <p className="mt-1 max-w-[560px] text-sm text-slate-500">
          Pantau aktivitas platform, kurasi pengajuan event, dan tindak lanjuti laporan pelanggaran.
        </p>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div role="status" aria-busy="true" aria-label="Memuat statistik admin" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-100" />
                <div className="mt-3 h-7 w-20 animate-pulse rounded bg-slate-100" />
                <div className="mt-2 h-3 w-full animate-pulse rounded bg-slate-100" />
              </div>
            ))}
            <span className="sr-only">Memuat statistik…</span>
          </div>
        ) : error ? (
          <div role="alert" className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-900">Gagal memuat statistik</p>
            <p className="mt-1 text-xs text-slate-500">{error}</p>
            <button
              type="button"
              onClick={() => void loadStats()}
              className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2342] focus-visible:ring-offset-2"
            >
              Coba lagi
            </button>
          </div>
        ) : (
          stats && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total Pengguna Mahasiswa"
                value={stats.users_count}
                description="Akun mahasiswa terdaftar di platform."
                icon="users"
                href="/admin/users"
                actionLabel="Kelola pengguna"
              />
              <StatCard
                title="Listing Aktif Kampus"
                value={stats.active_listings}
                description="Marketplace, kost, jasa, dan lost & found yang aktif."
                icon="listings"
                href="/admin/reports"
                actionLabel="Lihat moderasi"
              />
              <StatCard
                title="Event Menunggu Kurasi"
                value={stats.pending_events_count}
                description={
                  stats.pending_events_count > 0
                    ? "Ada pengajuan event yang perlu segera ditinjau."
                    : "Tidak ada pengajuan event yang tertunda."
                }
                icon="events"
                href="/admin/events"
                actionLabel="Kurasi event"
                attention={stats.pending_events_count > 0}
              />
              <StatCard
                title="Laporan Perlu Penanganan"
                value={stats.pending_reports_count}
                description={
                  stats.pending_reports_count > 0
                    ? "Ada laporan pelanggaran yang menunggu tindakan."
                    : "Semua laporan sudah ditindaklanjuti."
                }
                icon="reports"
                href="/admin/reports"
                actionLabel="Moderasi laporan"
                attention={stats.pending_reports_count > 0}
              />
            </div>
          )
        )}
      </div>

      {!isLoading && !error && stats && (stats.pending_events_count > 0 || stats.pending_reports_count > 0) && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4" role="status">
          <p className="text-sm font-semibold text-amber-900">Perlu perhatian admin</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] text-amber-800">
            {stats.pending_events_count > 0 && (
              <li>
                <Link href="/admin/events" className="font-medium underline underline-offset-2">
                  {stats.pending_events_count} pengajuan event
                </Link>{" "}
                menunggu kurasi.
              </li>
            )}
            {stats.pending_reports_count > 0 && (
              <li>
                <Link href="/admin/reports" className="font-medium underline underline-offset-2">
                  {stats.pending_reports_count} laporan
                </Link>{" "}
                menunggu penanganan.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
