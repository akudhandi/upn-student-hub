"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, fetchPublicCategories, type PublicCategory } from "@/lib/api";
import { getUser, isOfficialAccount, USER_UPDATED_EVENT, type AuthUser } from "@/lib/auth";
import ListingImage from "@/components/ListingImage";
import VerifiedBadge, { isVerifiedEventOrganizer } from "@/components/VerifiedBadge";
import type { ApiImage } from "@/lib/images";

// API types for GET /api/v1/events (Laravel paginator in { message, data } envelope).
type ApiEventItem = {
  id: number;
  title: string;
  slug: string;
  event_code?: string | null;
  description: string | null;
  organizer_name: string;
  event_date: string;
  event_time?: string | null;
  location: string;
  status: string;
  is_verified?: boolean;
  created_at: string;
  user?: { id: number; name: string; account_type?: string } | null;
  category?: { id: number; name: string; slug: string } | null;
  images?: ApiImage[] | null;
};

type EventListResponse = {
  message: string;
  data: {
    current_page: number;
    last_page: number;
    total: number;
    data: ApiEventItem[];
  };
};

type TimeFilter = "all" | "upcoming";

function isUpcomingEvent(isoDate: string): boolean {
  const ts = new Date(isoDate).getTime();
  if (Number.isNaN(ts)) return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return ts >= startOfToday.getTime();
}

function formatLongDateTime(item: ApiEventItem): string {
  const date = new Date(item.event_date);
  if (Number.isNaN(date.getTime())) return "-";
  const day = date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return item.event_time?.trim() ? `${day} · ${item.event_time.trim()}` : day;
}

function formatShortDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 1.8v2.4M10.5 1.8v2.4M2 6.5h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M8 14C8 14 3.5 9.3 3.5 6C3.5 3.5 5.5 1.5 8 1.5C10.5 1.5 12.5 3.5 12.5 6C12.5 9.3 8 14 8 14Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function EventCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white">
      <div className="aspect-[16/9] animate-pulse bg-[#EFECE8]" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="h-6 w-24 animate-pulse rounded-md bg-[#F4F1EE]" />
          <div className="h-6 w-20 animate-pulse rounded-md bg-[#F4F1EE]" />
        </div>
        <div className="h-5 w-4/5 animate-pulse rounded-lg bg-[#F4F1EE]" />
        <div className="h-4 w-1/2 animate-pulse rounded-lg bg-[#F4F1EE]" />
        <div className="h-4 w-full animate-pulse rounded-lg bg-[#F4F1EE]" />
        <div className="mt-auto space-y-2 border-t border-[#F1EDE8] pt-4">
          <div className="h-4 w-2/3 animate-pulse rounded-lg bg-[#F4F1EE]" />
          <div className="h-4 w-1/2 animate-pulse rounded-lg bg-[#F4F1EE]" />
        </div>
      </div>
    </div>
  );
}

function EventsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = (searchParams.get("q") ?? "").trim();

  const [items, setItems] = useState<ApiEventItem[]>([]);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate user from localStorage on mount
    setCurrentUser(getUser());
    function syncUser() {
      setCurrentUser(getUser());
    }
    window.addEventListener(USER_UPDATED_EVENT, syncUser);
    return () => window.removeEventListener(USER_UPDATED_EVENT, syncUser);
  }, []);

  const canSubmitEvent = isOfficialAccount(currentUser);
  const [query, setQuery] = useState(urlQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(urlQuery);
  const prevUrlQueryRef = useRef(urlQuery);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === debouncedQuery) return;
    const t = window.setTimeout(() => {
      setDebouncedQuery(trimmed);
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [query, debouncedQuery]);

  useEffect(() => {
    if (prevUrlQueryRef.current !== urlQuery) {
      prevUrlQueryRef.current = urlQuery;
      setQuery(urlQuery);
      setDebouncedQuery(urlQuery);
      setPage(1);
    }
  }, [urlQuery]);

  useEffect(() => {
    const controller = new AbortController();
    fetchPublicCategories("event")
      .then((cats) => {
        if (!controller.signal.aborted) setCategories(cats);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const loadEvents = useCallback(
    async (
      pageNum: number,
      categoryId: number | null,
      scheduleFilter: TimeFilter,
      searchQuery: string,
      signal?: AbortSignal
    ) => {
      try {
        setIsLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("page", String(pageNum));
        if (categoryId !== null) params.set("category_id", String(categoryId));
        if (scheduleFilter === "upcoming") params.set("upcoming", "1");
        if (searchQuery !== "") params.set("q", searchQuery);
        const res = await apiFetch<EventListResponse>(`/v1/events?${params.toString()}`);
        if (signal?.aborted) return;
        setItems(res.data.data);
        setTotal(res.data.total);
        setPage(res.data.current_page);
        setLastPage(res.data.last_page);
      } catch {
        if (signal?.aborted) return;
        setItems([]);
        setError("Gagal memuat data event. Periksa koneksi backend lalu coba lagi.");
      } finally {
        if (signal?.aborted) return;
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch must populate state when filters or page change
    void loadEvents(page, activeCategoryId, timeFilter, debouncedQuery, controller.signal);
    return () => {
      controller.abort();
    };
  }, [page, activeCategoryId, timeFilter, debouncedQuery, loadEvents]);

  const hasActiveFilter =
    activeCategoryId !== null ||
    timeFilter !== "all" ||
    query.trim() !== "" ||
    debouncedQuery !== "";

  const showFeatured = page === 1 && items.length > 0;
  const featured = showFeatured ? items[0] : null;
  const gridItems = showFeatured ? items.slice(1) : items;

  function resetFilters() {
    setActiveCategoryId(null);
    setTimeFilter("all");
    setQuery("");
    setDebouncedQuery("");
    setPage(1);
    if (urlQuery !== "") {
      prevUrlQueryRef.current = "";
      router.replace("/events");
    }
  }

  function goToPage(pageNum: number) {
    if (pageNum < 1 || pageNum > lastPage || pageNum === page) return;
    setPage(pageNum);
  }

  return (
    <div className="auth-shell-enter mx-auto max-w-[1200px] space-y-7">
      {/* Header Band */}
      <section className="flex flex-col justify-between gap-5 border-b border-[#E5E0DA] pb-6 lg:flex-row lg:items-end">
        <div className="min-w-0 space-y-2">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-[#6E6A66]">
              <li>
                <Link
                  href="/dashboard"
                  className="transition-colors hover:text-[#141416] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                >
                  Portal Mahasiswa
                </Link>
              </li>
              <li aria-hidden="true" className="text-[#CFC8BF]">
                /
              </li>
              <li>
                <span aria-current="page" className="text-[#141416]">
                  Event &amp; Info Kampus
                </span>
              </li>
              <li aria-hidden="true" className="text-[#CFC8BF]">
                ·
              </li>
              <li>
                <span>{isLoading ? "Memuat jadwal…" : `${total} kegiatan aktif`}</span>
              </li>
              {debouncedQuery !== "" && (
                <>
                  <li aria-hidden="true" className="text-[#CFC8BF]">
                    ·
                  </li>
                  <li className="max-w-[240px] truncate text-[#141416] sm:max-w-[380px]">
                    Pencarian: &ldquo;{debouncedQuery}&rdquo;
                  </li>
                </>
              )}
            </ol>
          </nav>

          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[#141416] sm:text-[32px] sm:leading-[1.18]">
            Event &amp; info kampus.
          </h1>
          <p className="max-w-[580px] text-[14px] leading-relaxed text-[#57534E]">
            Temukan kegiatan mahasiswa, seminar, lomba, dan pengumuman resmi UPN Veteran Jawa Timur.
          </p>
        </div>

        {canSubmitEvent && (
          <Link
            href="/events/create"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F1EE] motion-reduce:transform-none motion-reduce:transition-none"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            Ajukan event
          </Link>
        )}
      </section>

      {/* Search & Filter Panel */}
      <section
        aria-label="Filter agenda dan event kampus"
        className="rounded-[20px] border border-[#E5E0DA] bg-white p-5 sm:p-6"
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <label htmlFor="events-search" className="block text-[13px] font-medium text-[#57534E]">
              Cari kegiatan
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E6A66]">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </span>
              <input
                id="events-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari judul event, penyelenggara, atau lokasi"
                className="h-11 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] py-2 pl-10 pr-4 text-[14px] text-[#141416] placeholder:text-[#66625E] transition-all duration-150 hover:border-[#CFC8BF] focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none"
              />
            </div>
          </div>

          <div className="min-w-0">
            <span id="events-time-label" className="block text-[13px] font-medium text-[#57534E]">
              Rentang jadwal
            </span>
            <div
              className="mt-1.5 flex flex-wrap items-center gap-2"
              role="group"
              aria-labelledby="events-time-label"
            >
              {(
                [
                  { value: "all", label: "Semua jadwal" },
                  { value: "upcoming", label: "Akan datang" },
                ] as const
              ).map((opt) => {
                const isActive = timeFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setTimeFilter(opt.value);
                      setPage(1);
                    }}
                    aria-pressed={isActive}
                    className={`min-h-[44px] rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                      isActive
                        ? "bg-[#141416] text-white"
                        : "bg-[#F4F1EE] text-[#57534E] hover:bg-[#EAE6E2] hover:text-[#141416]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}

              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-5 text-[14px] font-medium text-[#141416] transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:border-[#141416] hover:bg-[#FAF8F6] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] motion-reduce:transform-none motion-reduce:transition-none"
                >
                  Atur ulang filter
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-[#F1EDE8] pt-5">
          <span id="events-category-label" className="block text-[13px] font-medium text-[#57534E]">
            Kategori kegiatan
          </span>
          <div
            className="mt-2 flex flex-wrap items-center gap-2"
            role="group"
            aria-labelledby="events-category-label"
          >
            <button
              type="button"
              onClick={() => {
                setActiveCategoryId(null);
                setPage(1);
              }}
              aria-pressed={activeCategoryId === null}
              className={`min-h-[44px] rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                activeCategoryId === null
                  ? "bg-[#141416] text-white"
                  : "bg-[#F4F1EE] text-[#57534E] hover:bg-[#EAE6E2] hover:text-[#141416]"
              }`}
            >
              Semua kategori
            </button>
            {categories.map((cat) => {
              const isActive = activeCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveCategoryId(cat.id);
                    setPage(1);
                  }}
                  aria-pressed={isActive}
                  className={`min-h-[44px] rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                    isActive
                      ? "bg-[#141416] text-white"
                      : "bg-[#F4F1EE] text-[#57534E] hover:bg-[#EAE6E2] hover:text-[#141416]"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section aria-label="Daftar kegiatan dan pengumuman kampus">
        {isLoading ? (
          <div
            role="status"
            aria-busy="true"
            aria-label="Memuat event dan informasi kampus"
            className="space-y-6"
          >
            <div className="grid grid-cols-1 overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white lg:grid-cols-[1.08fr_1fr]">
              <div className="aspect-[16/10] animate-pulse bg-[#EFECE8] lg:min-h-[300px]" />
              <div className="flex flex-col gap-3 p-5 sm:p-7">
                <div className="flex gap-2">
                  <div className="h-6 w-28 animate-pulse rounded-md bg-[#F4F1EE]" />
                  <div className="h-6 w-24 animate-pulse rounded-md bg-[#F4F1EE]" />
                </div>
                <div className="mt-1 h-7 w-4/5 animate-pulse rounded-lg bg-[#F4F1EE]" />
                <div className="h-4 w-1/2 animate-pulse rounded-lg bg-[#F4F1EE]" />
                <div className="h-4 w-full animate-pulse rounded-lg bg-[#F4F1EE]" />
                <div className="h-4 w-2/3 animate-pulse rounded-lg bg-[#F4F1EE]" />
                <div className="mt-auto h-11 w-40 animate-pulse rounded-full bg-[#EFECE8]" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
            <span className="sr-only">Memuat data event…</span>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-[20px] border border-[#F1C9C9] bg-[#FDF2F2] px-6 py-14 text-center"
          >
            <h2 className="font-display text-lg font-semibold text-[#B83232]">
              Gagal memuat data event
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-[14px] text-[#B83232]">{error}</p>
            <button
              type="button"
              onClick={() => void loadEvents(page, activeCategoryId, timeFilter, debouncedQuery)}
              className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDF2F2] motion-reduce:transform-none motion-reduce:transition-none"
            >
              Muat ulang daftar
            </button>
          </div>
        ) : items.length === 0 ? (
          <div
            role="status"
            className="rounded-[20px] border border-[#E5E0DA] bg-white px-6 py-14 text-center"
          >
            <h2 className="font-display text-lg font-semibold text-[#141416]">
              {hasActiveFilter ? "Tidak ada kegiatan sesuai filter" : "Belum ada event dipublikasikan"}
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-[14px] leading-relaxed text-[#6E6A66]">
              {hasActiveFilter
                ? "Ubah kategori, rentang jadwal, atau kata kunci pencarian untuk melihat agenda lainnya."
                : canSubmitEvent
                  ? "Ajukan kegiatan seminar, lomba, atau pengumuman resmi pertama untuk mahasiswa UPN."
                  : "Kegiatan dan pengumuman resmi dari HIMA, Ormawa, atau Fakultas akan tampil di sini setelah dipublikasikan."}
            </p>
            {(hasActiveFilter || canSubmitEvent) && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-6 text-[14px] font-medium text-[#141416] transition-all duration-150 hover:-translate-y-[1px] hover:border-[#141416] hover:bg-[#FAF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] motion-reduce:transform-none motion-reduce:transition-none"
                  >
                    Atur ulang filter
                  </button>
                )}
                {canSubmitEvent && (
                  <Link
                    href="/events/create"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:transform-none motion-reduce:transition-none"
                  >
                    Ajukan event
                  </Link>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {featured && (
              <article className="group grid grid-cols-1 overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white transition-all duration-180 ease-[cubic-bezier(.2,.8,.2,1)] hover:border-[#CFC8BF] hover:shadow-[0_14px_28px_-14px_rgba(20,20,22,0.10)] focus-within:ring-2 focus-within:ring-[#141416] lg:grid-cols-[1.08fr_1fr] motion-reduce:transition-none">
                <Link
                  href={`/events/${featured.id}`}
                  aria-label={`Lihat detail ${featured.title}`}
                  className="block overflow-hidden bg-[#EFECE8] focus:outline-none lg:h-full"
                >
                  <ListingImage
                    module="event"
                    seed={featured.id}
                    eager
                    width={800}
                    height={500}
                    hint={`${featured.category?.name ?? ""} ${featured.title}`}
                    images={featured.images}
                    alt={`Poster ${featured.title}`}
                    className="aspect-[16/10] h-full w-full object-cover transition-transform duration-600 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
                  />
                </Link>

                <div className="flex min-w-0 flex-col justify-between p-5 sm:p-7">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-[#F4F1EE] px-2.5 py-1 text-[13px] font-medium text-[#57534E]">
                        {featured.category?.name ?? "Event Kampus"}
                      </span>
                      <span
                        className={`rounded-md px-2.5 py-1 text-[13px] font-medium ${
                          isUpcomingEvent(featured.event_date)
                            ? "bg-[#E4F2EA] text-[#1E603E]"
                            : "bg-[#EFECE8] text-[#5F5B57]"
                        }`}
                      >
                        {isUpcomingEvent(featured.event_date) ? "Segera hadir" : "Telah berlangsung"}
                      </span>
                    </div>

                    <h2 className="mt-3 line-clamp-2 break-words font-display text-xl font-semibold leading-snug tracking-tight text-[#141416] sm:text-[24px]">
                      <Link
                        href={`/events/${featured.id}`}
                        className="hover:underline focus:outline-none focus-visible:underline"
                      >
                        {featured.title}
                      </Link>
                    </h2>

                    <p className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 text-[13px] font-medium text-[#57534E]">
                      <span className="truncate">{featured.organizer_name}</span>
                      {isVerifiedEventOrganizer(featured) && <VerifiedBadge showLabel size="xs" />}
                    </p>

                    <p className="mt-3 line-clamp-3 break-words text-[14px] leading-relaxed text-[#57534E]">
                      {featured.description ?? "Informasi lengkap kegiatan tersedia pada halaman detail acara."}
                    </p>
                  </div>

                  <div className="mt-5 space-y-4 border-t border-[#F1EDE8] pt-4">
                    <div className="space-y-1.5 text-[13px]">
                      <p className="flex min-w-0 items-center gap-2 font-medium text-[#141416]">
                        <CalendarIcon />
                        <span className="min-w-0 break-words">{formatLongDateTime(featured)}</span>
                      </p>
                      <p className="flex min-w-0 items-center gap-2 text-[#57534E]">
                        <LocationIcon />
                        <span className="truncate">{featured.location}</span>
                      </p>
                    </div>

                    <Link
                      href={`/events/${featured.id}`}
                      className="inline-flex min-h-[44px] w-fit items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:transform-none motion-reduce:transition-none"
                    >
                      Lihat detail acara
                    </Link>
                  </div>
                </div>
              </article>
            )}

            {gridItems.length > 0 && (
              <div className={featured ? "mt-7" : ""}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-[18px] font-semibold tracking-tight text-[#141416]">
                    {featured ? "Daftar kegiatan lainnya" : "Daftar kegiatan kampus"}
                  </h2>
                  <p className="text-[13px] text-[#6E6A66]" role="status">
                    Menampilkan {items.length} dari {total} kegiatan
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {gridItems.map((item, idx) => {
                    const categoryName = item.category?.name ?? "Event Kampus";
                    const upcoming = isUpcomingEvent(item.event_date);
                    return (
                      <article
                        key={item.id}
                        className="group flex flex-col overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white transition-all duration-180 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[2px] hover:border-[#CFC8BF] hover:shadow-[0_14px_28px_-14px_rgba(20,20,22,0.10)] focus-within:ring-2 focus-within:ring-[#141416] motion-reduce:transform-none motion-reduce:transition-none"
                      >
                        <Link
                          href={`/events/${item.id}`}
                          aria-label={`Lihat detail ${item.title}`}
                          className="block overflow-hidden bg-[#EFECE8] focus:outline-none"
                        >
                          <ListingImage
                            module="event"
                            seed={item.id}
                            eager={idx < 3}
                            width={800}
                            height={450}
                            hint={`${categoryName} ${item.title}`}
                            images={item.images}
                            alt={`Poster ${item.title}`}
                            className="aspect-[16/9] w-full object-cover transition-transform duration-600 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
                          />
                        </Link>

                        <div className="flex flex-1 flex-col p-5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="max-w-[58%] truncate rounded-md bg-[#F4F1EE] px-2.5 py-1 text-[13px] font-medium text-[#57534E]">
                              {categoryName}
                            </span>
                            <span
                              className={`shrink-0 rounded-md px-2.5 py-1 text-[13px] font-medium ${
                                upcoming
                                  ? "bg-[#E4F2EA] text-[#1E603E]"
                                  : "bg-[#EFECE8] text-[#5F5B57]"
                              }`}
                            >
                              {upcoming ? "Segera hadir" : "Selesai"}
                            </span>
                          </div>

                          <h3 className="mt-3 line-clamp-2 break-words font-display text-[16px] font-semibold leading-snug text-[#141416]">
                            <Link
                              href={`/events/${item.id}`}
                              className="hover:underline focus:outline-none focus-visible:underline"
                            >
                              {item.title}
                            </Link>
                          </h3>

                          <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-[#57534E]">
                            <span className="truncate">{item.organizer_name}</span>
                            {isVerifiedEventOrganizer(item) && <VerifiedBadge size="xs" />}
                          </p>

                          <p className="mt-2 line-clamp-2 flex-1 break-words text-[14px] leading-relaxed text-[#57534E]">
                            {item.description ?? "Informasi lengkap tersedia pada halaman detail acara."}
                          </p>

                          <div className="mt-4 space-y-1.5 border-t border-[#F1EDE8] pt-4 text-[13px]">
                            <p className="flex items-center gap-1.5 font-medium text-[#141416]">
                              <CalendarIcon />
                              <span className="truncate">
                                {formatShortDate(item.event_date)}
                                {item.event_time?.trim() ? ` · ${item.event_time.trim()}` : ""}
                              </span>
                            </p>
                            <p className="flex min-w-0 items-center gap-1.5 text-[#6E6A66]">
                              <LocationIcon />
                              <span className="truncate">{item.location}</span>
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}

            {lastPage > 1 && (
              <nav
                aria-label="Navigasi halaman event"
                className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#E5E0DA] bg-white px-5 py-4 text-[14px] text-[#57534E]"
              >
                <span role="status">
                  Halaman <strong className="font-semibold text-[#141416]">{page}</strong> dari{" "}
                  <strong className="font-semibold text-[#141416]">{lastPage}</strong> ({total} kegiatan)
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => goToPage(page - 1)}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#E5E0DA] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-40"
                  >
                    ← Sebelumnya
                  </button>
                  <button
                    type="button"
                    disabled={page >= lastPage}
                    onClick={() => goToPage(page + 1)}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#E5E0DA] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-40"
                  >
                    Berikutnya →
                  </button>
                </div>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<p className="text-[14px] text-[#6E6A66]">Memuat agenda kampus…</p>}>
      <EventsContent />
    </Suspense>
  );
}
