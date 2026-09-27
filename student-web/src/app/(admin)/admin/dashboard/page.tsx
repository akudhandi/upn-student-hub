"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type RecentUser = {
  id: number;
  name: string;
  email: string;
  status: string;
  created_at: string;
  profile?: { nim?: string | null; name?: string | null; faculty?: string | null } | null;
};

type RecentListing = {
  id: number;
  title: string;
  price?: string | number | null;
  status: string;
  created_at: string;
  user?: { id: number; name: string } | null;
};

type RecentReport = {
  id: number;
  reportable_type: string;
  reportable_id: number;
  reason: string;
  status: string;
  created_at: string;
  reporter?: { id: number; name: string } | null;
};

type RecentEvent = {
  id: number;
  title: string;
  status: string;
  event_date: string;
  created_at: string;
};

type DashboardStats = {
  users_count: number;
  active_listings: number;
  pending_events_count: number;
  pending_reports_count: number;
  counts: {
    users: number;
    marketplace: number;
    services: number;
    kost: number;
    lost_found: number;
    events: number;
  };
  needs_attention: {
    pending_reports: number;
    reported_listings: number;
    reported_users: number;
    pending_events: number;
  };
  recent_activity: {
    users: RecentUser[];
    marketplace: RecentListing[];
    reports: RecentReport[];
    events: RecentEvent[];
  };
};

type StatsResponse = { message: string; data: DashboardStats };

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function StatCard({
  title,
  value,
  href,
  actionLabel,
  sharePct,
  warning,
}: {
  title: string;
  value: number | null;
  href: string;
  actionLabel: string;
  /** Share of total platform content, rendered as a progress bar (0-100). */
  sharePct?: number;
  /** Pending count that triggers a warning badge when > 0. */
  warning?: number;
}) {
  const pct = Math.max(0, Math.min(100, sharePct ?? 0));
  return (
    <section
      aria-label={title}
      className={`rounded-xl border bg-white p-5 ${warning ? "border-amber-300" : "border-slate-200"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-[13px] font-semibold text-slate-600">{title}</h2>
        {typeof warning === "number" && warning > 0 && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
            {warning} pending
          </span>
        )}
      </div>
      <p className="mt-2 text-[28px] font-bold leading-none tracking-tight text-slate-900" role="status">
        {value === null ? "…" : value.toLocaleString("id-ID")}
      </p>
      {sharePct !== undefined && (
        <div className="mt-3" role="img" aria-label={`${title}: ${pct.toFixed(0)} persen dari total konten`}>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#0A2342]" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">{pct.toFixed(1)}% dari total konten</p>
        </div>
      )}
      <Link
        href={href}
        className="mt-3 inline-block text-[13px] font-semibold text-[#0A2342] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2342] focus-visible:ring-offset-2"
      >
        {actionLabel} →
      </Link>
    </section>
  );
}

function DashboardCards({ stats }: { stats: DashboardStats }) {
  const totalContent =
    stats.counts.marketplace +
    stats.counts.services +
    stats.counts.kost +
    stats.counts.lost_found +
    stats.counts.events;
  const share = (n: number) => (totalContent > 0 ? (n / totalContent) * 100 : 0);

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard title="Total Users" value={stats.counts.users} href="/admin/users" actionLabel="Kelola users" warning={stats.needs_attention.reported_users} />
      <StatCard title="Marketplace" value={stats.counts.marketplace} href="/admin/marketplace" actionLabel="Moderasi" sharePct={share(stats.counts.marketplace)} />
      <StatCard title="Jasa Mahasiswa" value={stats.counts.services} href="/admin/services" actionLabel="Moderasi" sharePct={share(stats.counts.services)} />
      <StatCard title="Kost" value={stats.counts.kost} href="/admin/kost" actionLabel="Moderasi" sharePct={share(stats.counts.kost)} />
      <StatCard title="Lost & Found" value={stats.counts.lost_found} href="/admin/lost-found" actionLabel="Moderasi" sharePct={share(stats.counts.lost_found)} />
      <StatCard
        title="Event & Informasi"
        value={stats.counts.events}
        href="/admin/events"
        actionLabel="Kelola event"
        sharePct={share(stats.counts.events)}
        warning={stats.needs_attention.pending_events}
      />
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
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
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900 sm:text-[26px]">Dashboard</h1>
        <p className="mt-1 max-w-[600px] text-sm text-slate-500">
          Ringkasan aktivitas platform, hal yang perlu perhatian, dan aktivitas terbaru.
        </p>
      </div>

      {isLoading ? (
        <div role="status" aria-busy="true" aria-label="Memuat dashboard" className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
              <div className="mt-3 h-7 w-20 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
          <span className="sr-only">Memuat dashboard…</span>
        </div>
      ) : error || !stats ? (
        <div role="alert" className="mt-6 rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-900">Gagal memuat dashboard</p>
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
        <>
          <DashboardCards stats={stats} />

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section aria-label="Perlu perhatian" className="rounded-xl border border-amber-200 bg-white p-5">
              <h2 className="text-[15px] font-bold text-slate-900">Needs Attention</h2>
              <ul className="mt-3 divide-y divide-slate-100">
                <li className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">Laporan belum ditangani</p>
                    <p className="text-xs text-slate-500">Menunggu tinjauan moderator</p>
                  </div>
                  <Link href="/admin/reports" className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-200 hover:bg-amber-100">
                    {stats.needs_attention.pending_reports}
                  </Link>
                </li>
                <li className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">Listing dilaporkan</p>
                    <p className="text-xs text-slate-500">Konten dengan laporan pending</p>
                  </div>
                  <Link href="/admin/reports" className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-200 hover:bg-amber-100">
                    {stats.needs_attention.reported_listings}
                  </Link>
                </li>
                <li className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">User terkena laporan</p>
                    <p className="text-xs text-slate-500">Akun dengan laporan pending</p>
                  </div>
                  <Link href="/admin/users" className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-200 hover:bg-amber-100">
                    {stats.needs_attention.reported_users}
                  </Link>
                </li>
                <li className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">Event menunggu kurasi</p>
                    <p className="text-xs text-slate-500">Pengajuan draft / pending</p>
                  </div>
                  <Link href="/admin/events" className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-200 hover:bg-amber-100">
                    {stats.needs_attention.pending_events}
                  </Link>
                </li>
              </ul>
            </section>

            <section aria-label="Aktivitas terbaru" className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-[15px] font-bold text-slate-900">Recent Activity</h2>
              <div className="mt-3 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">User baru</h3>
                  <ul className="mt-1.5 space-y-1.5">
                    {stats.recent_activity.users.length === 0 && <li className="text-xs text-slate-400">Belum ada data.</li>}
                    {stats.recent_activity.users.map((u) => (
                      <li key={u.id} className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="truncate font-medium text-slate-800">{u.profile?.name || u.name}</span>
                        <span className="shrink-0 text-xs text-slate-400">{formatDate(u.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Listing baru</h3>
                  <ul className="mt-1.5 space-y-1.5">
                    {stats.recent_activity.marketplace.length === 0 && <li className="text-xs text-slate-400">Belum ada data.</li>}
                    {stats.recent_activity.marketplace.map((l) => (
                      <li key={l.id} className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="truncate font-medium text-slate-800">{l.title}</span>
                        <span className="shrink-0 text-xs text-slate-400">{formatDate(l.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Report terbaru</h3>
                  <ul className="mt-1.5 space-y-1.5">
                    {stats.recent_activity.reports.length === 0 && <li className="text-xs text-slate-400">Belum ada data.</li>}
                    {stats.recent_activity.reports.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="truncate font-medium text-slate-800">
                          #{r.id} • {r.reason} • {r.reporter?.name ?? "Anonim"}
                        </span>
                        <span className="shrink-0 text-xs text-slate-400">{formatDate(r.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Event terbaru</h3>
                  <ul className="mt-1.5 space-y-1.5">
                    {stats.recent_activity.events.length === 0 && <li className="text-xs text-slate-400">Belum ada data.</li>}
                    {stats.recent_activity.events.map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="truncate font-medium text-slate-800">{e.title}</span>
                        <span className="shrink-0 text-xs text-slate-400">{formatDate(e.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
