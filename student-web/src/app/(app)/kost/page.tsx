"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Placeholder data — static array for UI preview.
// TODO: Replace with real API fetch (e.g. GET /api/v1/kost) when backend is
// connected. Keep the same shape so swap is trivial.
// ---------------------------------------------------------------------------
type KostListing = {
  id: string;
  name: string;
  pricePerMonth: number;
  priceLabel: string;
  distanceLabel: string;
  distanceKm: number;
  rating: number;
  roomsLeft: number;
  availabilityLabel: string;
  availabilityTone: "ok" | "low";
  facilities: string[];
  imageTone: string;
};

const KOST_LISTINGS: KostListing[] = [
  {
    id: "1",
    name: "Kost Mawar Putih",
    pricePerMonth: 1500000,
    priceLabel: "Rp 1,5 jt / bulan",
    distanceLabel: "400m dari UPN (5 mnt jalan)",
    distanceKm: 0.4,
    rating: 4.8,
    roomsLeft: 2,
    availabilityLabel: "Tersedia (2 kamar)",
    availabilityTone: "ok",
    facilities: ["AC", "WiFi Gratis", "Kamar Mandi Dalam"],
    imageTone: "#E7ECF2",
  },
  {
    id: "2",
    name: "Griya Mahasiswa Premium",
    pricePerMonth: 1800000,
    priceLabel: "Rp 1,8 jt / bulan",
    distanceLabel: "800m dari UPN (10 mnt jalan)",
    distanceKm: 0.8,
    rating: 4.9,
    roomsLeft: 1,
    availabilityLabel: "Sisa 1 kamar",
    availabilityTone: "low",
    facilities: ["AC", "WiFi Gratis", "Kamar Mandi Dalam", "Area Parkir"],
    imageTone: "#EFE9DF",
  },
  {
    id: "3",
    name: "Kost Melati Asri",
    pricePerMonth: 950000,
    priceLabel: "Rp 950 rb / bulan",
    distanceLabel: "1,5 km dari UPN (7 mnt naik motor)",
    distanceKm: 1.5,
    rating: 4.6,
    roomsLeft: 3,
    availabilityLabel: "Tersedia (3 kamar)",
    availabilityTone: "ok",
    facilities: ["WiFi Gratis", "Dapur Bersama", "Area Parkir"],
    imageTone: "#E8F0E9",
  },
  {
    id: "4",
    name: "Wisma Cendekia Putra",
    pricePerMonth: 1200000,
    priceLabel: "Rp 1,2 jt / bulan",
    distanceLabel: "2,4 km dari UPN (10 mnt naik motor)",
    distanceKm: 2.4,
    rating: 4.7,
    roomsLeft: 4,
    availabilityLabel: "Tersedia (4 kamar)",
    availabilityTone: "ok",
    facilities: ["AC", "Dapur Bersama", "Area Parkir"],
    imageTone: "#E9EAF3",
  },
];

const DISTANCE_OPTIONS = [
  { value: "near", label: "< 1 km (Jalan kaki)", short: "< 1 km" },
  { value: "mid", label: "1 - 3 km (Sepeda/Motor)", short: "1 - 3 km" },
  { value: "far", label: "> 3 km", short: "> 3 km" },
] as const;

type DistanceValue = (typeof DISTANCE_OPTIONS)[number]["value"] | "any";

const FACILITY_OPTIONS = [
  "AC",
  "WiFi Gratis",
  "Kamar Mandi Dalam",
  "Dapur Bersama",
  "Area Parkir",
] as const;

function matchesDistance(km: number, distance: DistanceValue): boolean {
  if (distance === "any") return true;
  if (distance === "near") return km < 1;
  if (distance === "mid") return km >= 1 && km <= 3;
  return km > 3;
}

function FacilityGlyph({ facility }: { facility: string }) {
  // Inline SVGs only — no dependencies.
  if (facility === "AC") {
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 2V14M3 5L13 11M13 5L3 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M8 2L6.8 3.2M8 2L9.2 3.2M8 14L6.8 12.8M8 14L9.2 12.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    );
  }
  if (facility === "WiFi Gratis") {
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2.5 6.5C5 4 11 4 13.5 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M4.8 8.8C6.5 7.2 9.5 7.2 11.2 8.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M7 11.2C7.4 10.8 8.6 10.8 9 11.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="8" cy="13" r="0.9" fill="currentColor" />
      </svg>
    );
  }
  if (facility === "Kamar Mandi Dalam") {
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M4 3H12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M5.5 3V4.5C5.5 5.5 6.5 6 8 6C9.5 6 10.5 5.5 10.5 4.5V3" stroke="currentColor" strokeWidth="1.2" />
        <path d="M6 6V7M10 6V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M4.5 8.5H11.5V12.5C11.5 13 11 13.5 10.5 13.5H5.5C5 13.5 4.5 13 4.5 12.5V8.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    );
  }
  if (facility === "Dapur Bersama") {
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M5 2.5V7C5 8 5.8 8.5 6.5 8.5V13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M5 5H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M11 2.5C10 3.5 10 5 11 6V8.5H10V13.5H12V8.5H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // Area Parkir
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.5 11.5V4.5H8.5C9.6 4.5 10.3 5.2 10.3 6.2C10.3 7.2 9.6 7.9 8.5 7.9H6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RoomPlaceholder({ tone, name }: { tone: string; name: string }) {
  return (
    <div
      className="flex aspect-[16/10] items-center justify-center"
      style={{ backgroundColor: tone }}
      role="img"
      aria-label={`Placeholder foto untuk ${name}`}
    >
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-slate-500/70">
        <rect x="3" y="7" width="18" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M3 11H21" stroke="currentColor" strokeWidth="1.3" />
        <path d="M6 7V5.5C6 4.7 6.7 4 7.5 4H11V7" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M5 17V18.5M19 17V18.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <rect x="14.5" y="12.5" width="4" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.1" />
      </svg>
    </div>
  );
}

export default function KostPage() {
  const [view, setView] = useState<"list" | "map">("list");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [distance, setDistance] = useState<DistanceValue>("near");
  const [facilities, setFacilities] = useState<string[]>(["AC", "WiFi Gratis"]);
  const [favorites, setFavorites] = useState<string[]>([]);

  function toggleFacility(facility: string) {
    setFacilities((prev) =>
      prev.includes(facility) ? prev.filter((f) => f !== facility) : [...prev, facility]
    );
  }

  function toggleFavorite(id: string) {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  }

  function resetFilters() {
    setMinPrice("");
    setMaxPrice("");
    setDistance("any");
    setFacilities([]);
  }

  const activeDistance = DISTANCE_OPTIONS.find((d) => d.value === distance) ?? null;

  const filtered = KOST_LISTINGS.filter((kost) => {
    if (!matchesDistance(kost.distanceKm, distance)) return false;
    if (!facilities.every((f) => kost.facilities.includes(f))) return false;
    const min = minPrice.trim() === "" ? null : Number(minPrice);
    const max = maxPrice.trim() === "" ? null : Number(maxPrice);
    if (min !== null && !Number.isNaN(min) && kost.pricePerMonth < min) return false;
    if (max !== null && !Number.isNaN(max) && kost.pricePerMonth > max) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-[1180px]">
      <p className="mb-3 text-[11px] leading-4 text-slate-400">
        Data placeholder — grid ini memakai array statis. Ganti dengan{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">GET /api/v1/kost</code> saat API siap.
      </p>

      {/* Header: title left, List/Map toggle right */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
            Jelajahi Kost di sekitar UPN
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Temukan hunian mahasiswa ideal dalam jarak jalan kaki dari kampus.
          </p>
        </div>
        <div
          className="inline-flex w-fit items-center rounded-lg border border-gray-200 bg-white p-1"
          role="group"
          aria-label="Ubah mode tampilan"
        >
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2 ${
              view === "list"
                ? "bg-slate-100 text-slate-900"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.3" />
              <rect x="9" y="2" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.3" />
              <rect x="2" y="9" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.3" />
              <rect x="9" y="9" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            Daftar
          </button>
          <button
            type="button"
            onClick={() => setView("map")}
            aria-pressed={view === "map"}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2 ${
              view === "map"
                ? "bg-slate-100 text-slate-900"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M5.5 3L2 4.5V13L5.5 11.5L10.5 13L14 11.5V3L10.5 4.5L5.5 3Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M5.5 3V11.5M10.5 4.5V13" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            Peta
          </button>
        </div>
      </div>

      {/* Mobile filter toggle */}
      <div className="mt-4 lg:hidden">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
          aria-controls="kost-filters"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-slate-500">
            <path d="M2.5 4.5H13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="6" cy="4.5" r="1.5" fill="white" stroke="currentColor" strokeWidth="1.2" />
            <path d="M2.5 11.5H13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="10" cy="11.5" r="1.5" fill="white" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          {filtersOpen ? "Sembunyikan filter" : "Tampilkan filter"}
        </button>
      </div>

      {/* Layout: sidebar filters + main content */}
      <div className="mt-4 grid grid-cols-1 items-start gap-5 lg:grid-cols-[280px_1fr]">
        {/* Filters sidebar */}
        <aside
          id="kost-filters"
          aria-label="Filter kost"
          className={`rounded-lg border border-gray-200 bg-white p-5 ${filtersOpen ? "block" : "hidden"} lg:block`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#002147]">Filter</h2>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-sm text-xs font-semibold text-green-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
            >
              Atur Ulang
            </button>
          </div>

          <div className="mt-5">
            <label className="text-xs font-semibold text-[#002147]">
              Harga Bulanan (Rp)
              <span className="mt-2 flex items-center gap-2 font-normal">
                <span className="sr-only">Harga minimum</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="Min"
                  aria-label="Harga bulanan minimum dalam rupiah"
                  className="h-9 w-full rounded-md border border-gray-200 bg-slate-100 px-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-green-600 focus:bg-white focus:outline-none"
                />
                <span aria-hidden="true" className="text-slate-300">
                  –
                </span>
                <span className="sr-only">Harga maksimum</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Maks"
                  aria-label="Harga bulanan maksimum dalam rupiah"
                  className="h-9 w-full rounded-md border border-gray-200 bg-slate-100 px-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-green-600 focus:bg-white focus:outline-none"
                />
              </span>
            </label>
          </div>

          <fieldset className="mt-5">
            <legend className="text-xs font-semibold text-[#002147]">Jarak ke Kampus</legend>
            <div className="mt-2.5 space-y-2">
              {DISTANCE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex cursor-pointer items-center gap-2.5 text-[13px] text-slate-700">
                  <input
                    type="radio"
                    name="kost-distance"
                    value={opt.value}
                    checked={distance === opt.value}
                    onChange={() => setDistance(opt.value)}
                    className="h-3.5 w-3.5 shrink-0 accent-green-700"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="text-xs font-semibold text-[#002147]">Fasilitas</legend>
            <div className="mt-2.5 space-y-2">
              {FACILITY_OPTIONS.map((facility) => (
                <label key={facility} className="flex cursor-pointer items-center gap-2.5 text-[13px] text-slate-700">
                  <input
                    type="checkbox"
                    checked={facilities.includes(facility)}
                    onChange={() => toggleFacility(facility)}
                    className="h-3.5 w-3.5 shrink-0 rounded-sm accent-green-700"
                  />
                  {facility}
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            className="mt-6 w-full rounded-md bg-green-700 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"
          >
            Terapkan Filter
          </button>
        </aside>

        {/* Main content */}
        <div>
          {view === "map" ? (
            <div
              role="status"
              className="flex flex-col items-center rounded-lg border border-gray-200 bg-white px-6 py-14 text-center"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded border border-gray-200 bg-slate-50 text-slate-500">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M5.5 3L2 4.5V13L5.5 11.5L10.5 13L14 11.5V3L10.5 4.5L5.5 3Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  <path d="M5.5 3V11.5M10.5 4.5V13" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </span>
              <h2 className="mt-4 text-sm font-semibold text-slate-900">Tampilan peta tidak tersedia di pratinjau ini</h2>
              <p className="mt-1 max-w-[380px] text-xs leading-5 text-slate-500">
                Peta produksi memakai Leaflet.js + OpenStreetMap. Kembali ke Daftar untuk melihat kartu kost.
              </p>
              <button
                type="button"
                onClick={() => setView("list")}
                className="mt-4 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
              >
                Kembali ke Daftar
              </button>
            </div>
          ) : (
            <>
              {/* Active filter chips */}
              {(activeDistance || facilities.length > 0) && (
                <div className="flex flex-wrap gap-2" aria-label="Filter aktif">
                  {activeDistance && (
                    <button
                      type="button"
                      onClick={() => setDistance("any")}
                      aria-label={`Hapus filter jarak ${activeDistance.short}`}
                      className="inline-flex items-center gap-1.5 rounded-md bg-green-100 px-2.5 py-1 text-xs font-medium text-green-900 hover:bg-green-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"
                    >
                      {activeDistance.short}
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                  {facilities.map((facility) => (
                    <button
                      key={facility}
                      type="button"
                      onClick={() => toggleFacility(facility)}
                      aria-label={`Hapus filter fasilitas ${facility}`}
                      className="inline-flex items-center gap-1.5 rounded-md bg-green-100 px-2.5 py-1 text-xs font-medium text-green-900 hover:bg-green-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"
                    >
                      {facility}
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}

              {/* Kost cards grid */}
              {filtered.length === 0 ? (
                <div role="status" className="mt-4 rounded-lg border border-gray-200 bg-white px-6 py-12 text-center">
                  <p className="text-sm font-medium text-slate-900">Tidak ada kost ditemukan</p>
                  <p className="mt-1 text-xs text-slate-500">Coba perluas rentang harga atau hapus filter fasilitas.</p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-4 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
                  >
                    Atur ulang filter
                  </button>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {filtered.map((kost) => {
                    const isFavorite = favorites.includes(kost.id);
                    return (
                      <article
                        key={kost.id}
                        className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-[#002147] focus-within:ring-offset-2"
                      >
                        <div className="relative">
                          <RoomPlaceholder tone={kost.imageTone} name={kost.name} />
                          <button
                            type="button"
                            onClick={() => toggleFavorite(kost.id)}
                            aria-pressed={isFavorite}
                            aria-label={isFavorite ? `Hapus ${kost.name} dari favorit` : `Simpan ${kost.name} ke favorit`}
                            className="absolute right-2.5 top-2.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-slate-500 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 16 16"
                              fill={isFavorite ? "currentColor" : "none"}
                              aria-hidden="true"
                              className={isFavorite ? "text-red-600" : ""}
                            >
                              <path
                                d="M8 13.2L3.4 8.9C2.1 7.7 2.1 5.7 3.4 4.4C4.6 3.1 6.5 3.1 7.7 4.4L8 4.7L8.3 4.4C9.5 3.1 11.4 3.1 12.6 4.4C13.9 5.7 13.9 7.7 12.6 8.9L8 13.2Z"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                          <span className="absolute bottom-2.5 left-2.5 rounded bg-slate-900/85 px-2 py-1 text-[11px] font-semibold text-white">
                            {kost.priceLabel}
                          </span>
                        </div>

                        <div className="flex flex-1 flex-col p-4">
                          <div className="flex items-start justify-between gap-2">
                            <h2 className="text-[14px] font-semibold leading-5 text-slate-900">
                              <a
                                href="#"
                                onClick={(e) => e.preventDefault()}
                                className="hover:underline focus:outline-none"
                              >
                                {kost.name}
                              </a>
                            </h2>
                            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-700">
                              <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="text-amber-500">
                                <path d="M8 1.5L9.7 5.9H14.2L10.5 8.6L11.5 13.1L8 10.6L4.5 13.1L5.5 8.6L1.8 5.9H6.3L8 1.5Z" />
                              </svg>
                              {kost.rating.toFixed(1)}
                            </span>
                          </div>

                          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-green-700">
                              <path d="M8 14C8 14 3.5 9.3 3.5 6C3.5 3.5 5.5 1.5 8 1.5C10.5 1.5 12.5 3.5 12.5 6C12.5 9.3 8 14 8 14Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                              <circle cx="8" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.2" />
                            </svg>
                            {kost.distanceLabel}
                          </p>

                          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                            <span className="flex items-center gap-1.5" aria-label={`Fasilitas: ${kost.facilities.join(", ")}`}>
                              {kost.facilities.slice(0, 4).map((facility) => (
                                <span
                                  key={facility}
                                  title={facility}
                                  className="flex h-6 w-6 items-center justify-center rounded bg-green-50 text-green-800"
                                >
                                  <FacilityGlyph facility={facility} />
                                </span>
                              ))}
                            </span>
                            <span
                              className={`text-[11px] font-semibold ${
                                kost.availabilityTone === "low" ? "text-red-600" : "text-green-700"
                              }`}
                            >
                              {kost.availabilityLabel}
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* Pagination (visual only for UI preview) */}
              <nav aria-label="Halaman kost" className="mt-6 flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  aria-label="Halaman sebelumnya"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-xs text-slate-500 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]"
                >
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {["1", "2", "3"].map((page) => (
                  <button
                    key={page}
                    type="button"
                    aria-label={`Halaman ${page}`}
                    aria-current={page === "1" ? "page" : undefined}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-md border text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] ${
                      page === "1"
                        ? "border-green-700 bg-green-700 text-white"
                        : "border-gray-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  aria-label="Halaman berikutnya"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-xs text-slate-500 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]"
                >
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </nav>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
