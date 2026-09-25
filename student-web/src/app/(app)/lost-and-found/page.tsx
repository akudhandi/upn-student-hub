"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

// ---------------------------------------------------------------------------
// API types — shape of GET /api/v1/lost-found (Laravel paginator wrapped in
// a standard { message, data } JSON envelope).
// ---------------------------------------------------------------------------
type ApiLostFoundItem = {
  id: number;
  type: "lost" | "found";
  title: string;
  location: string;
  date_event: string | null;
  description: string | null;
  contact_info: string | null;
  reward: string | null;
  status: string;
  created_at: string;
  user?: { id: number; name: string } | null;
  category?: { id: number; name: string; slug: string } | null;
};

type LostFoundListResponse = {
  message: string;
  data: {
    current_page: number;
    last_page: number;
    total: number;
    data: ApiLostFoundItem[];
  };
};

type TypeFilter = "all" | "lost" | "found";

const TYPE_FILTERS: { value: TypeFilter; label: string; dot: string }[] = [
  { value: "all", label: "Semua", dot: "bg-[#002147]" },
  { value: "lost", label: "Barang Hilang", dot: "bg-rose-600" },
  { value: "found", label: "Barang Ditemukan", dot: "bg-emerald-600" },
];

const PHOTO_TONES = ["bg-[#E7EBF0]", "bg-[#EFE8DC]", "bg-[#E8F0E9]", "bg-[#E9EAF3]"];

function formatEventDate(isoDate: string | null): string {
  if (!isoDate) return "-";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function StatusBadge({ type, status }: { type: "lost" | "found"; status: string }) {
  if (status === "resolved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M3 8.5L6.5 12L13 4.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Selesai
      </span>
    );
  }
  if (type === "lost") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M8 2L14.5 13H1.5L8 2Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M8 6.5V9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="8" cy="11.3" r="0.8" fill="currentColor" />
        </svg>
        Hilang
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M5.5 8.2L7.4 10L10.6 6.4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Ditemukan
    </span>
  );
}

function ItemPhoto({ id, title, type, status }: { id: number; title: string; type: "lost" | "found"; status: string }) {
  return (
    <div
      className={`relative flex h-40 w-full shrink-0 items-center justify-center sm:h-auto sm:w-44 ${PHOTO_TONES[id % PHOTO_TONES.length]}`}
      role="img"
      aria-label={`Placeholder foto untuk ${title}`}
    >
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="text-slate-400"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M3 16.5L8.5 11.5L13 16L15.5 13.5L21 19"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="absolute left-2 top-2">
        <StatusBadge type={type} status={status} />
      </span>
    </div>
  );
}

function ReportCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col sm:flex-row">
        <div className="h-40 w-full shrink-0 animate-pulse bg-slate-100 sm:h-auto sm:w-44" />
        <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3">
            <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LostAndFoundPage() {
  const [items, setItems] = useState<ApiLostFoundItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const loadReports = useCallback(async (type: TypeFilter, signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);
      // Resolves to http://localhost:8000/api/v1/lost-found by default
      // (or NEXT_PUBLIC_API_URL when configured).
      const path = type === "all" ? "/v1/lost-found" : `/v1/lost-found?type=${type}`;
      const res = await apiFetch<LostFoundListResponse>(path);
      if (signal?.aborted) return;
      setItems(res.data.data);
    } catch {
      if (signal?.aborted) return;
      setItems([]);
      setError("Gagal memuat data laporan. Periksa koneksi ke backend lalu coba lagi.");
    } finally {
      if (signal?.aborted) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch must populate state on mount and when the type filter changes
    void loadReports(typeFilter, controller.signal);
    return () => {
      controller.abort();
    };
  }, [typeFilter, loadReports]);

  const categories = useMemo(() => {
    const names = new Set<string>();
    for (const item of items) {
      if (item.category?.name) names.add(item.category.name);
    }
    return [...names];
  }, [items]);

  const filtered = items.filter((item) => {
    if (activeCategory && (item.category?.name ?? "") !== activeCategory) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q) ||
      (item.description ?? "").toLowerCase().includes(q)
    );
  });

  function clearFilters() {
    setTypeFilter("all");
    setActiveCategory(null);
    setQuery("");
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      {/* Header: title left, report actions + search right */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">Lost &amp; Found</h1>
          <p className="mt-1 text-sm text-slate-500">
            Laporkan barang hilang atau bantu kembalikan barang milik orang lain.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
          <div className="relative w-full sm:w-[260px]">
            <label htmlFor="lost-found-search" className="sr-only">
              Cari laporan
            </label>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </span>
            <input
              id="lost-found-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari judul, lokasi, deskripsi…"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:outline-none focus:ring-1 focus:ring-[#002147]"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Lapor Hilang
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#002147] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#001a38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M2.5 2.5H8L13.5 8L8 13.5L2.5 8V2.5Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
                <circle cx="6" cy="6" r="1.2" stroke="currentColor" strokeWidth="1.1" />
              </svg>
              Lapor Temuan
            </button>
          </div>
        </div>
      </div>

      {/* Layout: sidebar filters + feed */}
      <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-4" aria-label="Filter barang hilang dan temuan">
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 id="filter-status-heading" className="text-[13px] font-semibold text-slate-900">
              Filter Status
            </h2>
            <div
              className="mt-3 space-y-2"
              role="radiogroup"
              aria-labelledby="filter-status-heading"
            >
              {TYPE_FILTERS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2.5 text-[13px] text-slate-700"
                >
                  <input
                    type="radio"
                    name="lost-found-status"
                    value={opt.value}
                    checked={typeFilter === opt.value}
                    onChange={() => setTypeFilter(opt.value)}
                    className="h-3.5 w-3.5 shrink-0 accent-[#002147]"
                  />
                  <span className={`h-2 w-2 shrink-0 rounded-full ${opt.dot}`} aria-hidden="true" />
                  {opt.label}
                </label>
              ))}
            </div>
          </section>

          {categories.length > 0 && (
            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 id="categories-heading" className="text-[13px] font-semibold text-slate-900">
                Kategori
              </h2>
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-labelledby="categories-heading">
                {categories.map((cat) => {
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(isActive ? null : cat)}
                      aria-pressed={isActive}
                      className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2 ${
                        isActive
                          ? "border-[#002147] bg-[#002147] text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </aside>

        {/* Feed */}
        <div>
          {isLoading ? (
            <div
              className="space-y-4"
              role="status"
              aria-busy="true"
              aria-label="Memuat laporan hilang dan temuan"
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <ReportCardSkeleton key={i} />
              ))}
              <span className="sr-only">Memuat data laporan…</span>
            </div>
          ) : error ? (
            <div
              role="alert"
              className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center"
            >
              <p className="text-sm font-medium text-slate-900">Gagal memuat data laporan</p>
              <p className="mt-1 text-xs text-slate-500">{error}</p>
              <button
                type="button"
                onClick={() => void loadReports(typeFilter)}
                className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
              >
                Coba lagi
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500" aria-live="polite" role="status">
                Menampilkan {filtered.length} dari {items.length} laporan
                {activeCategory ? ` di ${activeCategory}` : ""}
              </p>

              {filtered.length === 0 ? (
                <div className="mt-3 rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
                  <p className="text-sm font-medium text-slate-900">Tidak ada laporan ditemukan</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Coba ubah filter status, kategori, atau kata kunci.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
                  >
                    Hapus filter
                  </button>
                </div>
              ) : (
                <div className="mt-3 space-y-4">
                  {filtered.map((item) => {
                    const reporterName = item.user?.name ?? "Mahasiswa UPN";
                    const accent =
                      item.status === "resolved"
                        ? "border-l-slate-400"
                        : item.type === "lost"
                          ? "border-l-rose-600"
                          : "border-l-emerald-600";
                    return (
                      <article
                        key={item.id}
                        className={`overflow-hidden rounded-lg border border-slate-200 border-l-4 bg-white focus-within:ring-2 focus-within:ring-[#002147] focus-within:ring-offset-2 ${accent}`}
                      >
                        <div className="flex flex-col sm:flex-row">
                          <Link
                            href={`/lost-found/${item.id}`}
                            aria-label={`Lihat detail ${item.title}`}
                            className="shrink-0 focus:outline-none"
                          >
                            <ItemPhoto id={item.id} title={item.title} type={item.type} status={item.status} />
                          </Link>
                          <div className="flex min-w-0 flex-1 flex-col p-4">
                            <div className="flex items-start justify-between gap-3">
                              <h2 className="text-[15px] font-semibold leading-6 text-slate-900">
                                <Link href={`/lost-found/${item.id}`} className="hover:underline focus:outline-none">
                                  {item.title}
                                </Link>
                              </h2>
                              <span className="shrink-0 text-[11px] text-slate-400">
                                {formatEventDate(item.date_event)}
                              </span>
                            </div>
                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                              <svg
                                width="11"
                                height="11"
                                viewBox="0 0 16 16"
                                fill="none"
                                aria-hidden="true"
                                className="shrink-0"
                              >
                                <path
                                  d="M8 14C8 14 3.5 9.3 3.5 6C3.5 3.5 5.5 1.5 8 1.5C10.5 1.5 12.5 3.5 12.5 6C12.5 9.3 8 14 8 14Z"
                                  stroke="currentColor"
                                  strokeWidth="1.2"
                                  strokeLinejoin="round"
                                />
                                <circle cx="8" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.2" />
                              </svg>
                              {item.location}
                            </p>
                            {item.reward && (
                              <p className="mt-1.5 w-fit rounded-md bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800 ring-1 ring-inset ring-amber-200">
                                Imbalan: {item.reward}
                              </p>
                            )}
                            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">
                              {item.description ?? "Tidak ada deskripsi."}
                            </p>
                            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                              <span className="flex min-w-0 items-center gap-2">
                                <span
                                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white"
                                  aria-hidden="true"
                                >
                                  {initialsOf(reporterName)}
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate text-xs font-medium text-slate-700">
                                    {reporterName}
                                  </span>
                                  {item.contact_info && (
                                    <span className="block truncate text-[11px] text-slate-400">
                                      {item.contact_info}
                                    </span>
                                  )}
                                </span>
                              </span>
                              <Link
                                href={`/lost-found/${item.id}`}
                                aria-label={`Lihat detail ${item.title}`}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-[#002147] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
                              >
                                Lihat Detail
                              </Link>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
