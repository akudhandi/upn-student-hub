"use client";

import { useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Placeholder data — static array for UI preview.
// TODO: Replace with real API fetch (e.g. GET /api/v1/favorites) when the
// backend is connected. Keep the `type` discriminator so the card keeps
// rendering the correct buttons and text formats per item type.
// ---------------------------------------------------------------------------
type SavedItemType = "marketplace" | "kost" | "service" | "lostfound";

type SavedItem = {
  id: string;
  type: SavedItemType;
  title: string;
  badge: string;
  price?: number;
  priceUnit?: string;
  meta: string;
  highlight?: string;
};

const SAVED_ITEMS: SavedItem[] = [
  {
    id: "1",
    type: "marketplace",
    title: "Buku Kalkulus Stewart Edisi 9",
    badge: "Marketplace",
    price: 450000,
    meta: "Mike T. (FTI '21) • Kondisi 95%",
  },
  {
    id: "2",
    type: "kost",
    title: "Kost Mawar Putih Babarsari (AC, KM Dalam)",
    badge: "Kost Putra",
    price: 1500000,
    priceUnit: "/ bulan",
    meta: "400m dari Kampus 1 UPN Babarsari",
  },
  {
    id: "3",
    type: "service",
    title: "Tutor Pendamping Kalkulus & Aljabar",
    badge: "Layanan Tutor",
    price: 75000,
    priceUnit: "/ sesi (90 mnt)",
    meta: "Alex M. • Asisten Laboratorium Informatika",
  },
  {
    id: "4",
    type: "marketplace",
    title: "Sony WH-1000XM4 Wireless",
    badge: "Marketplace",
    price: 2200000,
    meta: "Pemakaian skripsi 3 bln, fullset mulus",
  },
  {
    id: "5",
    type: "kost",
    title: "Griya Mahasiswa Tambakbayan (Free WiFi)",
    badge: "Kost Campur",
    price: 1800000,
    priceUnit: "/ bulan",
    meta: "800m ke UPN Kampus Tambakbayan",
  },
  {
    id: "6",
    type: "lostfound",
    title: "Gantungan Kunci Lanyard UPN Merah",
    badge: "Lost & Found",
    highlight: "Disimpan di Pos Satpam Gedung B",
    meta: "Ditemukan kemarin sore di Gedung B FTI",
  },
];

const FILTERS: { key: SavedItemType | "all"; label: string }[] = [
  { key: "all", label: "Semua (12)" },
  { key: "marketplace", label: "Marketplace (5)" },
  { key: "kost", label: "Kost (3)" },
  { key: "service", label: "Layanan (2)" },
  { key: "lostfound", label: "Lost & Found (2)" },
];

type SortKey = "terbaru" | "termurah" | "termahal";

function formatRupiah(value: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID").format(value)}`;
}

function IconHeart() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
  if (type === "lostfound") return <IconClock />;
  return <IconUser />;
}

function CardActions({ item }: { item: SavedItem }) {
  if (item.type === "kost") {
    return (
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
        <button type="button" className="text-[13px] font-medium text-slate-900 hover:underline">
          Lihat Detail
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-3.5 py-2 text-[13px] font-semibold text-slate-900 hover:bg-slate-50"
        >
          Hubungi Pemilik
        </button>
      </div>
    );
  }
  if (item.type === "service") {
    return (
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
        <button type="button" className="text-[13px] font-medium text-slate-900 hover:underline">
          Jadwal &amp; Silabus
        </button>
        <button
          type="button"
          className="rounded-lg bg-[#002147] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#001a38]"
        >
          Pesan Sesi
        </button>
      </div>
    );
  }
  if (item.type === "lostfound") {
    return (
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
        <button type="button" className="text-[13px] font-medium text-slate-900 hover:underline">
          Detail Lokasi
        </button>
        <button
          type="button"
          className="rounded-lg bg-purple-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-purple-700"
        >
          Klaim Barang
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
      <button type="button" className="text-[13px] font-medium text-slate-900 hover:underline">
        Lihat Detail
      </button>
      <button
        type="button"
        className="rounded-lg bg-[#002147] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#001a38]"
      >
        Chat Penjual
      </button>
    </div>
  );
}

export default function FavoritesPage() {
  const [activeFilter, setActiveFilter] = useState<SavedItemType | "all">("all");
  const [sort, setSort] = useState<SortKey>("terbaru");

  const visibleItems = useMemo(() => {
    const filtered =
      activeFilter === "all" ? [...SAVED_ITEMS] : SAVED_ITEMS.filter((i) => i.type === activeFilter);
    if (sort === "termurah") {
      filtered.sort((a, b) => (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER));
    } else if (sort === "termahal") {
      filtered.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    }
    return filtered;
  }, [activeFilter, sort]);

  return (
    <div>
      {/* Header */}
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Favorit Saya</h1>
      <p className="mt-1 text-sm text-slate-500">
        Barang, kost, dan layanan yang Anda simpan untuk dilihat kembali.
      </p>

      {/* Filter & sort bar */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter favorit">
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter.key;
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
                {filter.label}
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
      {visibleItems.length === 0 ? (
        <div role="status" className="py-16 text-center">
          <p className="text-sm font-medium text-slate-900">Belum ada item tersimpan</p>
          <p className="mt-1 text-sm text-slate-500">Coba pilih filter lain untuk melihat item simpanan Anda.</p>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((item) => (
            <li
              key={item.id}
              className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              {/* Image placeholder */}
              <div className="relative aspect-[4/3] bg-slate-100">
                <div className="flex h-full w-full items-center justify-center text-slate-300">
                  <IconImage />
                </div>
                <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-800">
                  {item.badge}
                </span>
                <button
                  type="button"
                  aria-label={`Hapus ${item.title} dari favorit`}
                  aria-pressed="true"
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-red-500 shadow-sm hover:bg-slate-50"
                >
                  <IconHeart />
                </button>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
                <h2 className="truncate text-[15px] font-semibold text-slate-900" title={item.title}>
                  {item.title}
                </h2>
                {item.price !== undefined ? (
                  <p className="mt-1 text-[15px] font-bold text-slate-900">
                    {formatRupiah(item.price)}
                    {item.priceUnit && (
                      <span className="ml-1 text-[13px] font-normal text-slate-500">{item.priceUnit}</span>
                    )}
                  </p>
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

              <CardActions item={item} />
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <p className="text-[13px] text-slate-500">Menampilkan 1–6 dari 12 item disimpan</p>
        <nav className="flex items-center gap-1.5" aria-label="Navigasi halaman favorit">
          <button
            type="button"
            disabled
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-medium text-slate-400 disabled:cursor-not-allowed"
          >
            Sebelumnya
          </button>
          <button
            type="button"
            aria-current="page"
            className="rounded-lg bg-[#002147] px-3 py-1.5 text-[13px] font-semibold text-white"
          >
            1
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
          >
            2
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Selanjutnya
          </button>
        </nav>
      </div>
    </div>
  );
}
