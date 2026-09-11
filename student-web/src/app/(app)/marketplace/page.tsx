"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

// ---------------------------------------------------------------------------
// API types — shape of GET /api/v1/marketplace (Laravel paginator wrapped in
// a standard { message, data } JSON envelope).
// ---------------------------------------------------------------------------
type ApiMarketplaceItem = {
  id: number;
  title: string;
  description: string | null;
  price: number | string;
  condition: string;
  status: string;
  created_at: string;
  user?: { id: number; name: string } | null;
  category?: { id: number; name: string; slug: string } | null;
};

type MarketplaceListResponse = {
  message: string;
  data: {
    current_page: number;
    last_page: number;
    total: number;
    data: ApiMarketplaceItem[];
  };
};

const CONDITION_LABELS: Record<string, string> = {
  new: "Baru",
  "like-new": "Seperti Baru",
  good: "Baik",
  fair: "Cukup",
};

function formatRupiah(value: number | string): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatTimeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return "";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return new Date(isoDate).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ItemImagePlaceholder({ category }: { category: string }) {
  return (
    <div className="relative flex aspect-[4/3] items-center justify-center bg-[#EEF2F7]">
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="text-slate-400"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.3" />
        <path d="M3 16L8.5 11L13 15.5L16 13L21 18" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <span className="absolute right-3 top-3 rounded-md bg-amber-100/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-900 backdrop-blur-sm">
        {category}
      </span>
    </div>
  );
}

function SellerAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
      {initials}
    </span>
  );
}

function ItemCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="aspect-[4/3] animate-pulse bg-[#EEF2F7]" />
      <div className="flex flex-1 flex-col gap-2 px-4 py-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-6 w-1/2 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-14 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const [items, setItems] = useState<ApiMarketplaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("Semua");
  const [priceFilter, setPriceFilter] = useState("any");
  const [conditionFilter, setConditionFilter] = useState("any");

  useEffect(() => {
    let cancelled = false;

    async function loadItems() {
      try {
        setIsLoading(true);
        setError(null);
        // Resolves to http://localhost:8000/api/v1/marketplace by default
        // (or NEXT_PUBLIC_API_URL when configured).
        const res = await apiFetch<MarketplaceListResponse>("/v1/marketplace");
        if (!cancelled) setItems(res.data.data);
      } catch {
        if (!cancelled) {
          setItems([]);
          setError("Gagal memuat data. Periksa koneksi ke backend lalu coba lagi.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadItems();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const names = new Set<string>();
    for (const item of items) {
      if (item.category?.name) names.add(item.category.name);
    }
    return ["Semua", ...names];
  }, [items]);

  const filtered = items.filter((item) => {
    const categoryName = item.category?.name ?? "";
    const price = Number(item.price);
    if (activeCategory !== "Semua" && categoryName !== activeCategory) return false;
    if (conditionFilter !== "any" && item.condition !== conditionFilter) return false;
    if (priceFilter === "under500" && price >= 500000) return false;
    if (priceFilter === "500-1000" && (price < 500000 || price > 1000000)) return false;
    if (priceFilter === "over1000" && price <= 1000000) return false;
    return true;
  });

  function resetFilters() {
    setActiveCategory("Semua");
    setPriceFilter("any");
    setConditionFilter("any");
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      {/* Top row: Title Card (left) + Quick Filters (right) — aligned */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr] lg:items-start">
        {/* Title Card — must be bg-white border rounded-xl p-6 with thick accent top border */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 border-t-4 border-t-[#D4AF37]">
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900">Marketplace</h1>
          <p className="mt-1 text-sm text-slate-500">Beli dan jual barang di lingkungan komunitas UPN.</p>

          {/* Category Pills — inside the Title Card */}
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter berdasarkan kategori">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  aria-pressed={isActive}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${
                    isActive
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {cat === "Semua" ? "Semua Barang" : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Filters Card — aligned at top with Title Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-slate-500">
              <path d="M3 4.5H13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M5 8H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M7 11.5H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="8" cy="4.5" r="1.2" stroke="currentColor" strokeWidth="1.1" />
              <circle cx="8" cy="8" r="1.2" stroke="currentColor" strokeWidth="1.1" />
            </svg>
            Filter Cepat
          </h2>

          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="price-range" className="text-xs font-medium text-slate-700">
                Rentang Harga
              </label>
              <select
                id="price-range"
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="mt-1 w-full rounded border border-slate-200 bg-[#F8F9FB] px-2.5 py-2 text-xs text-slate-700 focus:border-[#002147] focus:bg-white focus:outline-none"
              >
                <option value="any">Semua Harga</option>
                <option value="under500">Di bawah Rp 500.000</option>
                <option value="500-1000">Rp 500.000 – 1.000.000</option>
                <option value="over1000">Di atas Rp 1.000.000</option>
              </select>
            </div>

            <div>
              <label htmlFor="condition" className="text-xs font-medium text-slate-700">
                Kondisi
              </label>
              <select
                id="condition"
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value)}
                className="mt-1 w-full rounded border border-slate-200 bg-[#F8F9FB] px-2.5 py-2 text-xs text-slate-700 focus:border-[#002147] focus:bg-white focus:outline-none"
              >
                <option value="any">Semua Kondisi</option>
                <option value="new">Baru</option>
                <option value="like-new">Seperti Baru</option>
                <option value="good">Baik</option>
                <option value="fair">Cukup</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Item Grid — below the top row */}
      <div className="mt-6">
        {isLoading ? (
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3"
            role="status"
            aria-busy="true"
            aria-label="Memuat barang marketplace"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <ItemCardSkeleton key={i} />
            ))}
            <span className="sr-only">Memuat data marketplace…</span>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center"
          >
            <p className="text-sm font-medium text-slate-900">Gagal memuat data</p>
            <p className="mt-1 text-xs text-slate-500">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setIsLoading(true);
                apiFetch<MarketplaceListResponse>("/v1/marketplace")
                  .then((res) => setItems(res.data.data))
                  .catch(() => {
                    setItems([]);
                    setError("Gagal memuat data. Periksa koneksi ke backend lalu coba lagi.");
                  })
                  .finally(() => setIsLoading(false));
              }}
              className="mt-4 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Coba lagi
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-900">Tidak ada barang ditemukan</p>
            <p className="mt-1 text-xs text-slate-500">Coba ubah filter atau kembali lagi nanti.</p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Hapus filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {filtered.map((item) => {
              const categoryName = item.category?.name ?? "Lainnya";
              const sellerName = item.user?.name ?? "Mahasiswa UPN";
              return (
                <article
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors hover:border-slate-300 focus-within:ring-2 focus-within:ring-[#002147] focus-within:ring-offset-2"
                >
                  <ItemImagePlaceholder category={categoryName} />
                  <div className="flex flex-1 flex-col px-4 py-3">
                    <h3 className="line-clamp-2 text-[13px] font-semibold leading-5 text-slate-900">
                      <a href="#" onClick={(e) => e.preventDefault()} className="hover:underline focus:outline-none">
                        {item.title}
                      </a>
                    </h3>
                    <p className="mt-1 text-xl font-bold text-[#D4AF37]">{formatRupiah(item.price)}</p>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500">
                      {item.description ?? "Tidak ada deskripsi."}
                      {item.condition ? ` Kondisi: ${CONDITION_LABELS[item.condition] ?? item.condition}.` : ""}
                    </p>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="flex items-center gap-2">
                        <SellerAvatar name={sellerName} />
                        <span className="text-xs font-medium text-slate-700">{sellerName}</span>
                      </span>
                      <span className="text-[11px] text-slate-400">{formatTimeAgo(item.created_at)}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
