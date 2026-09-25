"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchFavorites,
  toggleFavorite,
  type FavoriteEntry,
  type InteractableType,
} from "@/lib/interactions";

type SavedItemType = InteractableType;

type SavedItem = {
  key: string;
  type: SavedItemType;
  refId: number | string;
  title: string;
  badge: string;
  priceText?: string;
  sortPrice: number | null;
  meta: string;
  highlight?: string;
};

function formatRupiah(value: number | string): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function normalizeEntry(entry: FavoriteEntry): SavedItem | null {
  if (!entry.type || !entry.item) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- favoritable shape varies per module
  const item: any = entry.item;
  const base = {
    key: `${entry.type}-${item.id ?? entry.id}`,
    type: entry.type,
    refId: item.id ?? entry.id,
  };
  switch (entry.type) {
    case "marketplace":
      return {
        ...base,
        title: item.title ?? "Tanpa judul",
        badge: item.category?.name ?? "Marketplace",
        priceText: item.price !== undefined ? formatRupiah(item.price) : undefined,
        sortPrice: item.price !== undefined ? Number(item.price) : null,
        meta: item.user?.name ?? "Mahasiswa UPN",
      };
    case "kost":
      return {
        ...base,
        title: item.title ?? "Tanpa judul",
        badge: `Kost ${item.gender_type ?? ""}`.trim(),
        priceText: item.price !== undefined ? `${formatRupiah(item.price)} / bulan` : undefined,
        sortPrice: item.price !== undefined ? Number(item.price) : null,
        meta: item.address ?? "",
      };
    case "service": {
      const hasRange =
        item.price_max !== null &&
        item.price_max !== undefined &&
        item.price_max !== "" &&
        Number(item.price_max) > Number(item.price_min);
      return {
        ...base,
        title: item.title ?? "Tanpa judul",
        badge: item.category?.name ?? "Layanan",
        priceText:
          item.price_min !== undefined
            ? hasRange
              ? `${formatRupiah(item.price_min)} – ${formatRupiah(item.price_max)}`
              : formatRupiah(item.price_min)
            : undefined,
        sortPrice: item.price_min !== undefined ? Number(item.price_min) : null,
        meta: item.user?.name ?? "Mahasiswa UPN",
      };
    }
    case "lostfound":
      return {
        ...base,
        title: item.title ?? "Tanpa judul",
        badge: item.type === "lost" ? "Hilang" : "Ditemukan",
        highlight: item.reward ? `Imbalan: ${item.reward}` : undefined,
        sortPrice: null,
        meta: item.location ?? "",
      };
    case "event":
      return {
        ...base,
        title: item.title ?? "Tanpa judul",
        badge: item.category?.name ?? "Event Kampus",
        sortPrice: null,
        meta: `${item.organizer_name ?? ""} • ${item.location ?? ""}`.replace(/^ • | • $/g, ""),
      };
    default:
      return null;
  }
}

function detailHref(item: SavedItem): string {
  switch (item.type) {
    case "marketplace":
      return `/marketplace/${item.refId}`;
    case "kost":
      return `/kost/${item.refId}`;
    case "service":
      return `/services/${item.refId}`;
    case "lostfound":
      return `/lost-found/${item.refId}`;
    case "event":
      return `/events/${item.refId}`;
  }
}

const FILTERS: { key: SavedItemType | "all"; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "marketplace", label: "Marketplace" },
  { key: "kost", label: "Kost" },
  { key: "service", label: "Layanan" },
  { key: "lostfound", label: "Lost & Found" },
  { key: "event", label: "Event" },
];

type SortKey = "terbaru" | "termurah" | "termahal";

function IconHeart() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path
        d="M8 13.2L3.4 9C2.2 7.9 2.2 6 3.4 4.9C4.5 3.8 6.4 3.8 7.6 4.9L8 5.3L8.4 4.9C9.6 3.8 11.5 3.8 12.6 4.9C13.8 6 13.8 7.9 12.6 9L8 13.2Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPin() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M8 14.5C8 14.5 3.5 9.6 3.5 6.5C3.5 4 5.5 2 8 2C10.5 2 12.5 4 12.5 6.5C12.5 9.6 8 14.5 8 14.5Z" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="8" cy="6.5" r="1.8" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3 13C3 10.6 5 9 8 9C11 9 13 10.6 13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 5V8L10 9.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconCap() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M8 3L2 5.5L8 8L14 5.5L8 3Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M4 7V10.5C4 11.3 5.8 12.5 8 12.5C10.2 12.5 12 11.3 12 10.5V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconImage() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="10" r="1.8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 17.5L10 12.5L14 16L16.5 13.5L19.5 16.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MetaIcon({ type }: { type: SavedItemType }) {
  if (type === "kost") return <IconPin />;
  if (type === "service") return <IconCap />;
  if (type === "lostfound" || type === "event") return <IconClock />;
  return <IconUser />;
}

export default function FavoritesPage() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<SavedItemType | "all">("all");
  const [sort, setSort] = useState<SortKey>("terbaru");
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  const loadFavorites = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);
      const entries = await fetchFavorites();
      if (signal?.aborted) return;
      setItems(entries.map(normalizeEntry).filter((i): i is SavedItem => i !== null));
    } catch {
      if (signal?.aborted) return;
      setItems([]);
      setError("Gagal memuat favorit. Periksa koneksi ke backend lalu coba lagi.");
    } finally {
      if (signal?.aborted) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch must populate state on mount
    void loadFavorites(controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadFavorites]);

  async function handleRemove(item: SavedItem) {
    if (removingKey) return;
    setRemovingKey(item.key);
    try {
      await toggleFavorite(item.type, item.refId);
      await loadFavorites();
    } catch {
      setRemovingKey(null);
    }
  }

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: items.length };
    for (const item of items) {
      map[item.type] = (map[item.type] ?? 0) + 1;
    }
    return map;
  }, [items]);

  const visibleItems = useMemo(() => {
    const filtered =
      activeFilter === "all" ? [...items] : items.filter((i) => i.type === activeFilter);
    if (sort === "termurah") {
      filtered.sort((a, b) => (a.sortPrice ?? Number.MAX_SAFE_INTEGER) - (b.sortPrice ?? Number.MAX_SAFE_INTEGER));
    } else if (sort === "termahal") {
      filtered.sort((a, b) => (b.sortPrice ?? -1) - (a.sortPrice ?? -1));
    }
    return filtered;
  }, [items, activeFilter, sort]);

  return (
    <div>
      {/* Header */}
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Favorit Saya</h1>
      <p className="mt-1 text-sm text-slate-500">
        Barang, kost, layanan, laporan, dan event yang Anda simpan untuk dilihat kembali.
      </p>

      {/* Filter & sort bar */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter favorit">
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter.key;
            const count = counts[filter.key] ?? 0;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                aria-pressed={isActive}
                className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                  isActive
                    ? "bg-[#002147] text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {filter.label} ({count})
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="favorites-sort" className="text-[13px] text-slate-500">
            Urutkan:
          </label>
          <div className="relative">
            <select
              id="favorites-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-[13px] font-medium text-slate-700 focus:border-[#002147] focus:outline-none"
            >
              <option value="terbaru">Terbaru Disimpan</option>
              <option value="termurah">Harga Terendah</option>
              <option value="termahal">Harga Tertinggi</option>
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500">
              <IconChevronDown />
            </span>
          </div>
        </div>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div
          className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
          role="status"
          aria-busy="true"
          aria-label="Memuat favorit"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="aspect-[4/3] animate-pulse bg-slate-100" />
              <div className="flex flex-col gap-2 px-4 pb-4 pt-3">
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
          <span className="sr-only">Memuat favorit…</span>
        </div>
      ) : error ? (
        <div role="alert" className="mt-6 rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-900">Gagal memuat favorit</p>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
          <button
            type="button"
            onClick={() => void loadFavorites()}
            className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Coba lagi
          </button>
        </div>
      ) : visibleItems.length === 0 ? (
        <div role="status" className="py-16 text-center">
          <p className="text-sm font-medium text-slate-900">Belum ada item tersimpan</p>
          <p className="mt-1 text-sm text-slate-500">
            {items.length === 0
              ? "Ketuk ikon hati pada halaman detail untuk menyimpan item favoritmu."
              : "Coba pilih filter lain untuk melihat item simpanan Anda."}
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((item) => (
              <li
                key={item.key}
                className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                {/* Image placeholder */}
                <div className="relative aspect-[4/3] bg-slate-100">
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <IconImage />
                  </div>
                  <span className="absolute left-3 top-3 max-w-[60%] truncate rounded-md bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-800">
                    {item.badge}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleRemove(item)}
                    disabled={removingKey === item.key}
                    aria-label={`Hapus ${item.title} dari favorit`}
                    aria-pressed="true"
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-red-500 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    <IconHeart />
                  </button>
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
                  <h2 className="truncate text-[15px] font-semibold text-slate-900" title={item.title}>
                    <Link href={detailHref(item)} className="hover:underline focus:outline-none">
                      {item.title}
                    </Link>
                  </h2>
                  {item.priceText ? (
                    <p className="mt-1 text-[15px] font-bold text-slate-900">{item.priceText}</p>
                  ) : (
                    item.highlight && (
                      <p className="mt-1 text-[13px] font-semibold text-purple-700">{item.highlight}</p>
                    )
                  )}
                  <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-slate-500">
                    <MetaIcon type={item.type} />
                    <span className="truncate">{item.meta}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                  <Link
                    href={detailHref(item)}
                    className="text-[13px] font-medium text-slate-900 hover:underline focus:outline-none"
                  >
                    Lihat Detail
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleRemove(item)}
                    disabled={removingKey === item.key}
                    className="rounded-lg border border-slate-200 px-3.5 py-2 text-[13px] font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {removingKey === item.key ? "Menghapus…" : "Hapus"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[13px] text-slate-500" role="status">
            Menampilkan {visibleItems.length} dari {items.length} item disimpan
          </p>
        </>
      )}
    </div>
  );
}
