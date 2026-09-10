"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Placeholder data — static array for UI preview.
// TODO: Replace with real API fetch (e.g. GET /api/v1/services) when
// backend is connected. Keep the same shape so swap is trivial.
// ---------------------------------------------------------------------------
type ServiceItem = {
  id: string;
  title: string;
  price: number;
  priceSuffix: string;
  category: string;
  description: string;
  provider: string;
  rating: number;
};

const PLACEHOLDER_SERVICES: ServiceItem[] = [
  {
    id: "1",
    title: "Les Kalkulus Lanjut",
    price: 50000,
    priceSuffix: "/jam",
    category: "Les Privat",
    description: "Kesulitan dengan limit atau integral? Saya menawarkan bimbingan langkah demi langkah yang sabar untuk Kalkulus I & II. Tatap muka dekat kampus atau via meet.",
    provider: "Alex M.",
    rating: 4.9,
  },
  {
    id: "2",
    title: "Desain & Poles Presentasi",
    price: 75000,
    priceSuffix: "/proyek",
    category: "Desain",
    description: "Ubah slide membosankan menjadi cerita visual yang menarik. Spesialis pitch deck dan presentasi sidang skripsi.",
    provider: "Sarah T.",
    rating: 5.0,
  },
  {
    id: "3",
    title: "Servis Layar & Baterai Laptop",
    price: 100000,
    priceSuffix: "/servis",
    category: "Servis",
    description: "Servis laptop cepat di kampus. Diagnosa gratis. Sparepart tidak termasuk, disediakan dengan harga ramah mahasiswa.",
    provider: "David K.",
    rating: 4.8,
  },
  {
    id: "4",
    title: "Pelatihan Percakapan Bahasa Inggris",
    price: 40000,
    priceSuffix: "/jam",
    category: "Les Privat",
    description: "Persiapan TOEFL/IELTS atau sekadar melatih kepercayaan diri berbicara. Koreksi pelafalan dan sesi role-play.",
    provider: "Nadia P.",
    rating: 4.9,
  },
  {
    id: "5",
    title: "Laundry Express – Kiloan",
    price: 8000,
    priceSuffix: "/kg",
    category: "Laundry",
    description: "Kembali keesokan harinya, bersih dan terlipat. Antar-jemput gratis dalam 2 km dari kampus. Setrika tersedia + Rp 2.000/kg.",
    provider: "Riko H.",
    rating: 4.7,
  },
  {
    id: "6",
    title: "Fotografi untuk Acara",
    price: 250000,
    priceSuffix: "/sesi",
    category: "Desain",
    description: "Wisuda, acara klub, atau foto profil. Hasil edit maksimal 48 jam. 20+ foto edit per sesi.",
    provider: "Maya S.",
    rating: 5.0,
  },
];

const CATEGORIES = ["Semua", "Les Privat", "Desain", "Servis", "Laundry"] as const;

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function ProviderAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
      {initials}
    </span>
  );
}

function CategoryGlyph({ category }: { category: string }) {
  // Small inline glyphs reused by pills and card icon squares. Pure SVG, no deps.
  if (category === "Desain") {
    return (
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3.5 11.5L8 3.5L12.5 11.5H3.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M6.5 11.5H9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M8 3.5V2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (category === "Servis") {
    return (
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M10.5 2.5L13.5 5.5L6 13L2.5 13.5L3 10L10.5 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    );
  }
  if (category === "Laundry") {
    return (
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5 7H11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M5.5 10H10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (category === "Semua") {
    return (
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }
  // Default: Tutoring (graduation cap)
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3.5L2.5 6L8 8.5L13.5 6L8 3.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M3 11L8 13.5L13 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M5 7.5V10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CategoryIcon({ category }: { category: string }) {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 p-2 text-teal-600">
      <span className="[&>svg]:h-[14px] [&>svg]:w-[14px]">
        <CategoryGlyph category={category} />
      </span>
    </span>
  );
}

export default function ServicesPage() {
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORIES)[number]>("Semua");
  const [query, setQuery] = useState("");

  const filtered = PLACEHOLDER_SERVICES.filter((s) => {
    if (activeCategory !== "Semua" && s.category !== activeCategory) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      s.title.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.provider.toLowerCase().includes(q)
    );
  });

  function clearFilters() {
    setActiveCategory("Semua");
    setQuery("");
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      <p className="mb-3 text-[11px] leading-4 text-slate-400">
        Data placeholder — grid ini memakai array statis. Ganti dengan{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">GET /api/v1/services</code> saat API siap.
      </p>

      {/* Top section: title (left) + search (right) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900">Jasa &amp; Layanan Mahasiswa</h1>
          <p className="mt-1 text-sm text-gray-500">Temukan mahasiswa terampil untuk les, desain, servis, dan lainnya.</p>
        </div>
        <div className="relative w-full sm:w-[260px] sm:shrink-0 sm:pt-1">
          <label htmlFor="services-search" className="sr-only">
            Cari jasa
          </label>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 sm:top-[calc(50%+2px)]">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </span>
          <input
            id="services-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari jasa..."
            className="h-9 w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Category pills with icons */}
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter berdasarkan kategori">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 ${
                isActive
                  ? "border-teal-200 bg-teal-50 text-teal-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <CategoryGlyph category={cat} />
              {cat === "Semua" ? "Semua Jasa" : cat === "Servis" ? "Servis Teknik" : cat}
            </button>
          );
        })}
      </div>

      {/* Grid: 1 col mobile, 2 tablet, 3 desktop */}
      <div className="mt-6">
        {filtered.length === 0 ? (
          <div role="status" className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-900">Tidak ada jasa ditemukan</p>
            <p className="mt-1 text-xs text-gray-500">Coba kata kunci atau kategori lain.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              Hapus filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <article
                key={item.id}
                className="flex flex-col overflow-hidden rounded-xl border border-gray-200 border-t-4 border-t-gray-200 bg-white transition-colors hover:border-x-gray-300 hover:border-b-gray-300 hover:border-t-teal-500 focus-within:ring-2 focus-within:ring-teal-600 focus-within:ring-offset-2"
              >
                <div className="flex flex-1 flex-col p-5">
                  {/* Card header: icon (left) + rating (right) */}
                  <div className="flex items-start justify-between">
                    <CategoryIcon category={item.category} />
                    <span className="inline-flex items-center gap-1 rounded-md border border-gray-100 bg-gray-50 px-2 py-1 text-[11px] font-semibold text-slate-700">
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="text-amber-500">
                        <path d="M8 1.5L9.7 5.9H14.2L10.5 8.6L11.5 13.1L8 10.6L4.5 13.1L5.5 8.6L1.8 5.9H6.3L8 1.5Z" />
                      </svg>
                      {item.rating.toFixed(1)}
                    </span>
                  </div>

                  <h2 className="mt-4 line-clamp-2 text-[14px] font-bold leading-5 text-slate-900">
                    <a href="#" onClick={(e) => e.preventDefault()} className="hover:underline focus:outline-none">
                      {item.title}
                    </a>
                  </h2>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-gray-500">{item.description}</p>

                  {/* Card footer pushed to bottom */}
                  <div className="mt-auto pt-4">
                    <div className="flex items-end justify-between border-t border-gray-100 pt-4">
                      <span className="flex items-center gap-2">
                        <ProviderAvatar name={item.provider} />
                        <span className="flex flex-col">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Penyedia</span>
                          <span className="text-xs font-medium text-slate-700">{item.provider}</span>
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">Mulai dari</span>
                        <span className="text-[14px] font-bold text-slate-900">
                          {formatRupiah(item.price)}
                          <span className="text-[11px] font-medium text-gray-400">{item.priceSuffix}</span>
                        </span>
                      </span>
                    </div>
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
