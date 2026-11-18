"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ListingImage from "@/components/ListingImage";
import VerifiedBadge, { isVerifiedEventOrganizer } from "@/components/VerifiedBadge";
import { apiFetch } from "@/lib/api";
import {
  getUser,
  isOfficialAccount,
  USER_UPDATED_EVENT,
  type AuthUser,
} from "@/lib/auth";
import type { ApiImage, ImageModule } from "@/lib/images";
import { fetchConversations, type ConversationItem } from "@/lib/interactions";

type ModuleCard = {
  title: string;
  description: string;
  href: string;
};

const MODULES: ModuleCard[] = [
  {
    title: "Marketplace",
    description: "Jual beli buku kuliah, elektronik, dan perlengkapan.",
    href: "/marketplace",
  },
  {
    title: "Jasa & Layanan",
    description: "Les privat, desain, dan servis oleh sesama mahasiswa.",
    href: "/services",
  },
  {
    title: "Barang Hilang",
    description: "Laporkan atau temukan barang hilang di kampus.",
    href: "/lost-found",
  },
  {
    title: "Event & Info",
    description: "Seminar, lomba, agenda UKM, dan info resmi kampus.",
    href: "/events",
  },
];

type PaginatedData<T> = {
  message: string;
  data: {
    data: T[];
    total?: number;
  };
};

type CommunityFeedItem = {
  key: string;
  module: ImageModule;
  moduleBadge: string;
  badgeClass: string;
  id: number;
  title: string;
  subtitle: string;
  metaRight: string;
  href: string;
  createdAt: string;
  isVerified?: boolean;
  images?: ApiImage[] | null;
};

type UpcomingEventItem = {
  id: number;
  title: string;
  organizer_name: string;
  event_date: string;
  is_verified: boolean;
};

type ModuleCounts = {
  marketplace: number;
  services: number;
  lostFound: number;
  events: number;
};

type FeedFilter = "all" | ImageModule;

const FEED_FILTERS: { id: FeedFilter; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "marketplace", label: "Marketplace" },
  { id: "service", label: "Jasa" },
  { id: "lostfound", label: "Temuan" },
  { id: "event", label: "Event" },
];

const WEEKDAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"] as const;

function formatRupiah(value: number | string): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatTimeAgo(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins}m lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}j lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}h lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function ModuleIcon({ title }: { title: string }) {
  let icon: React.ReactNode;
  if (title === "Marketplace") {
    icon = (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 8h12l-1 11H7L6 8z" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" />
        <path d="M9.5 8V6.5a2.5 2.5 0 015 0V8" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      </svg>
    );
  } else if (title === "Jasa & Layanan") {
    icon = (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="7" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.65" />
        <path d="M8.5 7V5a1.5 1.5 0 011.5-1.5h4A1.5 1.5 0 0115.5 5v2" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 12h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  } else if (title === "Event & Info") {
    icon = (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="5.5" width="16" height="14.5" rx="3" stroke="currentColor" strokeWidth="1.65" />
        <path d="M8 3.5v3M16 3.5v3M4 10h16" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      </svg>
    );
  } else {
    icon = (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.65" />
        <path d="M15.5 15.5L20 20" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F4F1EE] text-[#141416] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 group-hover:bg-[#141416] group-hover:text-white">
      {icon}
    </span>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [feed, setFeed] = useState<CommunityFeedItem[] | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEventItem[] | null>(
    null
  );
  const [counts, setCounts] = useState<ModuleCounts | null>(null);
  const [activeFilter, setActiveFilter] = useState<FeedFilter>("all");
  const [conversations, setConversations] = useState<ConversationItem[] | null>(
    null
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate user from localStorage on mount
    setUser(getUser());
    function syncUser() {
      setUser(getUser());
    }
    window.addEventListener(USER_UPDATED_EVENT, syncUser);
    return () => window.removeEventListener(USER_UPDATED_EVENT, syncUser);
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      apiFetch<
        PaginatedData<{
          id: number;
          title: string;
          price: number | string;
          created_at: string;
          user?: { name: string } | null;
          category?: { name: string } | null;
          images?: ApiImage[] | null;
        }>
      >("/v1/marketplace").catch(() => null),
      apiFetch<
        PaginatedData<{
          id: number;
          title: string;
          price_min: number | string;
          created_at: string;
          user?: { name: string } | null;
          category?: { name: string } | null;
          images?: ApiImage[] | null;
        }>
      >("/v1/services").catch(() => null),
      apiFetch<
        PaginatedData<{
          id: number;
          type: string;
          title: string;
          location: string;
          created_at: string;
          user?: { name: string } | null;
          images?: ApiImage[] | null;
        }>
      >("/v1/lost-found").catch(() => null),
      apiFetch<
        PaginatedData<{
          id: number;
          title: string;
          organizer_name: string;
          event_date: string;
          created_at: string;
          is_verified?: boolean;
          user?: { id: number; name: string; account_type?: string } | null;
          images?: ApiImage[] | null;
        }>
      >("/v1/events").catch(() => null),
      apiFetch<
        PaginatedData<{
          id: number;
          title: string;
          organizer_name: string;
          event_date: string;
          is_verified?: boolean;
          user?: { id: number; name: string; account_type?: string } | null;
        }>
      >("/v1/events?upcoming=1").catch(() => null),
    ]).then(([mkt, svc, lf, evt, upcomingEvt]) => {
      if (cancelled) return;

      const mktRows = mkt?.data.data ?? [];
      const svcRows = svc?.data.data ?? [];
      const lfRows = lf?.data.data ?? [];
      const evtRows = evt?.data.data ?? [];
      const upcomingEvtRows = upcomingEvt?.data.data ?? [];

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      setCounts({
        marketplace: mkt?.data.total ?? mktRows.length,
        services: svc?.data.total ?? svcRows.length,
        lostFound: lf?.data.total ?? lfRows.length,
        events: evt?.data.total ?? evtRows.length,
      });

      setUpcomingEvents(
        upcomingEvtRows
          .filter((item) => {
            const eventTime = new Date(item.event_date).getTime();
            return !Number.isNaN(eventTime) && eventTime >= startOfToday.getTime();
          })
          .sort(
            (a, b) =>
              new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
          )
          .slice(0, 4)
          .map((item) => ({
            id: item.id,
            title: item.title,
            organizer_name: item.organizer_name,
            event_date: item.event_date,
            is_verified: isVerifiedEventOrganizer(item),
          }))
      );

      const merged: CommunityFeedItem[] = [];

      for (const item of mktRows.slice(0, 4)) {
        merged.push({
          key: `mkt-${item.id}`,
          module: "marketplace",
          moduleBadge: "Marketplace",
          badgeClass: "bg-[#FBEAD8] text-[#8E581A]",
          id: item.id,
          title: item.title,
          subtitle: `${item.category?.name ?? "Produk"} · oleh ${item.user?.name ?? "Mahasiswa"}`,
          metaRight: formatRupiah(item.price),
          href: `/marketplace/${item.id}`,
          createdAt: item.created_at,
          images: item.images,
        });
      }

      for (const item of svcRows.slice(0, 3)) {
        merged.push({
          key: `svc-${item.id}`,
          module: "service",
          moduleBadge: "Jasa",
          badgeClass: "bg-[#E4F2EA] text-[#226A46]",
          id: item.id,
          title: item.title,
          subtitle: `${item.category?.name ?? "Layanan"} · oleh ${item.user?.name ?? "Mahasiswa"}`,
          metaRight: `Mulai ${formatRupiah(item.price_min)}`,
          href: `/services/${item.id}`,
          createdAt: item.created_at,
          images: item.images,
        });
      }

      for (const item of lfRows.slice(0, 3)) {
        merged.push({
          key: `lf-${item.id}`,
          module: "lostfound",
          moduleBadge: item.type === "lost" ? "Hilang" : "Ditemukan",
          badgeClass:
            item.type === "lost"
              ? "bg-[#FCEAE9] text-[#A43F3F]"
              : "bg-[#ECEAF9] text-[#53469B]",
          id: item.id,
          title: item.title,
          subtitle: `${item.location} · oleh ${item.user?.name ?? "Mahasiswa"}`,
          metaRight: formatTimeAgo(item.created_at),
          href: `/lost-found/${item.id}`,
          createdAt: item.created_at,
          images: item.images,
        });
      }

      for (const item of evtRows.slice(0, 3)) {
        merged.push({
          key: `evt-${item.id}`,
          module: "event",
          moduleBadge: "Event",
          badgeClass: "bg-[#E7EEF9] text-[#35518C]",
          id: item.id,
          title: item.title,
          subtitle: item.organizer_name,
          metaRight: new Date(item.event_date).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
          }),
          href: `/events/${item.id}`,
          createdAt: item.created_at,
          isVerified: isVerifiedEventOrganizer(item),
          images: item.images,
        });
      }

      merged.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setFeed(merged);
    });

    fetchConversations()
      .then((list) => {
        if (!cancelled) setConversations(list.slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) setConversations([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredFeed = useMemo(() => {
    if (!feed) return null;
    if (activeFilter === "all") return feed.slice(0, 6);
    return feed.filter((item) => item.module === activeFilter).slice(0, 6);
  }, [feed, activeFilter]);

  const calendarMeta = useMemo(() => {
    const today = new Date();
    const monthLabel = today.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const eventDayKeys = new Set(
      (upcomingEvents ?? []).map((evt) => {
        const d = new Date(evt.event_date);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
    );

    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const isToday = date.toDateString() === today.toDateString();
      return {
        label: WEEKDAY_LABELS[i],
        dayNum: String(date.getDate()).padStart(2, "0"),
        isToday,
        hasEvent: eventDayKeys.has(key),
      };
    });

    return { monthLabel, days };
  }, [upcomingEvents]);

  const displayName =
    (user?.profile && typeof user.profile === "object" && "name" in user.profile
      ? (user.profile as { name?: string }).name
      : null) ||
    user?.name ||
    null;
  const firstName = displayName ? displayName.split(" ")[0] : null;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Selamat Pagi";
    if (h < 18) return "Selamat Siang";
    return "Selamat Malam";
  })();

  const studentMeta = (() => {
    if (!user) return null;
    const faculty =
      user.profile && typeof user.profile === "object" && "faculty" in user.profile
        ? (user.profile as { faculty?: string | null }).faculty
        : null;
    const nim =
      user.profile && typeof user.profile === "object" && "nim" in user.profile
        ? (user.profile as { nim?: string | null }).nim
        : null;
    const parts: string[] = [];
    if (nim) parts.push(`NPM ${nim}`);
    if (faculty) parts.push(faculty);
    if (parts.length === 0 && user.email) parts.push(user.email);
    return parts.join(" · ");
  })();

  const summaryStats = [
    {
      label: "Marketplace Aktif",
      value: counts ? counts.marketplace : null,
      href: "/marketplace",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 8h12l-1 11H7L6 8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M9.5 8V6.5a2.5 2.5 0 015 0V8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Jasa & Layanan",
      value: counts ? counts.services : null,
      href: "/services",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="7" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8.5 7V5a1.5 1.5 0 011.5-1.5h4A1.5 1.5 0 0115.5 5v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 12h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Laporan Temuan",
      value: counts ? counts.lostFound : null,
      href: "/lost-found",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6" />
          <path d="M15.5 15.5L20 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Event Kampus",
      value: counts ? counts.events : null,
      href: "/events",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="4" y="5.5" width="16" height="14.5" rx="3" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 3.5v3M16 3.5v3M4 10h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <div className="auth-shell-enter mx-auto max-w-[1160px] space-y-6 lg:space-y-7">
      {/* Planex-inspired Greeting & Primary Action Header */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[#141416] sm:text-[30px]">
            {firstName ? `${greeting}, ${firstName}` : greeting}
          </h1>
          <p className="mt-1 text-xs font-medium text-[#787470] sm:text-[13px]">
            {studentMeta
              ? `${studentMeta} · Ringkasan aktivitas portal mahasiswa Anda.`
              : "Ringkasan aktivitas marketplace, jasa, temuan, dan agenda kampus Anda."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isOfficialAccount(user) && (
            <Link
              href="/events/create"
              className="inline-flex h-10 items-center justify-center rounded-full border border-[#E2DDD7] bg-white px-4 text-xs font-medium text-[#27272A] transition-all duration-200 hover:-translate-y-[1px] hover:border-[#D2CBC3] hover:bg-[#FAF8F6]"
            >
              Ajukan Event
            </Link>
          )}
          <Link
            href="/marketplace?action=create"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#141416] px-5 text-xs font-medium text-white transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#242428] hover:shadow-[0_12px_24px_-12px_rgba(20,20,22,0.42)] active:translate-y-0 active:scale-[0.99]"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            Pasang Iklan
          </Link>
        </div>
      </section>

      {/* Open Warm-Alabaster Live Metric Row (Planex Style) */}
      <section
        aria-label="Ringkasan jumlah konten portal"
        className="grid grid-cols-2 gap-4 border-y border-[#E6E1DC] py-5 lg:grid-cols-4 lg:gap-6"
      >
        {summaryStats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group flex flex-col justify-between rounded-2xl px-2 py-1 transition-colors hover:bg-white/60"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-[#85817C] transition-colors group-hover:text-[#141416]">
                {stat.icon}
              </span>
              {stat.value === null ? (
                <span className="h-7 w-12 animate-pulse rounded-md bg-[#E6E1DC]" />
              ) : (
                <span className="font-display text-2xl font-semibold tracking-tight text-[#141416] sm:text-[28px]">
                  {stat.value}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs font-medium text-[#787470] transition-colors group-hover:text-[#141416]">
              {stat.label}
            </p>
          </Link>
        ))}
      </section>

      {/* Main 2-Column Workspace Grid */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.65fr_0.95fr]">
        {/* Left Primary Column */}
        <div className="space-y-6">
          {/* Community Activity Table/Feed Card */}
          <div className="rounded-[24px] border border-[#E7E2DD] bg-white p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 border-b border-[#F1EDE9] pb-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-display text-base font-semibold tracking-tight text-[#141416]">
                  Aktivitas Komunitas Terbaru
                </h2>
                <p className="mt-0.5 text-xs text-[#787470]">
                  Pembaruan terkini dari seluruh modul portal mahasiswa
                </p>
              </div>
              <Link
                href="/marketplace"
                className="inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-[#F4F1EE] px-3.5 text-xs font-medium text-[#3F3D3A] transition-colors hover:bg-[#EAE6E2] hover:text-[#141416]"
              >
                Jelajahi Katalog →
              </Link>
            </div>

            {/* Interactive Module Filter Pills */}
            <div
              role="tablist"
              aria-label="Filter aktivitas komunitas"
              className="mt-4 flex flex-wrap items-center gap-1.5"
            >
              {FEED_FILTERS.map((f) => {
                const selected = activeFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveFilter(f.id)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                      selected
                        ? "bg-[#141416] text-white shadow-2xs"
                        : "bg-[#F4F1EE] text-[#6E6A66] hover:bg-[#EAE6E2] hover:text-[#141416]"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Feed Rows */}
            <div className="mt-4">
              {!filteredFeed ? (
                <div className="space-y-3 py-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-2xl bg-[#F4F1EE]"
                    />
                  ))}
                </div>
              ) : filteredFeed.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl bg-[#FAF8F6] px-6 py-10 text-center">
                  <h3 className="font-display text-sm font-semibold text-[#141416]">
                    Belum ada aktivitas pada kategori ini
                  </h3>
                  <p className="mt-1 max-w-[340px] text-xs leading-5 text-[#787470]">
                    Jadilah yang pertama memasang iklan barang, menawarkan jasa, atau membuat laporan.
                  </p>
                  <Link
                    href="/marketplace?action=create"
                    className="mt-4 inline-flex h-9 items-center rounded-full bg-[#141416] px-4 text-xs font-medium text-white transition-colors hover:bg-[#27272A]"
                  >
                    + Pasang Iklan
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-[#F3EFEA]">
                  {filteredFeed.map((item) => (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        className="group -mx-2 flex items-center gap-3.5 rounded-2xl px-2 py-3.5 transition-colors hover:bg-[#FAF8F6]"
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#EAE5DF] bg-[#F4F1EE]">
                          <ListingImage
                            module={item.module}
                            seed={item.id}
                            images={item.images}
                            hint={item.title}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${item.badgeClass}`}
                            >
                              {item.moduleBadge}
                            </span>
                            <span className="text-[11px] text-[#9A958F]">
                              {formatTimeAgo(item.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-[13px] font-semibold text-[#141416] group-hover:underline">
                            {item.title}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-[#787470]">
                            <span className="truncate">{item.subtitle}</span>
                            {item.isVerified && <VerifiedBadge size="xs" />}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs font-semibold text-[#141416]">
                            {item.metaRight}
                          </span>
                          <span
                            aria-hidden="true"
                            className="text-xs text-[#A8A39E] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#141416]"
                          >
                            ›
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Warm Stone Quick Module Bento */}
          <div className="rounded-[24px] border border-[#E6E1DC] bg-[#ECE8E4]/80 p-4 sm:p-5">
            <div className="mb-3.5 flex items-center justify-between px-1">
              <h2 className="font-display text-sm font-semibold text-[#141416]">
                Akses Cepat Modul
              </h2>
              <span className="text-[11px] font-medium text-[#787470]">
                4 Layanan Kampus
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {MODULES.map((m) => (
                <Link
                  key={m.title}
                  href={m.href}
                  className="group flex items-start gap-3.5 rounded-2xl border border-[#E5E0DA] bg-white p-4 shadow-[0_6px_18px_-14px_rgba(20,20,22,0.12)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-[#D5CEC6] hover:shadow-[0_14px_26px_-14px_rgba(20,20,22,0.18)]"
                >
                  <ModuleIcon title={m.title} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-[13px] font-semibold text-[#141416]">
                        {m.title}
                      </h3>
                      <span
                        aria-hidden="true"
                        className="text-xs text-[#A8A39E] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#141416]"
                      >
                        ›
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[#787470]">
                      {m.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Companion Column */}
        <div className="space-y-6">
          {/* Calendar & Upcoming Events Card (Planex Right Panel Signature) */}
          <div className="rounded-[24px] border border-[#E7E2DD] bg-white p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-semibold tracking-tight text-[#141416]">
                  Agenda Kampus
                </h2>
                <p className="text-xs capitalize text-[#787470]">
                  {calendarMeta.monthLabel}
                </p>
              </div>
              <Link
                href="/events"
                className="inline-flex h-8 items-center justify-center rounded-full bg-[#141416] px-3.5 text-[11px] font-medium text-white transition-colors hover:bg-[#27272A]"
              >
                Semua Event
              </Link>
            </div>

            {/* Clean Current Week Strip */}
            <div className="mt-4 grid grid-cols-7 gap-1.5 rounded-2xl bg-[#F6F4F1] p-2">
              {calendarMeta.days.map((day) => (
                <div
                  key={`${day.label}-${day.dayNum}`}
                  className={`flex flex-col items-center rounded-xl py-2 text-center transition-colors ${
                    day.isToday
                      ? "bg-[#141416] text-white shadow-xs"
                      : "text-[#57534E]"
                  }`}
                >
                  <span
                    className={`text-[10px] font-medium ${
                      day.isToday ? "text-white/75" : "text-[#8C8782]"
                    }`}
                  >
                    {day.label}
                  </span>
                  <span className="mt-1 font-display text-xs font-semibold">
                    {day.dayNum}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`mt-1 h-1 w-1 rounded-full ${
                      day.hasEvent
                        ? day.isToday
                          ? "bg-white"
                          : "bg-[#141416]"
                        : "bg-transparent"
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Real Upcoming Events */}
            <div className="mt-4">
              {!upcomingEvents ? (
                <div className="space-y-2.5">
                  <div className="h-12 animate-pulse rounded-xl bg-[#F4F1EE]" />
                  <div className="h-12 animate-pulse rounded-xl bg-[#F4F1EE]" />
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="rounded-xl bg-[#FAF8F6] px-4 py-5 text-center">
                  <p className="text-xs font-medium text-[#57534E]">
                    Belum ada agenda event mendatang.
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-3 text-[11px] font-semibold">
                    {isOfficialAccount(user) && (
                      <>
                        <Link
                          href="/events/create"
                          className="text-[#141416] underline-offset-4 hover:underline"
                        >
                          + Ajukan Event
                        </Link>
                        <span className="text-[#D5CEC6]" aria-hidden="true">
                          ·
                        </span>
                      </>
                    )}
                    <Link
                      href="/events"
                      className="text-[#787470] underline-offset-4 hover:text-[#141416] hover:underline"
                    >
                      Lihat Riwayat
                    </Link>
                  </div>
                </div>
              ) : (
                <ul className="space-y-2">
                  {upcomingEvents.map((evt) => {
                    const d = new Date(evt.event_date);
                    const dayText = Number.isNaN(d.getTime())
                      ? "--"
                      : String(d.getDate()).padStart(2, "0");
                    const monthText = Number.isNaN(d.getTime())
                      ? ""
                      : d.toLocaleDateString("id-ID", { month: "short" });
                    return (
                      <li key={evt.id}>
                        <Link
                          href={`/events/${evt.id}`}
                          className="group flex items-center gap-3 rounded-xl border border-[#F1EDE9] bg-[#FAF8F6]/70 p-2.5 transition-all hover:border-[#DFD9D2] hover:bg-white"
                        >
                          <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-white text-center shadow-2xs">
                            <span className="font-display text-xs font-bold leading-none text-[#141416]">
                              {dayText}
                            </span>
                            <span className="mt-0.5 text-[9px] font-medium uppercase text-[#787470]">
                              {monthText}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-[#141416] group-hover:underline">
                              {evt.title}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#787470]">
                              <span className="truncate">{evt.organizer_name}</span>
                              {evt.is_verified && <VerifiedBadge size="xs" />}
                            </p>
                          </div>
                          <span
                            aria-hidden="true"
                            className="text-xs text-[#A8A39E] group-hover:text-[#141416]"
                          >
                            ›
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Recent 1-on-1 Messages Card */}
          <div className="rounded-[24px] border border-[#E7E2DD] bg-white p-5">
            <div className="flex items-center justify-between border-b border-[#F1EDE9] pb-3.5">
              <h2 className="font-display text-base font-semibold tracking-tight text-[#141416]">
                Pesan Terbaru
              </h2>
              <Link
                href="/messages"
                className="text-xs font-medium text-[#787470] transition-colors hover:text-[#141416]"
              >
                Lihat Semua
              </Link>
            </div>

            {!conversations ? (
              <div className="mt-3 space-y-2.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded-xl bg-[#F4F1EE]"
                  />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="mt-3 flex flex-col items-center rounded-2xl bg-[#FAF8F6] px-5 py-7 text-center">
                <p className="text-xs font-semibold text-[#141416]">
                  Belum ada percakapan
                </p>
                <p className="mt-1 max-w-[230px] text-xs leading-5 text-[#787470]">
                  Mulai chat 1-on-1 dari halaman detail produk, jasa, atau barang hilang.
                </p>
                <Link
                  href="/messages"
                  className="mt-3 text-xs font-semibold text-[#141416] underline-offset-4 hover:underline"
                >
                  Buka Kotak Pesan →
                </Link>
              </div>
            ) : (
              <ul className="mt-2 divide-y divide-[#F3EFEA]">
                {conversations.map((conv) => {
                  const recipientName = conv.recipient?.name ?? "Mahasiswa UPN";
                  return (
                    <li key={conv.id}>
                      <Link
                        href={`/messages?conversation_id=${conv.id}`}
                        className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-[#FAF8F6]"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#141416] text-[11px] font-semibold text-white">
                          {recipientName
                            .split(" ")
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-xs font-semibold text-[#141416]">
                              {recipientName}
                            </p>
                            <span className="shrink-0 text-[10px] text-[#9A958F]">
                              {formatTimeAgo(
                                conv.last_message?.created_at ?? conv.updated_at
                              )}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-[#787470]">
                            {conv.last_message?.body ?? "Belum ada pesan"}
                          </p>
                        </div>
                        {conv.unread_count > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#141416] px-1.5 text-[10px] font-semibold text-white">
                            {conv.unread_count}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Compact Shortcuts Card */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/profile"
              className="group rounded-2xl border border-[#E7E2DD] bg-white p-4 transition-all duration-250 hover:-translate-y-0.5 hover:border-[#D5CEC6] hover:shadow-xs"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F4F1EE] text-[#141416] transition-colors group-hover:bg-[#141416] group-hover:text-white">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="2.5" y="2.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.25" />
                  <circle cx="8" cy="6.8" r="1.9" stroke="currentColor" strokeWidth="1.25" />
                  <path d="M5 12C5 10.4 6.3 9.2 8 9.2C9.7 9.2 11 10.4 11 12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                </svg>
              </span>
              <p className="mt-3 font-display text-xs font-semibold text-[#141416]">
                KTM &amp; Iklan Saya
              </p>
              <p className="mt-0.5 text-[11px] text-[#787470]">Kelola profil</p>
            </Link>

            <Link
              href="/favorites"
              className="group rounded-2xl border border-[#E7E2DD] bg-white p-4 transition-all duration-250 hover:-translate-y-0.5 hover:border-[#D5CEC6] hover:shadow-xs"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F4F1EE] text-[#141416] transition-colors group-hover:bg-[#141416] group-hover:text-white">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M4.5 2.5H11.5C11.78 2.5 12 2.72 12 3V13.5L8 11L4 13.5V3C4 2.72 4.22 2.5 4.5 2.5Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="mt-3 font-display text-xs font-semibold text-[#141416]">
                Tersimpan
              </p>
              <p className="mt-0.5 text-[11px] text-[#787470]">Daftar favorit</p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
