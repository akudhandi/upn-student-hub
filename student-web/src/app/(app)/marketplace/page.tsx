"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Placeholder data — static array for UI preview.
// TODO: Replace with real API fetch (e.g. GET /api/v1/marketplace) when
// backend is connected. Keep the same shape so swap is trivial.
// ---------------------------------------------------------------------------
type MarketplaceItem = {
  id: string;
  title: string;
  price: number;
  category: string;
  description: string;
  seller: string;
  timeAgo: string;
  condition: string;
};

const PLACEHOLDER_ITEMS: MarketplaceItem[] = [
  {
    id: "1",
    title: "Texas Instruments TI-84 Plus CE",
    price: 1350000,
    category: "Elektronik",
    description: "Jarang dipakai selama satu semester. Dilengkapi kabel charger. Cocok untuk kalkulus.",
    seller: "Sarah J.",
    timeAgo: "2 hari lalu",
    condition: "Baik",
  },
  {
    id: "2",
    title: "Calculus: Early Transcendentals, 9th Ed.",
    price: 720000,
    category: "Buku",
    description: "Kondisi baik. Ada stabilo di bab 1–3. Jilidan masih kokoh.",
    seller: "Mike T.",
    timeAgo: "5 jam lalu",
    condition: "Baik",
  },
  {
    id: "3",
    title: "IKEA Office Chair – White",
    price: 480000,
    category: "Furnitur",
    description: "Dijual karena pindah. Kondisi sangat baik, nyaman untuk belajar lama.",
    seller: "Emily R.",
    timeAgo: "1 hari lalu",
    condition: "Seperti Baru",
  },
  {
    id: "4",
    title: "Sony WH-1000XM4 Headphones",
    price: 2400000,
    category: "Elektronik",
    description: "Upgrade ke model baru. Berfungsi sempurna, baterai masih awet.",
    seller: "David L.",
    timeAgo: "Baru saja",
    condition: "Baik",
  },
  {
    id: "5",
    title: "Casio Scientific Calculator fx-991ID",
    price: 350000,
    category: "Elektronik",
    description: "Jarang dipakai, termasuk manual dan pouch. Ideal untuk mahasiswa teknik.",
    seller: "Aulia P.",
    timeAgo: "3 hari lalu",
    condition: "Seperti Baru",
  },
  {
    id: "6",
    title: "Vintage Denim Jacket – Size M",
    price: 275000,
    category: "Fashion",
    description: "Potongan klasik, tanpa cacat. Sudah dicuci dan siap pakai. Cocok untuk ke kampus.",
    seller: "Rina K.",
    timeAgo: "6 jam lalu",
    condition: "Baik",
  },
];

const CATEGORIES = ["Semua", "Buku", "Elektronik", "Furnitur", "Fashion"] as const;

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
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

export default function MarketplacePage() {
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORIES)[number]>("Semua");
  const [priceFilter, setPriceFilter] = useState("any");
  const [conditionFilter, setConditionFilter] = useState("any");

  const filtered = PLACEHOLDER_ITEMS.filter((item) => {
    if (activeCategory !== "Semua" && item.category !== activeCategory) return false;
    if (conditionFilter !== "any" && item.condition !== conditionFilter) return false;
    if (priceFilter === "under500" && item.price >= 500000) return false;
    if (priceFilter === "500-1000" && (item.price < 500000 || item.price > 1000000)) return false;
    if (priceFilter === "over1000" && item.price <= 1000000) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-[1180px]">
      {/* Placeholder notice */}
      <p className="mb-3 text-[11px] leading-4 text-slate-400">
        Data placeholder — grid ini memakai array statis. Ganti dengan{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">GET /api/v1/marketplace</code> saat API siap.
      </p>

      {/* Top row: Title Card (left) + Quick Filters (right) — aligned */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr] lg:items-start">
        {/* Title Card — must be bg-white border rounded-xl p-6 with thick accent top border */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 border-t-4 border-t-[#D4AF37]">
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900">Marketplace</h1>
          <p className="mt-1 text-sm text-slate-500">Beli dan jual barang di lingkungan komunitas UPN.</p>

          {/* Category Pills — inside the Title Card */}
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter berdasarkan kategori">
            {CATEGORIES.map((cat) => {
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
                <option value="Seperti Baru">Seperti Baru</option>
                <option value="Baik">Baik</option>
                <option value="Cukup">Cukup</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Item Grid — below the top row */}
      <div className="mt-6">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-900">Tidak ada barang ditemukan</p>
            <p className="mt-1 text-xs text-slate-500">Coba ubah filter atau kembali lagi nanti.</p>
            <button
              type="button"
              onClick={() => {
                setActiveCategory("Semua");
                setPriceFilter("any");
                setConditionFilter("any");
              }}
              className="mt-4 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Hapus filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {filtered.map((item) => (
              <article
                key={item.id}
                className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors hover:border-slate-300 focus-within:ring-2 focus-within:ring-[#002147] focus-within:ring-offset-2"
              >
                <ItemImagePlaceholder category={item.category} />
                <div className="flex flex-1 flex-col px-4 py-3">
                  <h3 className="line-clamp-2 text-[13px] font-semibold leading-5 text-slate-900">
                    <a href="#" onClick={(e) => e.preventDefault()} className="hover:underline focus:outline-none">
                      {item.title}
                    </a>
                  </h3>
                  <p className="mt-1 text-xl font-bold text-[#D4AF37]">{formatRupiah(item.price)}</p>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500">{item.description}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="flex items-center gap-2">
                      <SellerAvatar name={item.seller} />
                      <span className="text-xs font-medium text-slate-700">{item.seller}</span>
                    </span>
                    <span className="text-[11px] text-slate-400">{item.timeAgo}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
