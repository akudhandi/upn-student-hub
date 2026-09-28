"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import StatCard from "@/components/admin/StatCard";
import {
  getAdminStats,
  type DashboardStats,
} from "@/lib/admin-api";
import { formatNumber, shortReportableType, timeAgo } from "@/lib/format";

const LOAD_ERROR =
  "Gagal memuat statistik. Pastikan backend berjalan lalu coba lagi.";

function cardIcon(path: string) {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d={path}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  );
}

interface FeedItem {
  key: string;
  badge: string;
  badgeClass: string;
  title: string;
  sub: string;
  createdAt: string;
}

function buildFeed(stats: DashboardStats): FeedItem[] {
  const items: FeedItem[] = [];
  for (const u of stats.recent_activity.users) {
    items.push({
      key: `user-${u.id}`,
      badge: "ID",
      badgeClass: "bg-blue-50 text-blue-600",
      title: u.profile?.name || u.name || "Mahasiswa baru bergabung",
      sub: u.email,
      createdAt: u.created_at,
    });
  }
  for (const m of stats.recent_activity.marketplace) {
    items.push({
      key: `marketplace-${m.id}`,
      badge: "MP",
      badgeClass: "bg-amber-50 text-amber-600",
      title: m.title,
      sub: `${m.status} · ${m.user?.name ?? "Mahasiswa"}`,
      createdAt: m.created_at,
    });
  }
  for (const r of stats.recent_activity.reports) {
    items.push({
      key: `report-${r.id}`,
      badge: "RP",
      badgeClass: "bg-rose-50 text-rose-600",
      title: r.reason,
      sub: `${shortReportableType(r.reportable_type)} #${r.reportable_id} · ${r.status}`,
      createdAt: r.created_at,
    });
  }
  for (const e of stats.recent_activity.events) {
    items.push({
      key: `event-${e.id}`,
      badge: "EV",
      badgeClass: "bg-indigo-50 text-indigo-600",
      title: e.title,
      sub: e.status,
      createdAt: e.created_at,
    });
  }
  return items
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 8);
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      setStats(await getAdminStats());
    } catch {
      setError(LOAD_ERROR);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch awal via promise callback agar tidak ada setState sinkron di effect.
  useEffect(() => {
    let cancelled = false;
    getAdminStats().then(
      (data) => {
        if (cancelled) return;
        setStats(data);
        setLoading(false);
      },
      () => {
        if (cancelled) return;
        setError(LOAD_ERROR);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 p-4 sm:p-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Ringkasan aktivitas platform, hal yang perlu perhatian, dan
            aktivitas terbaru.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs transition hover:bg-slate-50 disabled:opacity-60 sm:self-auto"
        >
          <svg
            className="h-3.5 w-3.5 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          {refreshing ? "Memuat…" : "Refresh data"}
        </button>
      </section>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="font-medium text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => load(true)}
            className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            Coba lagi
          </button>
        </div>
      )}

      {loading ? (
        <section
          aria-label="Memuat statistik"
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl border border-slate-200/80 bg-white"
            />
          ))}
        </section>
      ) : stats ? (
        <>
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Total Users"
              value={formatNumber(stats.counts.users)}
              sub="Akun mahasiswa terdaftar"
              href="/users"
              linkLabel="Buka Modul"
              footnote={`${formatNumber(stats.active_listings)} listing aktif`}
              icon={cardIcon(
                "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
              )}
              iconClass="bg-blue-50 text-blue-600"
            />
            <StatCard
              label="Marketplace"
              value={formatNumber(stats.counts.marketplace)}
              sub="Listing produk mahasiswa"
              href="/marketplace"
              linkLabel="Lihat Semua"
              footnote="Aktif tayang"
              icon={cardIcon("M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z")}
              iconClass="bg-amber-50 text-amber-600"
            />
            <StatCard
              label="Jasa Mahasiswa"
              value={formatNumber(stats.counts.services)}
              sub="Layanan yang ditawarkan"
              href="/jasa"
              linkLabel="Lihat Semua"
              footnote="Tersedia"
              icon={cardIcon(
                "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
              )}
              iconClass="bg-indigo-50 text-indigo-600"
            />
            <StatCard
              label="Kost"
              value={formatNumber(stats.counts.kost)}
              sub="Hunian sekitar kampus"
              href="/kost"
              linkLabel="Buka Modul"
              footnote="Tersedia"
              icon={cardIcon(
                "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
              )}
              iconClass="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              label="Lost & Found"
              value={formatNumber(stats.counts.lost_found)}
              sub="Barang hilang & ditemukan"
              href="/lost-found"
              linkLabel="Lihat Semua"
              footnote="Kasus tercatat"
              icon={cardIcon(
                "M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z",
              )}
              iconClass="bg-sky-50 text-sky-600"
            />
            <StatCard
              label="Event & Informasi"
              value={formatNumber(stats.counts.events)}
              sub="Agenda & pengumuman kampus"
              href="/events"
              linkLabel="Buka Modul"
              footnote={`${formatNumber(stats.needs_attention.pending_events)} menunggu kurasi`}
              icon={cardIcon(
                "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
              )}
              iconClass="bg-rose-50 text-rose-600"
            />
          </section>

          <section className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            <div className="overflow-hidden rounded-2xl border border-amber-200/90 bg-white shadow-xs lg:col-span-5">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Perlu Tindakan
                  </h3>
                </div>
                <span className="rounded-full border border-amber-200/60 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  {formatNumber(
                    stats.needs_attention.pending_reports +
                      stats.needs_attention.pending_events,
                  )}{" "}
                  Menunggu
                </span>
              </div>
              <div className="space-y-3 divide-y divide-slate-100 p-4">
                <div className="flex items-center justify-between gap-3 pt-1 first:pt-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                      <h4 className="truncate text-xs font-semibold text-slate-800">
                        Laporan menunggu tindakan
                      </h4>
                    </div>
                    <p className="mt-0.5 ml-3.5 text-[11px] text-slate-400">
                      {formatNumber(stats.needs_attention.pending_reports)}{" "}
                      laporan ·{" "}
                      {formatNumber(stats.needs_attention.reported_listings)}{" "}
                      listing dilaporkan ·{" "}
                      {formatNumber(stats.needs_attention.reported_users)} user
                      dilaporkan
                    </p>
                  </div>
                  <Link
                    href="/reports"
                    className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 hover:text-slate-900"
                  >
                    Periksa
                  </Link>
                </div>
                <div className="flex items-center justify-between gap-3 pt-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      <h4 className="truncate text-xs font-semibold text-slate-800">
                        Event menunggu kurasi
                      </h4>
                    </div>
                    <p className="mt-0.5 ml-3.5 text-[11px] text-slate-400">
                      {formatNumber(stats.needs_attention.pending_events)}{" "}
                      event berstatus draft/pending
                    </p>
                  </div>
                  <Link
                    href="/events"
                    className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 hover:text-slate-900"
                  >
                    Kurasi
                  </Link>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-2.5 text-xs text-slate-500">
                <span>SLA respon: &lt; 24 jam kerja</span>
                <Link
                  href="/reports"
                  className="font-medium text-slate-700 hover:text-sky-600"
                >
                  Semua Antrean →
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs lg:col-span-7">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Aktivitas Terbaru
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Log transaksi dan unggahan di platform
                  </p>
                </div>
              </div>
              <div className="p-4">
                {buildFeed(stats).length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">
                    Belum ada aktivitas tercatat.
                  </p>
                ) : (
                  <div className="space-y-3 divide-y divide-slate-100">
                    {buildFeed(stats).map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between pt-1 text-xs first:pt-0"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${item.badgeClass}`}
                          >
                            {item.badge}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-800">
                              {item.title}
                            </p>
                            <p className="truncate text-[11px] text-slate-400">
                              {item.sub}
                            </p>
                          </div>
                        </div>
                        <span className="ml-2 shrink-0 text-[11px] font-medium whitespace-nowrap text-slate-400">
                          {timeAgo(item.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
