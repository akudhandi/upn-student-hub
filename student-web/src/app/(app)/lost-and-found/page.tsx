"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Placeholder data — static array for UI preview.
// TODO: Replace with real API fetch (e.g. GET /api/v1/lost-found) when
// backend is connected. Keep the same shape so swap is trivial.
// ---------------------------------------------------------------------------
type LostFoundStatus = "lost" | "found" | "resolved";

type LostFoundItem = {
  id: string;
  status: LostFoundStatus;
  title: string;
  location: string;
  description: string;
  reporter: string;
  time: string;
  category: string;
  dropOff?: string;
  hasPhoto: boolean;
  photoTone: string;
};

const LOST_ITEMS: LostFoundItem[] = [
  {
    id: "1",
    status: "lost",
    title: "Sekumpulan Kunci dengan Lanyard Merah",
    location: "Dekat Gedung A Fakultas Teknik",
    description:
      "Saya meninggalkan kunci di bangku depan pintu masuk utama. Ada 3 kunci dan gantungan kunci logo UPN pada lanyard merah terang. Tolong kabari saya jika melihatnya!",
    reporter: "Alex Johnson",
    time: "2 jam lalu",
    category: "Kunci",
    hasPhoto: true,
    photoTone: "bg-[#E7EBF0]",
  },
  {
    id: "2",
    status: "found",
    title: "Kalkulator Scientific Casio",
    location: "Perpustakaan, Area Belajar Lantai 2",
    description:
      "Menemukan kalkulator Casio fx-991EX hitam yang tertinggal di meja dekat jendela. Sudah saya titipkan ke meja depan perpustakaan. Bisa diambil di sana.",
    reporter: "Sarah M.",
    time: "Kemarin, 14:30",
    category: "Elektronik",
    dropOff: "Di Meja Depan",
    hasPhoto: true,
    photoTone: "bg-[#EFE8DC]",
  },
  {
    id: "3",
    status: "lost",
    title: "Kartu Tanda Mahasiswa",
    location: "Bus Kampus Rute A",
    description:
      "KTM hilang (Nama: Budi Santoso) di bus shuttle pagi. Dibutuhkan segera untuk UTS minggu depan.",
    reporter: "Budi Santoso",
    time: "24 Okt, 09:15",
    category: "KTM & Kartu",
    hasPhoto: false,
    photoTone: "bg-slate-50",
  },
];

const STATUS_FILTERS = [
  { value: "all", label: "Semua", dot: "bg-[#002147]" },
  { value: "lost", label: "Hilang", dot: "bg-red-600" },
  { value: "found", label: "Ditemukan", dot: "bg-blue-700" },
  { value: "resolved", label: "Selesai", dot: "bg-green-600" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

const CATEGORIES = ["Elektronik", "KTM & Kartu", "Kunci", "Pakaian", "Buku"] as const;

const STATUS_ACCENT: Record<LostFoundStatus, string> = {
  lost: "border-l-red-600",
  found: "border-l-blue-700",
  resolved: "border-l-green-600",
};

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function StatusBadge({ status }: { status: LostFoundStatus }) {
  if (status === "lost") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
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
  if (status === "found") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-blue-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
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
  return (
    <span className="inline-flex items-center gap-1 rounded bg-green-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
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

function ItemPhoto({ item }: { item: LostFoundItem }) {
  if (!item.hasPhoto) {
    return (
      <div
        className="relative flex h-40 w-full shrink-0 items-center justify-center bg-slate-50 sm:h-auto sm:w-44"
        role="img"
        aria-label={`Tidak ada foto untuk ${item.title}`}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="text-slate-300"
        >
          <rect x="2.5" y="5" width="19" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" />
          <rect x="5.5" y="8.5" width="5" height="4" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
          <path d="M13.5 9.5H18.5M13.5 12.5H18.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M5.5 16.5H18.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <span className="absolute left-2 top-2">
          <StatusBadge status={item.status} />
        </span>
      </div>
    );
  }
  return (
    <div
      className={`relative flex h-40 w-full shrink-0 items-center justify-center sm:h-auto sm:w-44 ${item.photoTone}`}
      role="img"
      aria-label={`Placeholder foto untuk ${item.title}`}
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
        <StatusBadge status={item.status} />
      </span>
    </div>
  );
}

export default function LostAndFoundPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = LOST_ITEMS.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (activeCategory && item.category !== activeCategory) return false;
    return true;
  });

  function clearFilters() {
    setStatusFilter("all");
    setActiveCategory(null);
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      <p className="mb-3 text-[11px] leading-4 text-slate-400">
        Data placeholder — feed ini memakai array statis. Ganti dengan{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">GET /api/v1/lost-found</code>{" "}
        saat API siap.
      </p>

      {/* Header: title left, report actions right */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">Lost &amp; Found</h1>
          <p className="mt-1 text-sm text-slate-500">
            Laporkan barang hilang atau bantu kembalikan barang milik orang lain.
          </p>
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
              {STATUS_FILTERS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2.5 text-[13px] text-slate-700"
                >
                  <input
                    type="radio"
                    name="lost-found-status"
                    value={opt.value}
                    checked={statusFilter === opt.value}
                    onChange={() => setStatusFilter(opt.value)}
                    className="h-3.5 w-3.5 shrink-0 accent-[#002147]"
                  />
                  <span className={`h-2 w-2 shrink-0 rounded-full ${opt.dot}`} aria-hidden="true" />
                  {opt.label}
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 id="categories-heading" className="text-[13px] font-semibold text-slate-900">
              Kategori
            </h2>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-labelledby="categories-heading">
              {CATEGORIES.map((cat) => {
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
        </aside>

        {/* Feed */}
        <div>
          <p className="text-xs text-slate-500" aria-live="polite" role="status">
            Menampilkan {filtered.length} dari {LOST_ITEMS.length} laporan
            {activeCategory ? ` di ${activeCategory}` : ""}
          </p>

          {filtered.length === 0 ? (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-900">Tidak ada laporan ditemukan</p>
              <p className="mt-1 text-xs text-slate-500">
                Coba ubah filter status atau kategori.
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
              {filtered.map((item) => (
                <article
                  key={item.id}
                  className={`overflow-hidden rounded-lg border border-slate-200 border-l-4 bg-white focus-within:ring-2 focus-within:ring-[#002147] focus-within:ring-offset-2 ${STATUS_ACCENT[item.status]}`}
                >
                  <div className="flex flex-col sm:flex-row">
                    <ItemPhoto item={item} />
                    <div className="flex min-w-0 flex-1 flex-col p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-[15px] font-semibold leading-6 text-slate-900">
                          <a
                            href="#"
                            onClick={(e) => e.preventDefault()}
                            className="hover:underline focus:outline-none"
                          >
                            {item.title}
                          </a>
                        </h2>
                        <span className="shrink-0 text-[11px] text-slate-400">{item.time}</span>
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
                      <p className="mt-2 text-xs leading-5 text-slate-600">{item.description}</p>
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white"
                            aria-hidden="true"
                          >
                            {initialsOf(item.reporter)}
                          </span>
                          <span className="truncate text-xs font-medium text-slate-700">
                            {item.reporter}
                          </span>
                        </span>
                        {item.dropOff ? (
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-green-700">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 16 16"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M8 14C8 14 3.5 9.3 3.5 6C3.5 3.5 5.5 1.5 8 1.5C10.5 1.5 12.5 3.5 12.5 6C12.5 9.3 8 14 8 14Z"
                                stroke="currentColor"
                                strokeWidth="1.3"
                                strokeLinejoin="round"
                              />
                              <circle cx="8" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.3" />
                            </svg>
                            {item.dropOff}
                          </span>
                        ) : (
                          <button
                            type="button"
                            aria-label={`Hubungi ${item.reporter} tentang ${item.title}`}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-[#002147] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 16 16"
                              fill="none"
                              aria-hidden="true"
                            >
                              <rect
                                x="2"
                                y="3"
                                width="12"
                                height="9"
                                rx="1"
                                stroke="currentColor"
                                strokeWidth="1.2"
                              />
                              <path
                                d="M2.5 4L8 8.2L13.5 4"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Hubungi
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
