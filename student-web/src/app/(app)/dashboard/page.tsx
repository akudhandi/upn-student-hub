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

type ModuleKey = "marketplace" | "services" | "lostFound" | "events";

type ModuleCard = {
  key: ModuleKey;
  title: string;
  description: string;
  actionLabel: string;
  unitLabel: string;
  href: string;
};

const MODULES: ModuleCard[] = [
  {
    key: "marketplace",
    title: "Marketplace",
    description: "Jual beli buku kuliah, perangkat, dan kebutuhan kos.",
    actionLabel: "Buka katalog",
    unitLabel: "iklan",
    href: "/marketplace",
  },
  {
    key: "services",
    title: "Jasa & Layanan",
    description: "Bimbingan belajar, desain, dan servis dari mahasiswa.",
    actionLabel: "Lihat layanan",
    unitLabel: "jasa",
    href: "/services",
  },
  {
    key: "lostFound",
    title: "Barang Hilang",
    description: "Laporan kehilangan dan temuan barang di area kampus.",
    actionLabel: "Cek laporan",
    unitLabel: "laporan",
    href: "/lost-found",
  },
  {
    key: "events",
    title: "Event & Info",
    description: "Agenda seminar, lomba, dan kegiatan resmi terverifikasi.",
    actionLabel: "Lihat jadwal",
    unitLabel: "acara",
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

type ModuleCounts = Record<ModuleKey, number>;

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
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function ArrowGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0 transition-transform duration-150 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:translate-x-[3px]"
    >
      <path
        d="M3.5 8h9M8.5 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ModuleIcon({ moduleKey }: { moduleKey: ModuleKey }) {
  let icon: React.ReactNode;
  if (moduleKey === "marketplace") {
    icon = (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 8h12l-1 11H7L6 8z" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" />
        <path d="M9.5 8V6.5a2.5 2.5 0 015 0V8" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      </svg>
    );
  } else if (moduleKey === "services") {
    icon = (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="7" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.65" />
        <path d="M8.5 7V5a1.5 1.5 0 011.5-1.5h4A1.5 1.5 0 0115.5 5v2" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 12h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  } else if (moduleKey === "events") {
    icon = (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="5.5" width="16" height="14.5" rx="3" stroke="currentColor" strokeWidth="1.65" />
        <path d="M8 3.5v3M16 3.5v3M4 10h16" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      </svg>
    );
  } else {
    icon = (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.65" />
        <path d="M15.5 15.5L20 20" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F1EE] text-[#141416] transition-colors duration-180 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:bg-[#141416] group-hover:text-white">
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
          badgeClass: "bg-[#FBEAD8] text-[#7C4A12]",
          id: item.id,
          title: item.title,
          subtitle: `${item.category?.name ?? "Produk"} · ${item.user?.name ?? "Mahasiswa"}`,
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
          badgeClass: "bg-[#E4F2EA] text-[#1E603E]",
          id: item.id,
          title: item.title,
          subtitle: `${item.category?.name ?? "Layanan"} · ${item.user?.name ?? "Mahasiswa"}`,
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
              ? "bg-[#FCEAE9] text-[#9A3434]"
              : "bg-[#E7EEF9] text-[#2D4880]",
          id: item.id,
          title: item.title,
          subtitle: `${item.location} · ${item.user?.name ?? "Mahasiswa"}`,
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
          badgeClass: "bg-[#EFECE8] text-[#27272A]",
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
    if (h < 12) return "Selamat pagi";
    if (h < 18) return "Selamat siang";
    return "Selamat malam";
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

  const canSubmitEvent = isOfficialAccount(user);

  return (
    <div className="auth-shell-enter mx-auto max-w-[1200px] space-y-8">
      {/* Header Section: Two-sentence heading + 44px verb+object buttons */}
      <section className="flex flex-col justify-between gap-5 border-b border-[#E5E0DA] pb-6 lg:flex-row lg:items-end">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-medium text-[#6E6A66]">
            <span>{studentMeta || "Portal Mahasiswa UPN Veteran Jawa Timur"}</span>
            <span aria-hidden="true" className="text-[#CFC8BF]">
              ·
            </span>
            <Link
              href="/profile"
              className="text-[#141416] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
            >
              Lihat profil &amp; KTM
            </Link>
            <span aria-hidden="true" className="text-[#CFC8BF]">
              ·
            </span>
            <Link
              href="/favorites"
              className="text-[#141416] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
            >
              Buka item tersimpan
            </Link>
          </div>

          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[#141416] sm:text-[32px] sm:leading-[1.18]">
            {firstName ? `${greeting}, ${firstName}.` : `${greeting}.`}{" "}
            <span className="font-normal text-[#6E6A66]">
              Ringkasan aktivitas kampus hari ini.
            </span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canSubmitEvent && (
            <Link
              href="/events/create"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-6 text-[14px] font-medium text-[#141416] transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:border-[#141416] hover:bg-[#FAF8F6] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
            >
              Ajukan kegiatan
            </Link>
          )}
          <Link
            href="/marketplace?action=create"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            Pasang iklan baru
          </Link>
        </div>
      </section>

      {/* Single Unified 4-Module Overview Row (No duplicate module cards) */}
      <section aria-label="Empat modul utama kampus">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((m) => {
            const countVal = counts ? counts[m.key] : null;
            return (
              <Link
                key={m.key}
                href={m.href}
                className="group flex flex-col justify-between rounded-[20px] border border-[#E5E0DA] bg-white p-5 transition-all duration-180 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[2px] hover:border-[#CFC8BF] hover:shadow-[0_14px_28px_-14px_rgba(20,20,22,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <ModuleIcon moduleKey={m.key} />
                    {countVal === null ? (
                      <span className="h-6 w-16 animate-pulse rounded-full bg-[#EFECE8]" />
                    ) : (
                      <span className="rounded-full bg-[#F4F1EE] px-3 py-1 text-[13px] font-medium text-[#57534E]">
                        {countVal} {m.unitLabel}
                      </span>
                    )}
                  </div>

                  <h2 className="mt-4 font-display text-[17px] font-semibold tracking-tight text-[#141416]">
                    {m.title}
                  </h2>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#57534E]">
                    {m.description}
                  </p>
                </div>

                <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#141416]">
                  <span>{m.actionLabel}</span>
                  <ArrowGlyph />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Main 12-Column Equal-Edge Workspace */}
      <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left 7 Columns: Community Activity Feed */}
        <div className="rounded-[20px] border border-[#E5E0DA] bg-white p-6 lg:col-span-7">
          <div className="flex flex-col justify-between gap-4 border-b border-[#EFECE8] pb-5 sm:flex-row sm:items-center">
            <h2 className="font-display text-[19px] font-semibold tracking-tight text-[#141416]">
              Aktivitas komunitas.{" "}
              <span className="font-normal text-[#6E6A66]">
                Kiriman terbaru dari empat modul.
              </span>
            </h2>
            <Link
              href="/marketplace"
              className="group inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
            >
              <span>Lihat katalog</span>
              <ArrowGlyph />
            </Link>
          </div>

          {/* Filter Tabs */}
          <div
            role="tablist"
            aria-label="Filter aktivitas komunitas"
            className="mt-4 flex flex-wrap items-center gap-2"
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
                  className={`min-h-[38px] rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] ${
                    selected
                      ? "bg-[#141416] text-white"
                      : "bg-[#F4F1EE] text-[#57534E] hover:bg-[#EAE6E2] hover:text-[#141416]"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Feed List */}
          <div className="mt-5">
            {!filteredFeed ? (
              <div className="space-y-3 py-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-2xl bg-[#F4F1EE]"
                  />
                ))}
              </div>
            ) : filteredFeed.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl bg-[#FAF8F6] px-6 py-12 text-center">
                <h3 className="font-display text-[16px] font-semibold text-[#141416]">
                  Belum ada kiriman pada kategori ini
                </h3>
                <p className="mt-1.5 max-w-[360px] text-[14px] leading-relaxed text-[#6E6A66]">
                  Mulai publikasikan barang preloved, jasa mahasiswa, atau laporan temuan baru.
                </p>
                <Link
                  href="/marketplace?action=create"
                  className="mt-5 inline-flex h-11 items-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985]"
                >
                  Pasang iklan baru
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-[#F1EDE8]">
                {filteredFeed.map((item) => (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      className="group -mx-3 flex items-center gap-4 rounded-2xl px-3 py-4 transition-colors duration-150 hover:bg-[#FAF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#E7E2DD] bg-[#F4F1EE]">
                        <ListingImage
                          module={item.module}
                          seed={item.id}
                          images={item.images}
                          hint={item.title}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform duration-600 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:scale-[1.03]"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[13px] font-medium ${item.badgeClass}`}
                          >
                            {item.moduleBadge}
                          </span>
                          <span className="text-[13px] text-[#787470]">
                            {formatTimeAgo(item.createdAt)}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-[15px] font-semibold text-[#141416] group-hover:underline">
                          {item.title}
                        </p>

                        <p className="mt-0.5 flex items-center gap-1.5 text-[14px] text-[#57534E]">
                          <span className="truncate">{item.subtitle}</span>
                          {item.isVerified && <VerifiedBadge size="xs" />}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2.5 pl-2">
                        <span className="text-[14px] font-semibold text-[#141416]">
                          {item.metaRight}
                        </span>
                        <ArrowGlyph />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right 5 Columns: Agenda Kampus & Pesan Pribadi */}
        <div className="space-y-6 lg:col-span-5">
          {/* Agenda Kampus Card */}
          <div className="rounded-[20px] border border-[#E5E0DA] bg-white p-6">
            <div className="flex items-start justify-between gap-3 border-b border-[#EFECE8] pb-4">
              <div>
                <h2 className="font-display text-[18px] font-semibold tracking-tight text-[#141416]">
                  Agenda kampus.{" "}
                  <span className="font-normal capitalize text-[#6E6A66]">
                    {calendarMeta.monthLabel}.
                  </span>
                </h2>
              </div>
              <Link
                href="/events"
                className="group inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
              >
                <span>Semua acara</span>
                <ArrowGlyph />
              </Link>
            </div>

            {/* 7-Day Week Strip (Minimum 13px Typography) */}
            <div className="mt-4 grid grid-cols-7 gap-1.5 rounded-2xl bg-[#F4F1EE] p-2">
              {calendarMeta.days.map((day) => (
                <div
                  key={`${day.label}-${day.dayNum}`}
                  className={`flex flex-col items-center rounded-xl py-2 text-center ${
                    day.isToday
                      ? "bg-[#141416] text-white"
                      : "text-[#57534E]"
                  }`}
                >
                  <span
                    className={`text-[13px] font-medium ${
                      day.isToday ? "text-white/80" : "text-[#6E6A66]"
                    }`}
                  >
                    {day.label}
                  </span>
                  <span className="mt-1 font-display text-[14px] font-semibold">
                    {day.dayNum}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-1.5 w-1.5 rounded-full ${
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

            {/* Upcoming Verified Events List */}
            <div className="mt-4">
              {!upcomingEvents ? (
                <div className="space-y-3">
                  <div className="h-16 animate-pulse rounded-xl bg-[#F4F1EE]" />
                  <div className="h-16 animate-pulse rounded-xl bg-[#F4F1EE]" />
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="rounded-2xl bg-[#FAF8F6] px-4 py-6 text-center">
                  <p className="text-[14px] font-medium text-[#57534E]">
                    Belum ada kegiatan mendatang yang terjadwal.
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-3 text-[13px] font-semibold">
                    {canSubmitEvent && (
                      <>
                        <Link
                          href="/events/create"
                          className="text-[#141416] underline-offset-4 hover:underline"
                        >
                          Ajukan kegiatan
                        </Link>
                        <span className="text-[#CFC8BF]" aria-hidden="true">
                          ·
                        </span>
                      </>
                    )}
                    <Link
                      href="/events"
                      className="text-[#6E6A66] underline-offset-4 hover:text-[#141416] hover:underline"
                    >
                      Lihat arsip kegiatan
                    </Link>
                  </div>
                </div>
              ) : (
                <ul className="space-y-2.5">
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
                          className="group flex items-center gap-3.5 rounded-xl border border-[#EAE5DF] bg-[#FAF8F6] p-3 transition-all duration-180 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[2px] hover:border-[#CFC8BF] hover:bg-white hover:shadow-[0_10px_22px_-12px_rgba(20,20,22,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                        >
                          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-[#E7E2DD] bg-white text-center">
                            <span className="font-display text-[15px] font-bold leading-none text-[#141416]">
                              {dayText}
                            </span>
                            <span className="mt-1 text-[13px] font-medium leading-none text-[#6E6A66]">
                              {monthText}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-semibold text-[#141416] group-hover:underline">
                              {evt.title}
                            </p>
                            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-[#57534E]">
                              <span className="truncate">{evt.organizer_name}</span>
                              {evt.is_verified && <VerifiedBadge size="xs" />}
                            </p>
                          </div>
                          <ArrowGlyph />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Pesan Pribadi Card */}
          <div className="rounded-[20px] border border-[#E5E0DA] bg-white p-6">
            <div className="flex items-center justify-between border-b border-[#EFECE8] pb-4">
              <h2 className="font-display text-[18px] font-semibold tracking-tight text-[#141416]">
                Pesan pribadi.{" "}
                <span className="font-normal text-[#6E6A66]">
                  Chat 1-on-1.
                </span>
              </h2>
              <Link
                href="/messages"
                className="group inline-flex items-center gap-1 text-[13px] font-semibold text-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
              >
                <span>Buka pesan</span>
                <ArrowGlyph />
              </Link>
            </div>

            {!conversations ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-xl bg-[#F4F1EE]"
                  />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="mt-4 flex flex-col items-center rounded-2xl bg-[#FAF8F6] px-5 py-7 text-center">
                <p className="text-[15px] font-semibold text-[#141416]">
                  Belum ada percakapan aktif
                </p>
                <p className="mt-1 max-w-[260px] text-[13px] leading-relaxed text-[#6E6A66]">
                  Hubungi penjual, penyedia jasa, atau pelapor barang langsung dari halaman detail.
                </p>
                <Link
                  href="/messages"
                  className="group mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#141416] underline-offset-4 hover:underline"
                >
                  <span>Buka kotak pesan</span>
                  <ArrowGlyph />
                </Link>
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-[#F1EDE8]">
                {conversations.map((conv) => {
                  const recipientName = conv.recipient?.name ?? "Mahasiswa UPN";
                  return (
                    <li key={conv.id}>
                      <Link
                        href={`/messages?conversation_id=${conv.id}`}
                        className="group -mx-2 flex items-center gap-3.5 rounded-xl px-2 py-3.5 transition-colors duration-150 hover:bg-[#FAF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#141416] text-[13px] font-semibold text-white">
                          {recipientName
                            .split(" ")
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[15px] font-semibold text-[#141416]">
                              {recipientName}
                            </p>
                            <span className="shrink-0 text-[13px] text-[#787470]">
                              {formatTimeAgo(
                                conv.last_message?.created_at ?? conv.updated_at
                              )}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[14px] text-[#57534E]">
                            {conv.last_message?.body ?? "Belum ada pesan"}
                          </p>
                        </div>
                        {conv.unread_count > 0 && (
                          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#141416] px-2 text-[13px] font-semibold text-white">
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
        </div>
      </section>
    </div>
  );
}
