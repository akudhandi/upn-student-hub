"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchFavorites,
  toggleFavorite,
  type FavoriteEntry,
  type InteractableType,
} from "@/lib/interactions";
import ListingImage from "@/components/ListingImage";
import VerifiedBadge, { isVerifiedEventOrganizer } from "@/components/VerifiedBadge";
import type { ImageModule } from "@/lib/images";
import {
  formatOptionalShortDate,
  formatRupiah,
  formatTimeAgo,
} from "@/lib/formatters";

type SavedItemType = InteractableType;

type SavedItem = {
  key: string;
  type: SavedItemType;
  refId: number | string;
  title: string;
  badge: string;
  typeLabel?: string;
  priceText?: string;
  sortPrice: number | null;
  meta: string;
  highlight?: string;
  isVerified?: boolean;
  favoritedAt?: string | null;
  images?: NonNullable<FavoriteEntry["item"]>["images"];
};

function parseFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeEntry(entry: FavoriteEntry): SavedItem | null {
  if (!entry.type || !entry.item || typeof entry.item !== "object") return null;
  const item = entry.item;
  const base = {
    key: `${entry.type}-${item.id ?? entry.id}`,
    type: entry.type,
    refId: item.id ?? entry.id,
    favoritedAt: entry.favorited_at ?? null,
    images: Array.isArray(item.images) ? item.images : null,
  };

  switch (entry.type) {
    case "marketplace": {
      const price = parseFiniteNumber(item.price);
      const categoryName = item.category?.name?.trim() || null;
      return {
        ...base,
        title: item.title?.trim() || "Tanpa judul",
        badge: categoryName ?? "Marketplace",
        typeLabel: categoryName ? "Marketplace" : undefined,
        priceText: price !== null ? formatRupiah(price) : undefined,
        sortPrice: price,
        meta: item.user?.name?.trim() || "Mahasiswa UPN",
      };
    }
    case "service": {
      const priceMin = parseFiniteNumber(item.price_min);
      const priceMax = parseFiniteNumber(item.price_max);
      const categoryName = item.category?.name?.trim() || null;
      return {
        ...base,
        title: item.title?.trim() || "Tanpa judul",
        badge: categoryName ?? "Layanan",
        typeLabel: categoryName ? "Layanan" : undefined,
        priceText:
          priceMin !== null
            ? priceMax !== null && priceMax > priceMin
              ? `${formatRupiah(priceMin)} - ${formatRupiah(priceMax)}`
              : formatRupiah(priceMin)
            : undefined,
        sortPrice: priceMin,
        meta: item.user?.name?.trim() || "Mahasiswa UPN",
      };
    }
    case "lostfound": {
      const categoryName = item.category?.name?.trim() || null;
      const rewardText = item.reward?.trim() || null;
      return {
        ...base,
        title: item.title?.trim() || "Tanpa judul",
        badge: item.type === "lost" ? "Hilang" : "Ditemukan",
        typeLabel: categoryName ?? "Lost & Found",
        highlight: rewardText ? `Imbalan: ${rewardText}` : undefined,
        sortPrice: null,
        meta: item.location?.trim() || item.user?.name?.trim() || "Kampus UPN",
      };
    }
    case "event": {
      const categoryName = item.category?.name?.trim() || null;
      const eventDateLabel = formatOptionalShortDate(item.event_date);
      const metaParts = [item.organizer_name?.trim(), item.location?.trim()].filter(
        (v): v is string => Boolean(v)
      );
      return {
        ...base,
        title: item.title?.trim() || "Tanpa judul",
        badge: categoryName ?? "Event Kampus",
        typeLabel: categoryName ? "Event" : undefined,
        highlight: eventDateLabel ? `Jadwal: ${eventDateLabel}` : undefined,
        sortPrice: null,
        meta: metaParts.length > 0 ? metaParts.join(" · ") : "Kampus UPN",
        isVerified: isVerifiedEventOrganizer({
          is_verified: item.is_verified,
          user: item.user,
        }),
      };
    }
    default:
      return null;
  }
}

function detailHref(item: SavedItem): string {
  switch (item.type) {
    case "marketplace":
      return `/marketplace/${item.refId}`;
    case "service":
      return `/services/${item.refId}`;
    case "lostfound":
      return `/lost-found/${item.refId}`;
    case "event":
      return `/events/${item.refId}`;
  }
}

type FilterOption = {
  key: SavedItemType | "all";
  label: string;
  catalogHref: string;
  catalogCta: string;
};

const FILTERS: FilterOption[] = [
  {
    key: "all",
    label: "Semua",
    catalogHref: "/marketplace",
    catalogCta: "Buka katalog marketplace",
  },
  {
    key: "marketplace",
    label: "Marketplace",
    catalogHref: "/marketplace",
    catalogCta: "Buka katalog marketplace",
  },
  {
    key: "service",
    label: "Layanan",
    catalogHref: "/services",
    catalogCta: "Lihat layanan mahasiswa",
  },
  {
    key: "lostfound",
    label: "Lost & Found",
    catalogHref: "/lost-found",
    catalogCta: "Cek laporan barang",
  },
  {
    key: "event",
    label: "Event",
    catalogHref: "/events",
    catalogCta: "Lihat jadwal event",
  },
];

type SortKey = "terbaru" | "termurah" | "termahal";

function IconHeart() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path
        d="M8 13.2L3.4 9C2.2 7.9 2.2 6 3.4 4.9C4.5 3.8 6.4 3.8 7.6 4.9L8 5.3L8.4 4.9C9.6 3.8 11.5 3.8 12.6 4.9C13.8 6 13.8 7.9 12.6 9L8 13.2Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M3 13C3 10.6 5 9 8 9C11 9 13 10.6 13 13"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCap() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M8 3L2 5.5L8 8L14 5.5L8 3Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <path
        d="M4 7V10.5C4 11.3 5.8 12.5 8 12.5C10.2 12.5 12 11.3 12 10.5V7"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMapPin() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M8 14C8 14 12.5 10.2 12.5 6.8C12.5 4.26 10.49 2.25 8 2.25C5.51 2.25 3.5 4.26 3.5 6.8C3.5 10.2 8 14 8 14Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="6.8" r="1.5" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <rect x="2.5" y="3.5" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.25" />
      <path d="M5.5 2V4.5M10.5 2V4.5M2.5 6.5H13.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MetaIcon({ type }: { type: SavedItemType }) {
  if (type === "service") return <IconCap />;
  if (type === "lostfound") return <IconMapPin />;
  if (type === "event") return <IconCalendar />;
  return <IconUser />;
}

function FavoriteCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white">
      <div className="aspect-[4/3] animate-pulse bg-[#EFECE8]" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="h-5 w-24 animate-pulse rounded-md bg-[#F4F1EE]" />
        <div className="h-5 w-4/5 animate-pulse rounded-lg bg-[#F4F1EE]" />
        <div className="h-6 w-2/5 animate-pulse rounded-lg bg-[#EFECE8]" />
        <div className="mt-auto flex items-center justify-between border-t border-[#F1EDE8] pt-4">
          <div className="h-5 w-24 animate-pulse rounded-lg bg-[#F4F1EE]" />
          <div className="h-11 w-24 animate-pulse rounded-full bg-[#F4F1EE]" />
        </div>
      </div>
    </div>
  );
}

export default function FavoritesPage() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<SavedItemType | "all">("all");
  const [sort, setSort] = useState<SortKey>("terbaru");
  const [removingKeys, setRemovingKeys] = useState<Record<string, boolean>>({});

  const loadFavorites = useCallback(
    async (signal?: AbortSignal, options?: { silent?: boolean }) => {
      const silent = options?.silent === true;
      try {
        if (!silent) {
          setIsLoading(true);
          setLoadError(null);
        }
        const entries = await fetchFavorites(signal);
        if (signal?.aborted) return;
        setItems(entries.map(normalizeEntry).filter((i): i is SavedItem => i !== null));
        setLoadError(null);
      } catch {
        if (signal?.aborted) return;
        if (!silent) {
          setItems([]);
          setLoadError("Gagal memuat daftar favorit. Periksa koneksi backend lalu coba lagi.");
        } else {
          setActionError("Gagal menyinkronkan daftar favorit. Coba muat ulang halaman.");
        }
      } finally {
        if (signal?.aborted) return;
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch must populate state on mount
    void loadFavorites(controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadFavorites]);

  async function handleRemove(item: SavedItem) {
    if (removingKeys[item.key]) return;
    setRemovingKeys((prev) => ({ ...prev, [item.key]: true }));
    setActionError(null);
    try {
      const stillFavorited = await toggleFavorite(item.type, item.refId);
      if (!stillFavorited) {
        setItems((prev) => prev.filter((entry) => entry.key !== item.key));
      } else {
        await loadFavorites(undefined, { silent: true });
      }
    } catch {
      setActionError(`Gagal menghapus ${item.title} dari favorit. Coba lagi.`);
    } finally {
      setRemovingKeys((prev) => {
        const next = { ...prev };
        delete next[item.key];
        return next;
      });
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
      filtered.sort(
        (a, b) =>
          (a.sortPrice ?? Number.MAX_SAFE_INTEGER) - (b.sortPrice ?? Number.MAX_SAFE_INTEGER)
      );
    } else if (sort === "termahal") {
      filtered.sort((a, b) => (b.sortPrice ?? -1) - (a.sortPrice ?? -1));
    }
    return filtered;
  }, [items, activeFilter, sort]);

  const activeFilterMeta =
    FILTERS.find((filter) => filter.key === activeFilter) ?? FILTERS[0];

  const headerSubtitle = isLoading
    ? "Memuat barang, layanan, laporan, dan event kampus yang kamu simpan."
    : loadError
      ? "Barang, layanan, laporan, dan event kampus yang kamu simpan akan tampil di sini."
      : items.length === 0
        ? "Belum ada item tersimpan dari marketplace, layanan, laporan, atau event kampus."
        : `Kamu menyimpan ${items.length} item dari katalog marketplace, layanan, laporan, dan event kampus.`;

  return (
    <div className="auth-shell-enter mx-auto max-w-[1200px] space-y-7">
      {/* Header Band */}
      <section className="flex flex-col justify-between gap-5 border-b border-[#E5E0DA] pb-6 lg:flex-row lg:items-end">
        <div className="min-w-0 space-y-2">
          <p className="text-[13px] font-medium text-[#6E6A66]">
            Portal Mahasiswa / Daftar Favorit
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[#141416] sm:text-[32px] sm:leading-[1.18]">
            Daftar Favorit
          </h1>
          <p className="text-[14px] leading-relaxed text-[#57534E]">{headerSubtitle}</p>
        </div>

        {!isLoading && !loadError && items.length === 0 && (
          <Link
            href="/marketplace"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            Buka katalog marketplace
          </Link>
        )}
      </section>

      {/* Filter & Sort Bar */}
      <section
        aria-label="Filter dan urutkan daftar favorit"
        className="rounded-[20px] border border-[#E5E0DA] bg-white p-5 sm:p-6"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Filter berdasarkan jenis item"
          >
            {FILTERS.map((filter) => {
              const isActive = activeFilter === filter.key;
              const count = counts[filter.key] ?? 0;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  aria-pressed={isActive}
                  className={`inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 motion-reduce:transition-none ${
                    isActive
                      ? "bg-[#141416] text-white"
                      : "bg-[#F4F1EE] text-[#57534E] hover:bg-[#EAE6E2] hover:text-[#141416]"
                  }`}
                >
                  {!isLoading && !loadError ? `${filter.label} (${count})` : filter.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2.5 lg:shrink-0">
            <label htmlFor="favorites-sort" className="text-[13px] font-medium text-[#57534E]">
              Urutkan
            </label>
            <div className="relative">
              <select
                id="favorites-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="h-11 w-full appearance-none rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] pl-3.5 pr-9 text-[14px] font-medium text-[#141416] transition-all duration-150 hover:border-[#CFC8BF] focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] sm:w-auto sm:min-w-[200px]"
              >
                <option value="terbaru">Terbaru disimpan</option>
                <option value="termurah">Harga terendah</option>
                <option value="termahal">Harga tertinggi</option>
              </select>
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6E6A66]">
                <IconChevronDown />
              </span>
            </div>
          </div>
        </div>
      </section>

      {actionError && (
        <div
          role="alert"
          className="flex flex-col justify-between gap-3 rounded-[20px] border border-[#E7C4C4] bg-[#FDF2F2] px-5 py-4 text-[14px] text-[#B83232] sm:flex-row sm:items-center"
        >
          <p className="font-medium">{actionError}</p>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-[#E7C4C4] bg-white px-4 text-[13px] font-semibold text-[#B83232] transition-colors hover:bg-[#FDF2F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Saved Items Content */}
      <section aria-label="Daftar item favorit">
        {isLoading ? (
          <div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            role="status"
            aria-busy="true"
            aria-label="Memuat daftar favorit"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <FavoriteCardSkeleton key={i} />
            ))}
            <span className="sr-only">Memuat daftar favorit…</span>
          </div>
        ) : loadError ? (
          <div
            role="alert"
            className="rounded-[20px] border border-[#E5E0DA] bg-white px-6 py-14 text-center"
          >
            <h2 className="font-display text-lg font-semibold text-[#141416]">
              Gagal memuat daftar favorit
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-[14px] leading-relaxed text-[#6E6A66]">
              {loadError}
            </p>
            <button
              type="button"
              onClick={() => void loadFavorites()}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              Muat ulang daftar
            </button>
          </div>
        ) : visibleItems.length === 0 ? (
          <div
            role="status"
            className="rounded-[20px] border border-[#E5E0DA] bg-white px-6 py-14 text-center"
          >
            <h2 className="font-display text-lg font-semibold text-[#141416]">
              {items.length === 0
                ? "Belum ada item tersimpan"
                : `Belum ada item di kategori ${activeFilterMeta.label}`}
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-[14px] leading-relaxed text-[#6E6A66]">
              {items.length === 0
                ? "Simpan barang marketplace, layanan mahasiswa, laporan barang hilang, atau event kampus dari halaman detailnya."
                : `Tampilkan semua item tersimpan atau buka katalog ${activeFilterMeta.label.toLowerCase()} untuk menambah favorit baru.`}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {items.length === 0 ? (
                <>
                  <Link
                    href="/marketplace"
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    Buka katalog marketplace
                  </Link>
                  <Link
                    href="/services"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-6 text-[14px] font-medium text-[#141416] transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:border-[#141416] hover:bg-[#FAF8F6] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    Lihat layanan mahasiswa
                  </Link>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("all")}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-6 text-[14px] font-medium text-[#141416] transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:border-[#141416] hover:bg-[#FAF8F6] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    Tampilkan semua ({items.length})
                  </button>
                  <Link
                    href={activeFilterMeta.catalogHref}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    {activeFilterMeta.catalogCta}
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visibleItems.map((item, idx) => {
                const isRemoving = Boolean(removingKeys[item.key]);
                const savedAgo = formatTimeAgo(item.favoritedAt, {
                  justNowLabel: "Baru disimpan",
                });
                return (
                  <li
                    key={item.key}
                    className="group flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white transition-all duration-180 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[2px] hover:border-[#CFC8BF] hover:shadow-[0_14px_28px_-14px_rgba(20,20,22,0.10)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    <Link
                      href={detailHref(item)}
                      aria-label={`Lihat detail ${item.title}`}
                      className="block overflow-hidden bg-[#EFECE8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#141416]"
                    >
                      <ListingImage
                        module={item.type as ImageModule}
                        seed={item.refId}
                        width={800}
                        height={600}
                        eager={idx < 3}
                        hint={`${item.badge} ${item.title}`}
                        images={item.images}
                        alt={`Foto ${item.title}`}
                        className="aspect-[4/3] w-full object-cover transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      />
                    </Link>

                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="max-w-full truncate rounded-md bg-[#F4F1EE] px-2.5 py-1 text-[13px] font-medium text-[#57534E]">
                          {item.badge}
                        </span>
                        {item.typeLabel && (
                          <span className="text-[13px] font-medium text-[#6E6A66]">
                            {item.typeLabel}
                          </span>
                        )}
                      </div>

                      <h2
                        className="mt-3 line-clamp-2 break-words font-display text-[16px] font-semibold leading-snug text-[#141416]"
                        title={item.title}
                      >
                        <Link
                          href={detailHref(item)}
                          className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                        >
                          {item.title}
                        </Link>
                      </h2>

                      {item.priceText ? (
                        <p className="mt-1.5 font-display text-[20px] font-bold tracking-tight text-[#141416]">
                          {item.priceText}
                        </p>
                      ) : (
                        item.highlight && (
                          <p className="mt-1.5 font-display text-[15px] font-semibold text-[#141416]">
                            {item.highlight}
                          </p>
                        )
                      )}

                      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                        <p className="flex min-w-0 items-center gap-1.5 text-[13px] text-[#57534E]">
                          <MetaIcon type={item.type} />
                          <span className="truncate">{item.meta}</span>
                          {item.isVerified && (
                            <VerifiedBadge
                              size="xs"
                              title="Penyelenggara resmi terverifikasi UPN"
                            />
                          )}
                        </p>
                        {savedAgo && (
                          <span className="shrink-0 text-[13px] text-[#6E6A66]">
                            {savedAgo}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#F1EDE8] pt-3.5">
                        <Link
                          href={detailHref(item)}
                          className="inline-flex min-h-[44px] items-center rounded-lg px-1 text-[13px] font-semibold text-[#141416] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                        >
                          Lihat detail
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleRemove(item)}
                          disabled={isRemoving}
                          aria-label={`Hapus ${item.title} dari favorit`}
                          className="inline-flex h-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1.5 rounded-full border border-[#D9D2C9] bg-white px-4 text-[13px] font-medium text-[#57534E] transition-colors duration-150 hover:border-[#B83232] hover:bg-[#FDF2F2] hover:text-[#B83232] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                        >
                          <IconHeart />
                          <span>{isRemoving ? "Menghapus…" : "Hapus"}</span>
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <p className="mt-6 text-[13px] font-medium text-[#6E6A66]" role="status">
              Menampilkan {visibleItems.length} dari {items.length} item disimpan
            </p>
          </>
        )}
      </section>
    </div>
  );
}
