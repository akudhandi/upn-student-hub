"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ListingImage from "@/components/ListingImage";
import { apiFetch } from "@/lib/api";
import { getUser, USER_UPDATED_EVENT, type AuthUser } from "@/lib/auth";
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
    title: "Services",
    description: "Les privat, desain, dan servis oleh sesama mahasiswa.",
    href: "/services",
  },
  {
    title: "Lost & Found",
    description: "Laporkan atau temukan barang hilang di kampus.",
    href: "/lost-found",
  },
];

type PaginatedData<T> = {
  message: string;
  data: { data: T[] };
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
  images?: ApiImage[] | null;
};

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
  const base = "flex h-8 w-8 items-center justify-center rounded border";
  const styles: Record<string, { wrapper: string; icon: string }> = {
    Marketplace: {
      wrapper: "bg-[#FFF7ED] border-orange-200",
      icon: "text-[#C2410C]",
    },
    Services: {
      wrapper: "bg-[#ECFDF5] border-emerald-200",
      icon: "text-[#047857]",
    },
    "Lost & Found": {
      wrapper: "bg-[#F5F3FF] border-violet-200",
      icon: "text-[#6D28D9]",
    },
  };
  const style = styles[title] ?? {
    wrapper: "bg-slate-50 border-slate-200",
    icon: "text-slate-600",
  };

  let icon: React.ReactNode;
  if (title === "Marketplace") {
    icon = (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2 5.5L8 2L14 5.5V13H2V5.5Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
        <path d="M6 13V7H10V13" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      </svg>
    );
  } else if (title === "Services") {
    icon = (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 3.5L2.5 6L8 8.5L13.5 6L8 3.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M2.5 8L8 10.5L13.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M2.5 10L8 12.5L13.5 10" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    );
  } else {
    icon = (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2.5" y="2.5" width="11" height="11" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <path d="M5.5 7H10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="11" cy="11" r="2.2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M12.5 12.5L14 14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  return <span className={`${base} ${style.wrapper} ${style.icon}`}>{icon}</span>;
}

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [feed, setFeed] = useState<CommunityFeedItem[] | null>(null);
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
          images?: ApiImage[] | null;
        }>
      >("/v1/events").catch(() => null),
    ]).then(([mkt, svc, lf, evt]) => {
      if (cancelled) return;
      const merged: CommunityFeedItem[] = [];

      for (const item of (mkt?.data.data ?? []).slice(0, 3)) {
        merged.push({
          key: `mkt-${item.id}`,
          module: "marketplace",
          moduleBadge: "Marketplace",
          badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
          id: item.id,
          title: item.title,
          subtitle: `${item.category?.name ?? "Produk"} · oleh ${item.user?.name ?? "Mahasiswa"}`,
          metaRight: formatRupiah(item.price),
          href: `/marketplace/${item.id}`,
          createdAt: item.created_at,
          images: item.images,
        });
      }

      for (const item of (svc?.data.data ?? []).slice(0, 2)) {
        merged.push({
          key: `svc-${item.id}`,
          module: "service",
          moduleBadge: "Jasa",
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
          id: item.id,
          title: item.title,
          subtitle: `${item.category?.name ?? "Layanan"} · oleh ${item.user?.name ?? "Mahasiswa"}`,
          metaRight: `Mulai ${formatRupiah(item.price_min)}`,
          href: `/services/${item.id}`,
          createdAt: item.created_at,
          images: item.images,
        });
      }

      for (const item of (lf?.data.data ?? []).slice(0, 2)) {
        merged.push({
          key: `lf-${item.id}`,
          module: "lostfound",
          moduleBadge: item.type === "lost" ? "Hilang" : "Ditemukan",
          badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
          id: item.id,
          title: item.title,
          subtitle: `${item.location} · oleh ${item.user?.name ?? "Mahasiswa"}`,
          metaRight: formatTimeAgo(item.created_at),
          href: `/lost-found/${item.id}`,
          createdAt: item.created_at,
          images: item.images,
        });
      }

      for (const item of (evt?.data.data ?? []).slice(0, 2)) {
        merged.push({
          key: `evt-${item.id}`,
          module: "event",
          moduleBadge: "Event",
          badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
          id: item.id,
          title: item.title,
          subtitle: item.organizer_name,
          metaRight: new Date(item.event_date).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
          }),
          href: `/events/${item.id}`,
          createdAt: item.created_at,
          images: item.images,
        });
      }

      merged.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setFeed(merged.slice(0, 6));
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
    if (nim) parts.push(`NIM: ${nim}`);
    if (faculty) parts.push(faculty);
    if (parts.length === 0 && user.email) parts.push(user.email);
    return parts.join("  ·  ");
  })();

  return (
    <div className="mx-auto max-w-[1080px] space-y-5 sm:space-y-6">
      {/* Greeting */}
      <section className="border-b border-slate-200/60 pb-5 sm:pb-6">
        <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 sm:text-[26px]">
          {firstName ? `${greeting}, ${firstName}.` : `${greeting}.`}
        </h1>
        {studentMeta ? (
          <p className="mt-1 text-xs font-medium tracking-wide text-slate-500">
            {studentMeta} <span className="mx-1.5 text-slate-300">·</span> Portal Mahasiswa
          </p>
        ) : (
          <p className="mt-1 max-w-[560px] text-sm leading-5 text-slate-500">
            Aktivitas kampusmu sekilas — marketplace, layanan, dan kabar komunitas.
          </p>
        )}
      </section>

      {/* Quick access / module cards */}
      <section aria-labelledby="quick-access-heading">
        <h2 id="quick-access-heading" className="sr-only">
          Akses cepat
        </h2>
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {MODULES.map((m) => (
            <Link
              key={m.title}
              href={m.href}
              className="group flex flex-col rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
            >
              <ModuleIcon title={m.title} />
              <h3 className="mt-3 text-[13px] font-semibold text-slate-900">
                {m.title}
              </h3>
              <p className="mt-1 flex-1 text-xs leading-5 text-slate-500">
                {m.description}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#002147] group-hover:underline">
                Buka
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                  className="text-slate-400 group-hover:text-[#002147]"
                >
                  <path
                    d="M6 3L11 8L6 13"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Main grid */}
      <section className="grid gap-5 lg:grid-cols-[1.7fr_0.9fr] lg:gap-6">
        {/* Recent Community Activity */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 sm:px-5">
            <h2 className="text-[13px] font-semibold text-slate-900">
              Aktivitas Komunitas Terbaru
            </h2>
            <Link
              href="/marketplace"
              className="rounded-sm px-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
            >
              Lihat semua
            </Link>
          </div>

          {!feed ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-lg bg-slate-100"
                />
              ))}
            </div>
          ) : feed.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center sm:py-12">
              <h3 className="text-sm font-semibold text-slate-900">
                Belum ada aktivitas komunitas
              </h3>
              <p className="mt-1.5 max-w-[360px] text-xs leading-5 text-slate-500">
                Jadilah yang pertama memasang iklan barang, menawarkan jasa, atau membuat laporan.
              </p>
              <Link
                href="/marketplace?action=create"
                className="mt-4 inline-flex items-center rounded-md bg-[#002147] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0a2f5c]"
              >
                + Pasang Iklan
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {feed.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-slate-50/80 sm:px-5"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                      <ListingImage
                        module={item.module}
                        seed={item.id}
                        images={item.images}
                        hint={item.title}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${item.badgeClass}`}
                        >
                          {item.moduleBadge}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatTimeAgo(item.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[13px] font-semibold text-slate-900">
                        {item.title}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {item.subtitle}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-slate-900">
                      {item.metaRight}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5 sm:space-y-6">
          {/* Recent Messages */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 sm:px-5">
              <h2 className="text-[13px] font-semibold text-slate-900">
                Pesan Terbaru
              </h2>
              <Link
                href="/messages"
                className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 hover:text-slate-600"
              >
                Semua
              </Link>
            </div>

            {!conversations ? (
              <div className="space-y-2.5 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded-lg bg-slate-100"
                  />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-8 text-center">
                <p className="text-xs font-medium text-slate-700">
                  Belum ada percakapan
                </p>
                <p className="mt-1 max-w-[240px] text-xs leading-5 text-slate-400">
                  Hubungi penjual atau penyedia jasa dari halaman detail listing.
                </p>
                <Link
                  href="/messages"
                  className="mt-3 text-xs font-semibold text-[#002147] hover:underline"
                >
                  Buka Kotak Pesan →
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {conversations.map((conv) => {
                  const recipientName = conv.recipient?.name ?? "Mahasiswa UPN";
                  return (
                    <li key={conv.id}>
                      <Link
                        href={`/messages?c=${conv.id}`}
                        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                          {recipientName
                            .split(" ")
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-xs font-semibold text-slate-900">
                              {recipientName}
                            </p>
                            <span className="shrink-0 text-[10px] text-slate-400">
                              {formatTimeAgo(
                                conv.last_message?.created_at ?? conv.updated_at
                              )}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {conv.last_message?.body ?? "Belum ada pesan"}
                          </p>
                        </div>
                        {conv.unread_count > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#002147] px-1.5 text-[10px] font-bold text-white">
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

          {/* Quick Shortcuts */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3.5 sm:px-5">
              <h2 className="text-[13px] font-semibold text-slate-900">
                Pintasan Cepat
              </h2>
            </div>
            <div className="space-y-2 p-3">
              <Link
                href="/events"
                className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-600">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="2" y="3" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.1" />
                    <path d="M5 7H11" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                    <path d="M5 9.5H9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                  </svg>
                </span>
                Event &amp; Informasi Kampus
                <span className="ml-auto text-slate-400" aria-hidden="true">
                  ›
                </span>
              </Link>
              <Link
                href="/profile"
                className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-600">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="3" y="3" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.1" />
                    <circle cx="8" cy="7" r="2" stroke="currentColor" strokeWidth="1.1" />
                    <path d="M5 12C5 10.3 6.3 9 8 9C9.7 9 11 10.3 11 12" stroke="currentColor" strokeWidth="1.1" />
                  </svg>
                </span>
                KTM Digital &amp; Iklan Saya
                <span className="ml-auto text-slate-400" aria-hidden="true">
                  ›
                </span>
              </Link>
              <Link
                href="/favorites"
                className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-600">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M4.5 2.5H11.5C11.78 2.5 12 2.72 12 3V13.5L8 11L4 13.5V3C4 2.72 4.22 2.5 4.5 2.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
                  </svg>
                </span>
                Daftar Favorit Tersimpan
                <span className="ml-auto text-slate-400" aria-hidden="true">
                  ›
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
