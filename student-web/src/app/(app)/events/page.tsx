"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, fetchPublicCategories, type PublicCategory } from "@/lib/api";
import ListingImage from "@/components/ListingImage";
import type { ApiImage } from "@/lib/images";

// ---------------------------------------------------------------------------
// API types — shape of GET /api/v1/events (Laravel paginator wrapped in
// a standard { message, data } JSON envelope).
// ---------------------------------------------------------------------------
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
  created_at: string;
  user?: { id: number; name: string } | null;
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

function isUpcomingEvent(isoDate: string): boolean {
  const ts = new Date(isoDate).getTime();
  if (Number.isNaN(ts)) return false;
  return ts >= Date.now();
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
  return item.event_time?.trim() ? `${day} • ${item.event_time.trim()}` : day;
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

function PosterPlaceholder({
  title,
  tall,
  seed,
  hint,
  images,
}: {
  title: string;
  tall?: boolean;
  seed: string | number;
  hint?: string | null;
  images?: ApiImage[] | null;
}) {
  return (
    <ListingImage
      module="event"
      seed={seed}
      hint={hint ?? title}
      images={images}
      alt={`Poster ${title}`}
      className={`w-full bg-[#1F3A5F] object-cover ${tall ? "aspect-[16/10] sm:aspect-auto sm:h-full sm:min-h-[220px]" : "aspect-[16/9]"}`}
    />
  );
}

function EventCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="aspect-[16/9] animate-pulse bg-slate-100" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-8 animate-pulse rounded-lg bg-slate-100" />
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
  const [query, setQuery] = useState(urlQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(urlQuery);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (urlQuery !== "") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync query from header search URL
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
      searchQuery: string,
      signal?: AbortSignal
    ) => {
      try {
        setIsLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("page", String(pageNum));
        if (categoryId !== null) params.set("category_id", String(categoryId));
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
        setError("Gagal memuat data event. Periksa koneksi ke backend lalu coba lagi.");
      } finally {
        if (signal?.aborted) return;
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch must populate state when filters/page change
    void loadEvents(page, activeCategoryId, debouncedQuery, controller.signal);
    return () => {
      controller.abort();
    };
  }, [page, activeCategoryId, debouncedQuery, loadEvents]);

  const filtered = items;
  const [featured, ...rest] = filtered;

  function clearFilters() {
    setActiveCategoryId(null);
    setQuery("");
    setDebouncedQuery("");
    setPage(1);
    if (urlQuery !== "") {
      router.replace("/events");
    }
  }

  function goToPage(pageNum: number) {
    if (pageNum < 1 || pageNum > lastPage || pageNum === page) return;
    setPage(pageNum);
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <li><Link href="/dashboard" className="hover:text-slate-800 hover:underline">Beranda</Link></li>
          <li aria-hidden="true" className="text-slate-300">/</li>
          <li><span aria-current="page" className="font-medium text-slate-700">Event &amp; Informasi Kampus</span></li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900 sm:text-[26px]">
            Event &amp; Informasi Kampus
          </h1>
          <p className="mt-1 max-w-[560px] text-sm text-slate-500">
            Temukan kegiatan mahasiswa, seminar, lomba, dan pengumuman resmi UPN Veteran Jawa Timur.
          </p>
        </div>
        <Link
          href="/events/create"
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-[#0A2342] px-4 text-xs font-semibold text-white hover:bg-[#12325e]"
        >
          + Ajukan Event
        </Link>
      </div>

      {/* Search */}
      <div className="relative mt-4">
        <label htmlFor="events-search" className="sr-only">Cari event</label>
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </span>
        <input
          id="events-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari judul event, penyelenggara, topik…"
          className="h-10 w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:outline-none focus:ring-1 focus:ring-[#002147]"
        />
      </div>

      {/* Category pills */}
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter berdasarkan kategori">
        <button
          type="button"
          onClick={() => {
            setActiveCategoryId(null);
            setPage(1);
          }}
          aria-pressed={activeCategoryId === null}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2 ${
            activeCategoryId === null
              ? "border-[#0A2342] bg-[#0A2342] text-white"
              : "border-gray-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          Semua
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
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2 ${
                isActive
                  ? "border-[#0A2342] bg-[#0A2342] text-white"
                  : "border-gray-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="mt-6">
        {isLoading ? (
          <div
            role="status"
            aria-busy="true"
            aria-label="Memuat event dan informasi kampus"
          >
            <div className="grid grid-cols-1 gap-4 overflow-hidden rounded-xl border border-gray-200 bg-white lg:grid-cols-2">
              <div className="aspect-[16/10] animate-pulse bg-slate-100 sm:min-h-[220px]" />
              <div className="flex flex-col gap-2 p-5">
                <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
                <div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
            <span className="sr-only">Memuat data event…</span>
          </div>
        ) : error ? (
          <div role="alert" className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-900">Gagal memuat data event</p>
            <p className="mt-1 text-xs text-slate-500">{error}</p>
            <button
              type="button"
              onClick={() => void loadEvents(page, activeCategoryId, debouncedQuery)}
              className="mt-4 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
            >
              Coba lagi
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div role="status" className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-900">Belum Ada Event Dipublikasikan</p>
            <p className="mt-1 text-xs text-slate-500">
              {activeCategoryId === null && debouncedQuery === ""
                ? "Jadilah yang pertama mengajukan event untuk kampus."
                : "Coba kata kunci atau kategori lain."}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              {(activeCategoryId !== null || debouncedQuery !== "") && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
                >
                  Hapus filter
                </button>
              )}
              <Link
                href="/events/create"
                className="rounded-lg bg-[#0A2342] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#12325e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
              >
                Ajukan Event
              </Link>
            </div>
          </div>
        ) : (
          <>
            {featured && (
              <article className="grid grid-cols-1 gap-0 overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors hover:border-slate-300 focus-within:ring-2 focus-within:ring-[#002147] focus-within:ring-offset-2 lg:grid-cols-2">
                <Link href={`/events/${featured.id}`} aria-label={`Lihat detail ${featured.title}`} className="focus:outline-none">
                  <PosterPlaceholder title={featured.title} tall seed={featured.id} hint={`${featured.category?.name ?? ""} ${featured.title}`} images={featured.images} />
                </Link>
                <div className="flex min-w-0 flex-col p-5 sm:p-6">
                  <p className="text-[11px] font-bold text-teal-700">
                    {featured.category?.name ?? "Event Kampus"} •{" "}
                    {isUpcomingEvent(featured.event_date) ? "Segera Hadir" : "Telah Berlangsung"}
                  </p>
                  <h2 className="mt-1.5 line-clamp-2 text-lg font-bold leading-7 tracking-tight text-slate-900">
                    <Link href={`/events/${featured.id}`} className="hover:underline focus:outline-none">
                      {featured.title}
                    </Link>
                  </h2>
                  <p className="mt-2 line-clamp-3 text-[13px] leading-6 text-slate-600">
                    {featured.description ?? "Tidak ada deskripsi."}
                  </p>
                  <p className="mt-3 text-[12px] font-semibold text-slate-900">
                    {formatLongDateTime(featured)}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-[12px] text-slate-500">
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
                      <path d="M8 14C8 14 3.5 9.3 3.5 6C3.5 3.5 5.5 1.5 8 1.5C10.5 1.5 12.5 3.5 12.5 6C12.5 9.3 8 14 8 14Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                      <circle cx="8" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                    <span className="truncate">{featured.location}</span>
                  </p>
                  <Link
                    href={`/events/${featured.id}`}
                    className="mt-3 w-fit text-[13px] font-bold text-[#0A2342] hover:underline focus:outline-none"
                  >
                    Lihat Detail Acara →
                  </Link>
                </div>
              </article>
            )}

            {rest.length > 0 && (
              <>
                <div className="mt-8 flex items-baseline justify-between gap-3">
                  <h2 className="text-[15px] font-bold text-slate-900">Daftar Kegiatan Terbaru</h2>
                  <p className="text-[11px] text-slate-400" role="status">
                    Menampilkan {filtered.length} dari {total} kegiatan
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((item) => (
                    <article
                      key={item.id}
                      className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors hover:border-slate-300 focus-within:ring-2 focus-within:ring-[#002147] focus-within:ring-offset-2"
                    >
                      <Link href={`/events/${item.id}`} aria-label={`Lihat detail ${item.title}`} className="focus:outline-none">
                        <span className="block">
                          <PosterPlaceholder title={item.title} seed={item.id} hint={`${item.category?.name ?? ""} ${item.title}`} images={item.images} />
                        </span>
                      </Link>
                      <div className="flex flex-1 flex-col p-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="max-w-[60%] truncate rounded-md bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-700">
                            {item.category?.name ?? "Event Kampus"}
                          </span>
                          <span className="shrink-0 text-[10px] text-slate-400">{formatShortDate(item.event_date)}</span>
                        </div>
                        <h3 className="mt-2 line-clamp-2 text-[13px] font-bold leading-5 text-slate-900">
                          <Link href={`/events/${item.id}`} className="hover:underline focus:outline-none">
                            {item.title}
                          </Link>
                        </h3>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">
                          {item.description ?? "Tidak ada deskripsi."}
                        </p>
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                          <span className="flex min-w-0 items-center gap-1 text-[10px] text-slate-500">
                            <span aria-hidden="true">◎</span>
                            <span className="truncate">{item.location}</span>
                          </span>
                          <Link
                            href={`/events/${item.id}`}
                            className="shrink-0 rounded-md bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]"
                          >
                            Lihat Detail →
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}

            {lastPage > 1 && (
              <nav aria-label="Navigasi halaman event" className="mt-6 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  ← Sebelumnya
                </button>
                <span className="text-xs text-slate-500" role="status">
                  Halaman {page} dari {lastPage}
                </span>
                <button
                  type="button"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= lastPage}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  Berikutnya →
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Memuat event…</p>}>
      <EventsContent />
    </Suspense>
  );
}
