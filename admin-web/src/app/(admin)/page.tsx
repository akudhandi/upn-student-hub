"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAdminStats, type DashboardStats } from "@/lib/admin-api";
import { isAbortError } from "@/lib/api";
import {
  formatDate,
  formatNumber,
  shortReportableType,
  timeAgo,
} from "@/lib/format";

const LOAD_ERROR =
  "Gagal memuat statistik dashboard. Pastikan backend berjalan lalu coba lagi.";

type FeedCategory = "all" | "report" | "marketplace" | "event" | "user";

interface FeedItem {
  key: string;
  category: Exclude<FeedCategory, "all">;
  categoryLabel: string;
  badgeClass: string;
  statusLabel: string;
  statusClass: string;
  title: string;
  meta: string;
  href: string;
  createdAt: string;
}

interface ModuleMetric {
  key: string;
  label: string;
  count: number;
  sub: string;
  href: string;
  dotColor: string;
  barColor: string;
}

const STATUS_MAP: Record<string, { label: string; badgeClass: string }> = {
  active: { label: "Aktif", badgeClass: "bg-[#E4F2EA] text-[#1D5C3B]" },
  published: { label: "Tayang", badgeClass: "bg-[#E4F2EA] text-[#1D5C3B]" },
  open: { label: "Terbuka", badgeClass: "bg-[#E0F2FE] text-[#0369A1]" },
  pending: { label: "Pending", badgeClass: "bg-[#FBEAD8] text-[#824B12]" },
  draft: { label: "Draft", badgeClass: "bg-[#EFECE8] text-[#4E4A46]" },
  hidden: { label: "Disembunyikan", badgeClass: "bg-[#FDECEC] text-[#9B2222]" },
  suspended: { label: "Ditangguhkan", badgeClass: "bg-[#FDECEC] text-[#9B2222]" },
  sold: { label: "Terjual", badgeClass: "bg-[#EFECE8] text-[#4E4A46]" },
  resolved: { label: "Selesai", badgeClass: "bg-[#E4F2EA] text-[#1D5C3B]" },
  dismissed: { label: "Ditolak", badgeClass: "bg-[#EFECE8] text-[#4E4A46]" },
};

function translateStatus(raw: string | null | undefined): {
  label: string;
  badgeClass: string;
} {
  if (!raw) {
    return { label: "Tercatat", badgeClass: "bg-[#EFECE8] text-[#4E4A46]" };
  }
  const normalized = raw.trim().toLowerCase();
  return (
    STATUS_MAP[normalized] ?? {
      label: raw,
      badgeClass: "bg-[#EFECE8] text-[#4E4A46]",
    }
  );
}

function formatCurrencyIdr(raw: number | string | null | undefined): string {
  if (raw === null || raw === undefined || raw === "") return "";
  const numeric = typeof raw === "string" ? Number(raw) : raw;
  if (!Number.isFinite(numeric)) return "";
  return `Rp ${formatNumber(numeric)}`;
}

function formatTodayDate(date: Date): string {
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ArrowIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M5 12h14m-6-6l6 6-6 6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </svg>
  );
}

function buildFeed(stats: DashboardStats): FeedItem[] {
  const items: FeedItem[] = [];

  for (const r of stats.recent_activity.reports) {
    const statusInfo = translateStatus(r.status);
    const metaParts = [
      `${shortReportableType(r.reportable_type)} #${r.reportable_id}`,
    ];
    if (r.reporter?.name) {
      metaParts.push(`Pelapor: ${r.reporter.name}`);
    }
    items.push({
      key: `report-${r.id}`,
      category: "report",
      categoryLabel: "Laporan",
      badgeClass: "bg-[#FDECEC] text-[#9B2222]",
      statusLabel: statusInfo.label,
      statusClass: statusInfo.badgeClass,
      title: r.reason,
      meta: metaParts.join(" · "),
      href: "/reports",
      createdAt: r.created_at,
    });
  }

  for (const m of stats.recent_activity.marketplace) {
    const statusInfo = translateStatus(m.status);
    const priceText = formatCurrencyIdr(m.price);
    const metaParts = [priceText, m.user?.name || "Mahasiswa"].filter(Boolean);
    items.push({
      key: `marketplace-${m.id}`,
      category: "marketplace",
      categoryLabel: "Marketplace",
      badgeClass: "bg-[#FBEAD8] text-[#824B12]",
      statusLabel: statusInfo.label,
      statusClass: statusInfo.badgeClass,
      title: m.title,
      meta: metaParts.join(" · "),
      href: "/marketplace",
      createdAt: m.created_at,
    });
  }

  for (const e of stats.recent_activity.events) {
    const statusInfo = translateStatus(e.status);
    items.push({
      key: `event-${e.id}`,
      category: "event",
      categoryLabel: "Event",
      badgeClass: "bg-[#E0F2FE] text-[#0369A1]",
      statusLabel: statusInfo.label,
      statusClass: statusInfo.badgeClass,
      title: e.title,
      meta: e.event_date
        ? `Jadwal ${formatDate(e.event_date)}`
        : "Jadwal belum ditentukan",
      href: "/events",
      createdAt: e.created_at,
    });
  }

  for (const u of stats.recent_activity.users) {
    const statusInfo = translateStatus(u.status);
    const metaParts = [
      u.profile?.faculty,
      u.profile?.nim,
      u.email,
    ].filter(Boolean);
    items.push({
      key: `user-${u.id}`,
      category: "user",
      categoryLabel: "Mahasiswa",
      badgeClass: "bg-[#EFECE8] text-[#3F3C39]",
      statusLabel: statusInfo.label,
      statusClass: statusInfo.badgeClass,
      title: u.profile?.name || u.name || "Mahasiswa baru",
      meta: metaParts.join(" · "),
      href: "/users",
      createdAt: u.created_at,
    });
  }

  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

const FEED_TABS: Array<{
  id: FeedCategory;
  label: string;
  emptyText: string;
  emptyHref: string;
  emptyLinkLabel: string;
}> = [
  {
    id: "all",
    label: "Semua",
    emptyText: "Belum ada aktivitas terbaru yang tercatat di platform.",
    emptyHref: "/marketplace",
    emptyLinkLabel: "Tinjau Marketplace",
  },
  {
    id: "report",
    label: "Laporan",
    emptyText: "Belum ada laporan masuk terbaru.",
    emptyHref: "/reports",
    emptyLinkLabel: "Buka Modul Laporan",
  },
  {
    id: "marketplace",
    label: "Marketplace",
    emptyText: "Belum ada unggahan marketplace terbaru.",
    emptyHref: "/marketplace",
    emptyLinkLabel: "Buka Marketplace",
  },
  {
    id: "event",
    label: "Event",
    emptyText: "Belum ada agenda atau event terbaru.",
    emptyHref: "/events/create",
    emptyLinkLabel: "Buat Event Baru",
  },
  {
    id: "user",
    label: "Mahasiswa",
    emptyText: "Belum ada pendaftaran mahasiswa terbaru.",
    emptyHref: "/users",
    emptyLinkLabel: "Kelola Pengguna",
  },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [activeFeedTab, setActiveFeedTab] = useState<FeedCategory>("all");

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await getAdminStats();
      setStats(data);
      setLastUpdatedAt(new Date());
    } catch {
      setError(LOAD_ERROR);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch awal via promise callback agar tidak ada setState sinkron di effect.
  useEffect(() => {
    const controller = new AbortController();
    getAdminStats({ signal: controller.signal }).then(
      (data) => {
        if (controller.signal.aborted) return;
        setError(null);
        setStats(data);
        setLastUpdatedAt(new Date());
        setLoading(false);
      },
      (err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setError(LOAD_ERROR);
        setLoading(false);
      },
    );
    return () => {
      controller.abort();
    };
  }, []);

  const allFeed = useMemo(() => (stats ? buildFeed(stats) : []), [stats]);

  const tabBuckets = useMemo(() => {
    const buckets: Record<FeedCategory, FeedItem[]> = {
      all: allFeed.slice(0, 10),
      report: allFeed.filter((i) => i.category === "report").slice(0, 5),
      marketplace: allFeed
        .filter((i) => i.category === "marketplace")
        .slice(0, 5),
      event: allFeed.filter((i) => i.category === "event").slice(0, 5),
      user: allFeed.filter((i) => i.category === "user").slice(0, 5),
    };
    return buckets;
  }, [allFeed]);

  const visibleFeed = tabBuckets[activeFeedTab];
  const activeTabMeta =
    FEED_TABS.find((t) => t.id === activeFeedTab) ?? FEED_TABS[0];

  const totalPending = stats
    ? stats.needs_attention.pending_reports +
      stats.needs_attention.pending_events
    : 0;

  const totalListingPool = stats
    ? stats.counts.marketplace + stats.counts.services + stats.counts.lost_found
    : 0;

  const totalContentItems = stats
    ? stats.counts.marketplace +
      stats.counts.services +
      stats.counts.lost_found +
      stats.counts.events
    : 0;

  const moduleMetrics: ModuleMetric[] = stats
    ? [
        {
          key: "marketplace",
          label: "Marketplace",
          count: stats.counts.marketplace,
          sub: "Listing produk mahasiswa",
          href: "/marketplace",
          dotColor: "bg-[#141416]",
          barColor: "#141416",
        },
        {
          key: "services",
          label: "Jasa Mahasiswa",
          count: stats.counts.services,
          sub: "Layanan tersedia",
          href: "/jasa",
          dotColor: "bg-[#57534E]",
          barColor: "#57534E",
        },
        {
          key: "lost_found",
          label: "Lost & Found",
          count: stats.counts.lost_found,
          sub: "Kasus barang tercatat",
          href: "/lost-found",
          dotColor: "bg-[#9A9289]",
          barColor: "#9A9289",
        },
        {
          key: "events",
          label: "Event & Informasi",
          count: stats.counts.events,
          sub: `${formatNumber(stats.needs_attention.pending_events)} menunggu kurasi`,
          href: "/events",
          dotColor: "bg-[#0284C7]",
          barColor: "#0284C7",
        },
      ]
    : [];

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:space-y-8 sm:px-8 sm:py-8">
      {/* Zone A: Compact Editorial Masthead */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[#141416] sm:text-[28px]">
            Ringkasan Operasional
          </h1>
          <p className="mt-1 text-[14px] text-[#57534E]">
            {lastUpdatedAt
              ? `${formatTodayDate(lastUpdatedAt)} · Diperbarui pukul ${formatClock(lastUpdatedAt)}`
              : "Memuat status terbaru ekosistem UPN Student Hub…"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => load(true)}
            disabled={loading || refreshing}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[#D5CEC6] bg-white px-4 text-[13px] font-semibold text-[#141416] transition-colors duration-150 hover:border-[#B9B0A6] hover:bg-[#FAF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F1EE] disabled:opacity-60"
          >
            <svg
              className={`h-3.5 w-3.5 text-[#57534E] ${refreshing ? "motion-safe:animate-spin" : ""}`}
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
          <Link
            href="/events/create"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#141416] px-4 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-[#2A2A2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F1EE]"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M12 5v14m-7-7h14"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            Buat Event
          </Link>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-[20px] border border-[#F3C6C6] bg-[#FDECEC] p-5 text-[14px] sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="font-medium text-[#9B2222]">{error}</p>
          <button
            type="button"
            onClick={() => load(true)}
            className="h-10 shrink-0 rounded-full bg-[#141416] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#2A2A2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDECEC]"
          >
            Coba lagi
          </button>
        </div>
      )}

      {loading && !stats ? (
        <div
          aria-label="Memuat statistik dashboard"
          className="space-y-6 sm:space-y-8"
        >
          <div className="h-[260px] animate-pulse rounded-[20px] bg-[#141416]/90" />
          <div className="h-[190px] animate-pulse rounded-[20px] border border-[#E5E0DA] bg-white" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="h-[360px] animate-pulse rounded-[20px] border border-[#E5E0DA] bg-white lg:col-span-8" />
            <div className="h-[360px] animate-pulse rounded-[20px] border border-[#E5E0DA] bg-white lg:col-span-4" />
          </div>
        </div>
      ) : stats ? (
        <>
          {/* Zone B: Obsidian Command Band */}
          <section
            aria-label="Fokus moderasi dan metrik inti"
            className="rounded-[20px] bg-[#141416] p-6 text-white sm:p-7"
          >
            <div className="grid grid-cols-1 gap-7 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7">
                <h2 className="font-display text-2xl leading-[1.2] font-semibold tracking-tight text-white sm:text-[30px]">
                  {totalPending > 0
                    ? `${formatNumber(totalPending)} antrean perlu ditinjau agar platform tetap terjaga.`
                    : "Ekosistem UPN Student Hub berjalan stabil tanpa antrean tertunda."}
                </h2>
                <p className="mt-2.5 max-w-xl text-[14px] leading-relaxed text-[#B9B4AE]">
                  {formatNumber(stats.counts.users)} mahasiswa terdaftar dengan{" "}
                  {formatNumber(stats.active_listings)} listing aktif di
                  Marketplace, Jasa, dan Lost &amp; Found.
                </p>

                <div className="mt-4">
                  <span
                    className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-[13px] font-medium ${
                      totalPending > 0
                        ? "border-[#5C3F19] bg-[#291E12] text-[#FBBF24]"
                        : "border-[#1F4A36] bg-[#12261C] text-[#6EE7B7]"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 rounded-full ${
                        totalPending > 0 ? "bg-[#FBBF24]" : "bg-[#6EE7B7]"
                      }`}
                    />
                    {totalPending > 0
                      ? `${formatNumber(totalPending)} item menunggu tindakan`
                      : "Antrean moderasi bersih"}
                  </span>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    href="/reports"
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[13px] font-semibold text-[#141416] transition-colors duration-150 hover:bg-[#EFECE8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#141416]"
                  >
                    <span>Periksa Laporan</span>
                    {stats.needs_attention.pending_reports > 0 && (
                      <span className="rounded-md bg-[#141416] px-1.5 py-0.5 text-[13px] font-semibold tabular-nums text-white">
                        {formatNumber(stats.needs_attention.pending_reports)}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/events"
                    className="inline-flex h-11 items-center rounded-full border border-[#34343A] bg-[#1D1D21] px-5 text-[13px] font-semibold text-white transition-colors duration-150 hover:border-[#4E4E56] hover:bg-[#26262B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#141416]"
                  >
                    Kurasi Event (
                    {formatNumber(stats.needs_attention.pending_events)})
                  </Link>
                  <Link
                    href="/notifications"
                    className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-[#D6D2CC] transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#141416]"
                  >
                    <span>Kirim Notifikasi</span>
                    <ArrowIcon />
                  </Link>
                </div>
              </div>

              <div className="border-t border-[#28282D] pt-6 lg:col-span-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-7">
                <div className="grid grid-cols-2 gap-4">
                  <Link
                    href="/users"
                    className="group rounded-xl border border-[#28282D] bg-[#1B1B1F] p-4 transition-colors duration-150 hover:border-[#3D3D45] hover:bg-[#222227] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <p className="text-[13px] font-medium text-[#A8A39D]">
                      Mahasiswa Terdaftar
                    </p>
                    <p className="mt-2 font-display text-3xl font-bold tracking-tight tabular-nums text-white">
                      {formatNumber(stats.counts.users)}
                    </p>
                    <p className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-[#D6D2CC] group-hover:text-white">
                      <span>Kelola akun</span>
                      <ArrowIcon className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                    </p>
                  </Link>

                  <Link
                    href="/marketplace"
                    className="group rounded-xl border border-[#28282D] bg-[#1B1B1F] p-4 transition-colors duration-150 hover:border-[#3D3D45] hover:bg-[#222227] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <p className="text-[13px] font-medium text-[#A8A39D]">
                      Listing Aktif
                    </p>
                    <p className="mt-2 font-display text-3xl font-bold tracking-tight tabular-nums text-white">
                      {formatNumber(stats.active_listings)}
                    </p>
                    <p className="mt-2 text-[13px] tabular-nums text-[#B9B4AE]">
                      dari {formatNumber(totalListingPool)} total
                    </p>
                  </Link>
                </div>

                <div className="mt-4 divide-y divide-[#28282D] overflow-hidden rounded-xl border border-[#28282D] bg-[#1B1B1F]">
                  <Link
                    href="/reports"
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors duration-150 hover:bg-[#222227] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-white">
                        Laporan Pending
                      </p>
                      <p className="truncate text-[13px] text-[#A8A39D]">
                        {formatNumber(stats.needs_attention.reported_listings)}{" "}
                        listing ·{" "}
                        {formatNumber(stats.needs_attention.reported_users)}{" "}
                        pengguna
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[13px] font-semibold tabular-nums ${
                        stats.needs_attention.pending_reports > 0
                          ? "bg-[#311717] text-[#FCA5A5]"
                          : "bg-[#242429] text-[#B9B4AE]"
                      }`}
                    >
                      {formatNumber(stats.needs_attention.pending_reports)}
                    </span>
                  </Link>

                  <Link
                    href="/events"
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors duration-150 hover:bg-[#222227] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-white">
                        Event Menunggu Kurasi
                      </p>
                      <p className="truncate text-[13px] text-[#A8A39D]">
                        Status draft &amp; pending publikasi
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[13px] font-semibold tabular-nums ${
                        stats.needs_attention.pending_events > 0
                          ? "bg-[#291E12] text-[#FBBF24]"
                          : "bg-[#242429] text-[#B9B4AE]"
                      }`}
                    >
                      {formatNumber(stats.needs_attention.pending_events)}
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Zone C: Unified 4-Column Module Ledger Strip */}
          <section
            aria-labelledby="module-ledger-heading"
            className="overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white"
          >
            <div className="flex flex-col gap-3 border-b border-[#EFECE8] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2
                  id="module-ledger-heading"
                  className="font-display text-[16px] font-semibold text-[#141416]"
                >
                  Distribusi Konten Modul
                </h2>
                <span className="text-[13px] text-[#6E6A66]">
                  {formatNumber(totalContentItems)} total item tercatat
                </span>
              </div>

              <div
                aria-hidden="true"
                className="flex h-2 w-full overflow-hidden rounded-full bg-[#EFECE8] sm:w-56"
              >
                {totalContentItems > 0 &&
                  moduleMetrics.map((mod) => {
                    const widthPct = (mod.count / totalContentItems) * 100;
                    if (widthPct <= 0) return null;
                    return (
                      <span
                        key={mod.key}
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: mod.barColor,
                        }}
                        className="h-full"
                      />
                    );
                  })}
              </div>
            </div>

            <div className="grid grid-cols-1 divide-y divide-[#EFECE8] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x lg:divide-[#EFECE8]">
              {moduleMetrics.map((mod, idx) => {
                const share =
                  totalContentItems > 0
                    ? Math.round((mod.count / totalContentItems) * 100)
                    : 0;
                const tabletGridBorders = [
                  idx % 2 === 0
                    ? "sm:border-r sm:border-[#EFECE8] lg:border-r-0"
                    : "",
                  idx >= 2
                    ? "sm:border-t sm:border-[#EFECE8] lg:border-t-0"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <Link
                    key={mod.key}
                    href={mod.href}
                    className={`group flex flex-col justify-between p-5 transition-colors duration-150 hover:bg-[#FAF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#141416] sm:p-6 ${tabletGridBorders}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#57534E]">
                        <span
                          aria-hidden="true"
                          className={`h-2.5 w-2.5 rounded-sm ${mod.dotColor}`}
                        />
                        {mod.label}
                      </span>
                      <span className="rounded-md bg-[#F4F1EE] px-2 py-0.5 text-[13px] font-medium tabular-nums text-[#57534E]">
                        {share}%
                      </span>
                    </div>

                    <p className="mt-4 font-display text-[30px] leading-none font-bold tracking-tight tabular-nums text-[#141416]">
                      {formatNumber(mod.count)}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-2 text-[13px]">
                      <span className="truncate text-[#6E6A66]">{mod.sub}</span>
                      <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-[#141416]">
                        <span>Buka</span>
                        <ArrowIcon className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Zone D: Operational Split */}
          <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            {/* Left 8 Columns: Tabbed Activity Stream */}
            <div className="overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white lg:col-span-8">
              <div className="space-y-3 border-b border-[#EFECE8] px-6 py-4">
                <div>
                  <h2 className="font-display text-[16px] font-semibold text-[#141416]">
                    Aktivitas Terbaru
                  </h2>
                  <p className="mt-0.5 text-[13px] text-[#6E6A66]">
                    Unggahan, laporan, dan pendaftaran terbaru dari seluruh
                    modul.
                  </p>
                </div>

                <div
                  role="tablist"
                  aria-label="Filter aktivitas terbaru"
                  className="flex flex-wrap gap-2"
                >
                  {FEED_TABS.map((tab) => {
                    const selected = activeFeedTab === tab.id;
                    const count = tabBuckets[tab.id].length;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        aria-controls="activity-feed-panel"
                        id={`activity-tab-${tab.id}`}
                        onClick={() => setActiveFeedTab(tab.id)}
                        className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 ${
                          selected
                            ? "bg-[#141416] text-white"
                            : "bg-[#F4F1EE] text-[#57534E] hover:bg-[#E7E2DC] hover:text-[#141416]"
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`tabular-nums ${
                            selected ? "text-[#D6D2CC]" : "text-[#6E6A66]"
                          }`}
                        >
                          {formatNumber(count)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                id="activity-feed-panel"
                role="tabpanel"
                aria-labelledby={`activity-tab-${activeFeedTab}`}
              >
                {visibleFeed.length === 0 ? (
                  <div className="px-6 py-10 text-center">
                    <p className="text-[14px] text-[#6E6A66]">
                      {activeTabMeta.emptyText}
                    </p>
                    <Link
                      href={activeTabMeta.emptyHref}
                      className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full border border-[#D5CEC6] bg-white px-4 text-[13px] font-semibold text-[#141416] transition-colors hover:bg-[#FAF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                    >
                      <span>{activeTabMeta.emptyLinkLabel}</span>
                      <ArrowIcon />
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-[#EFECE8]">
                    {visibleFeed.map((item) => (
                      <Link
                        key={item.key}
                        href={item.href}
                        className="group flex flex-col justify-between gap-2 px-6 py-4 transition-colors duration-150 hover:bg-[#FAF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#141416] sm:flex-row sm:items-center sm:gap-4"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <span
                            className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[13px] font-semibold ${item.badgeClass}`}
                          >
                            {item.categoryLabel}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-semibold text-[#141416] group-hover:underline">
                              {item.title}
                            </p>
                            <p className="mt-0.5 truncate text-[13px] text-[#6E6A66]">
                              {item.meta}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2.5 self-start sm:self-center">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[13px] font-medium ${item.statusClass}`}
                          >
                            {item.statusLabel}
                          </span>
                          <span className="text-[13px] whitespace-nowrap tabular-nums text-[#6E6A66]">
                            {timeAgo(item.createdAt)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right 4 Columns: Moderation Summary + Quick Actions */}
            <div className="space-y-5 lg:col-span-4">
              <div className="rounded-[20px] border border-[#E5E0DA] bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-[16px] font-semibold text-[#141416]">
                    Ringkasan Moderasi
                  </h2>
                  <Link
                    href="/reports"
                    className="text-[13px] font-semibold text-[#141416] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                  >
                    Semua Antrean
                  </Link>
                </div>

                <dl className="mt-4 divide-y divide-[#EFECE8]">
                  <div className="flex items-center justify-between py-3 first:pt-0">
                    <dt className="text-[14px] text-[#57534E]">
                      Listing dilaporkan
                    </dt>
                    <dd className="text-[14px] font-semibold tabular-nums text-[#141416]">
                      {formatNumber(stats.needs_attention.reported_listings)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-[14px] text-[#57534E]">
                      Pengguna dilaporkan
                    </dt>
                    <dd className="text-[14px] font-semibold tabular-nums text-[#141416]">
                      {formatNumber(stats.needs_attention.reported_users)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-3 last:pb-0">
                    <dt className="text-[14px] text-[#57534E]">
                      Event butuh kurasi
                    </dt>
                    <dd className="text-[14px] font-semibold tabular-nums text-[#141416]">
                      {formatNumber(stats.needs_attention.pending_events)}
                    </dd>
                  </div>
                </dl>

                <p className="mt-4 border-t border-[#EFECE8] pt-3.5 text-[13px] text-[#6E6A66]">
                  Target respons antrean moderasi: &lt; 24 jam kerja.
                </p>
              </div>

              <div className="rounded-[20px] border border-[#E5E0DA] bg-[#EFECE8]/80 p-5 sm:p-6">
                <h2 className="font-display text-[16px] font-semibold text-[#141416]">
                  Pintasan Operasional
                </h2>
                <p className="mt-1 text-[13px] text-[#57534E]">
                  Akses cepat ke tugas administrasi yang paling sering dipakai.
                </p>

                <div className="mt-4 space-y-2.5">
                  {[
                    {
                      label: "Buat Event & Pengumuman",
                      href: "/events/create",
                    },
                    {
                      label: "Kelola Pengguna & Akun Resmi",
                      href: "/users",
                    },
                    {
                      label: "Atur Kategori Platform",
                      href: "/categories",
                    },
                    {
                      label: "Kirim Notifikasi Broadcast",
                      href: "/notifications",
                    },
                  ].map((shortcut) => (
                    <Link
                      key={shortcut.href}
                      href={shortcut.href}
                      className="group flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-[#E5E0DA] bg-white px-4 py-2.5 text-[14px] font-medium text-[#141416] transition-colors duration-150 hover:border-[#D5CEC6] hover:bg-[#FAF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                    >
                      <span>{shortcut.label}</span>
                      <ArrowIcon className="h-4 w-4 shrink-0 text-[#6E6A66] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[#141416]" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
