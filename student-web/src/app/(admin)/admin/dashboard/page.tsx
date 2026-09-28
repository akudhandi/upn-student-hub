"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin-ui";
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

function CardIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const CARD_ICONS: Record<string, { icon: React.ReactNode; iconClass: string; hoverClass: string }> = {
  users: {
    icon: (
      <CardIcon>
        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </CardIcon>
    ),
    iconClass: "bg-blue-50 text-blue-600",
    hoverClass: "hover:text-blue-600",
  },
  marketplace: {
    icon: (
      <CardIcon>
        <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </CardIcon>
    ),
    iconClass: "bg-amber-50 text-amber-600",
    hoverClass: "hover:text-amber-600",
  },
  services: {
    icon: (
      <CardIcon>
        <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </CardIcon>
    ),
    iconClass: "bg-indigo-50 text-indigo-600",
    hoverClass: "hover:text-indigo-600",
  },
  kost: {
    icon: (
      <CardIcon>
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </CardIcon>
    ),
    iconClass: "bg-emerald-50 text-emerald-600",
    hoverClass: "hover:text-emerald-600",
  },
  lostfound: {
    icon: (
      <CardIcon>
        <path d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </CardIcon>
    ),
    iconClass: "bg-sky-50 text-sky-600",
    hoverClass: "hover:text-sky-600",
  },
  events: {
    icon: (
      <CardIcon>
        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </CardIcon>
    ),
    iconClass: "bg-rose-50 text-rose-600",
    hoverClass: "hover:text-rose-600",
  },
};

function StatCard({
  cardKey,
  title,
  value,
  href,
  actionLabel,
  subtitle,
  trend,
  footerMeta,
}: {
  cardKey: keyof typeof CARD_ICONS;
  title: string;
  value: number | null;
  href: string;
  actionLabel: string;
  subtitle: string;
  trend?: { text: string; className: string };
  footerMeta: string;
}) {
  const conf = CARD_ICONS[cardKey];
  return (
    <section
      aria-label={title}
      className="card-transition flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${conf.iconClass}`}>
            {conf.icon}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900" role="status">
            {value === null ? "…" : value.toLocaleString("id-ID")}
          </span>
          {trend && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${trend.className}`}>
              {trend.text}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <Link
          href={href}
          className={`flex items-center gap-1 font-semibold text-slate-700 transition-all ${conf.hoverClass}`}
        >
          {actionLabel} <span aria-hidden="true">→</span>
        </Link>
        <span className="font-medium text-slate-400">{footerMeta}</span>
      </div>
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
    <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" data-purpose="metrics-grid">
      <StatCard
        cardKey="users"
        title="Total Users"
        value={stats.counts.users}
        href="/admin/users"
        actionLabel="Buka Modul"
        subtitle="Active user"
        trend={
          stats.needs_attention.reported_users > 0
            ? { text: `${stats.needs_attention.reported_users} perlu perhatian`, className: "bg-amber-50 text-amber-700" }
            : { text: "Terverifikasi", className: "bg-emerald-50 text-emerald-600" }
        }
        footerMeta="Terverifikasi"
      />
      <StatCard
        cardKey="marketplace"
        title="Marketplace"
        value={stats.counts.marketplace}
        href="/admin/marketplace"
        actionLabel="Lihat Semua"
        subtitle="Listing produk aktif"
        trend={{ text: `${share(stats.counts.marketplace).toFixed(1)}% konten`, className: "bg-amber-50 text-amber-700" }}
        footerMeta="Aktif tayang"
      />
      <StatCard
        cardKey="services"
        title="Jasa Mahasiswa"
        value={stats.counts.services}
        href="/admin/services"
        actionLabel="Lihat Semua"
        subtitle="Desain, les, cetak & pengetikan"
        trend={{ text: `${share(stats.counts.services).toFixed(1)}% konten`, className: "bg-slate-100 text-slate-500" }}
        footerMeta="Tersedia"
      />
      <StatCard
        cardKey="kost"
        title="Kost"
        value={stats.counts.kost}
        href="/admin/kost"
        actionLabel="Buka Modul"
        subtitle="Sekitar kampus UPN Rungkut"
        trend={{ text: `${share(stats.counts.kost).toFixed(1)}% konten`, className: "bg-emerald-50 text-emerald-600" }}
        footerMeta="Terverifikasi BAAK"
      />
      <StatCard
        cardKey="lostfound"
        title="Lost & Found"
        value={stats.counts.lost_found}
        href="/admin/lost-found"
        actionLabel="Lihat Semua"
        subtitle="Barang hilang & ditemukan"
        trend={{ text: `${share(stats.counts.lost_found).toFixed(1)}% konten`, className: "bg-sky-50 text-sky-600" }}
        footerMeta="Kasus aktif"
      />
      <StatCard
        cardKey="events"
        title="Event & Informasi"
        value={stats.counts.events}
        href="/admin/events"
        actionLabel="Buka Modul"
        subtitle="Agenda ormawa & pengumuman kampus"
        trend={
          stats.needs_attention.pending_events > 0
            ? { text: `${stats.needs_attention.pending_events} menunggu kurasi`, className: "bg-rose-50 text-rose-600" }
            : { text: "Kalender aktif", className: "bg-rose-50 text-rose-600" }
        }
        footerMeta="Kalender aktif"
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
      <AdminPageHeader
        title="Dashboard"
        subtitle="Ringkasan aktivitas platform, hal yang perlu perhatian, dan aktivitas terbaru."
        actions={
          <>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-slate-800"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-slate-200">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Ekspor Laporan
            </button>
            <button
              type="button"
              onClick={() => void loadStats()}
              title="Refresh data"
              aria-label="Refresh data dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs transition hover:bg-slate-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-slate-500">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </>
        }
      />

      {isLoading ? (
        <div role="status" aria-busy="true" aria-label="Memuat dashboard" className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
              <div className="mt-3 h-7 w-20 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
          <span className="sr-only">Memuat dashboard…</span>
        </div>
      ) : error || !stats ? (
        <div role="alert" className="mt-6 rounded-2xl border border-slate-200/80 bg-white px-6 py-12 text-center shadow-xs">
          <p className="text-sm font-semibold text-slate-900">Gagal memuat dashboard</p>
          <p className="mt-1 text-xs text-slate-500">{error}</p>
          <button
            type="button"
            onClick={() => void loadStats()}
            className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          >
            Coba lagi
          </button>
        </div>
      ) : (
        <>
          <DashboardCards stats={stats} />

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3" data-purpose="admin-analytics-overview">
            <section aria-label="Perlu perhatian" className="rounded-2xl border border-amber-200 bg-white p-5 shadow-xs lg:col-span-1">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
                <h2 className="text-sm font-bold text-slate-900">Perlu Tindakan</h2>
              </div>
              <ul className="mt-2 divide-y divide-slate-100">
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

            <section aria-label="Aktivitas terbaru" className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs lg:col-span-2">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />
                <h2 className="text-sm font-bold text-slate-900">Aktivitas Terbaru</h2>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
