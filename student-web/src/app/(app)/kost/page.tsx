"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, type ApiError } from "@/lib/api";

// ---------------------------------------------------------------------------
// API types — shape of GET /api/v1/kost (Laravel paginator wrapped in a
// standard { message, data } JSON envelope).
// ---------------------------------------------------------------------------
type ApiKostItem = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  address: string;
  latitude: string | number;
  longitude: string | number;
  price: number | string;
  facilities: string[] | null;
  gender_type: string;
  status: string;
  created_at: string;
  user?: { id: number; name: string } | null;
};

type KostListResponse = {
  message: string;
  data: {
    current_page: number;
    last_page: number;
    total: number;
    data: ApiKostItem[];
  };
};

type KostCreateResponse = {
  message: string;
  data: ApiKostItem;
};

const EMPTY_FORM = {
  title: "",
  address: "",
  gender_type: "campur",
  price: "",
  description: "",
};

const GENDER_FORM_OPTIONS = [
  { value: "putra", label: "Putra" },
  { value: "putri", label: "Putri" },
  { value: "campur", label: "Campur" },
] as const;

type GenderValue = "all" | "putra" | "putri" | "campur";

const GENDER_OPTIONS: { value: GenderValue; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "putra", label: "Putra" },
  { value: "putri", label: "Putri" },
  { value: "campur", label: "Campur" },
];

const GENDER_LABELS: Record<string, string> = {
  putra: "Putra",
  putri: "Putri",
  campur: "Campur",
};

const GENDER_BADGE_TONES: Record<string, string> = {
  putra: "bg-blue-50 text-blue-800",
  putri: "bg-rose-50 text-rose-800",
  campur: "bg-green-50 text-green-800",
};

const FACILITY_OPTIONS = [
  "AC",
  "WiFi",
  "Kamar Mandi Dalam",
  "Dapur Bersama",
  "Parkir Motor",
] as const;

const IMAGE_TONES = ["#E7ECF2", "#EFE9DF", "#E8F0E9", "#E9EAF3"];

function formatRupiah(value: number | string): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function normalizeFacility(value: string): string {
  return value.toLowerCase().trim();
}

// Backend facility names may differ slightly from the filter labels
// (e.g. "WiFi" vs "WiFi Gratis", "Parkir Motor" vs "Area Parkir"),
// so match fuzzily instead of requiring exact equality.
function facilityMatches(kostFacilities: string[], wanted: string): boolean {
  const w = normalizeFacility(wanted);
  return kostFacilities.some((item) => {
    const n = normalizeFacility(item);
    return n === w || n.includes(w) || w.includes(n);
  });
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

function KostCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="aspect-[16/10] animate-pulse bg-slate-100" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-6 w-1/2 animate-pulse rounded bg-slate-100" />
        <div className="flex gap-1.5">
          <div className="h-5 w-14 animate-pulse rounded bg-slate-100" />
          <div className="h-5 w-14 animate-pulse rounded bg-slate-100" />
          <div className="h-5 w-14 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function KostContent() {
  const [view, setView] = useState<"list" | "map">("list");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [kosts, setKosts] = useState<ApiKostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gender, setGender] = useState<GenderValue>("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [facilities, setFacilities] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formFacilities, setFormFacilities] = useState<string[]>([]);
  // UI-only presentation states (not sent to POST /v1/kost) to mirror the design.
  const [jenisIklan, setJenisIklan] = useState<"kamar" | "oper">("kamar");
  const [jarakKampus, setJarakKampus] = useState("450 meter (Kampus 1 UPN Babar");
  const [waktuTempuh, setWaktuTempuh] = useState("5 menit jalan kaki santai");
  const [periodeBayar, setPeriodeBayar] = useState("Per Bulan");
  const [statusAir, setStatusAir] = useState<"include" | "exclude">("include");
  const [statusListrik, setStatusListrik] = useState<"include" | "token" | "tagihan">("include");
  const [dimensiKamar, setDimensiKamar] = useState("3 × 4 Meter (Ukuran Standar Lega)");
  const [fasilitasInput, setFasilitasInput] = useState("");
  const [catatanTambahan] = useState(
    "Kost sangat tenang untuk mahasiswa skripsi atau kuliah aktif. Tidak berisik, sirkulasi udara baik. Jam bertamu maksimal pukul 22.00 WIB. Dekat tempat makan dan minimarket."
  );
  const [namaPemilik, setNamaPemilik] = useState("Ibu Sri Wahyuni (Pemilik)");
  const [nomorWa, setNomorWa] = useState("081234567890");
  const [kostPhotos, setKostPhotos] = useState<{ id: number; url: string }[]>([]);
  const kostPhotoIdRef = useRef(0);
  // Pin-point map state — defaults to Kampus 1 UPN Babarsari area.
  const [latitude, setLatitude] = useState(-7.773428);
  const [longitude, setLongitude] = useState(110.468241);
  const [pinPos, setPinPos] = useState({ x: 50, y: 50 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const createRequested = searchParams.get("action") === "create";

  const loadKosts = useCallback(async (genderFilter: GenderValue, signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);
      // Resolves to http://localhost:8000/api/v1/kost by default
      // (or NEXT_PUBLIC_API_URL when configured).
      const path =
        genderFilter === "all" ? "/v1/kost" : `/v1/kost?gender_type=${genderFilter}`;
      const res = await apiFetch<KostListResponse>(path);
      if (signal?.aborted) return;
      setKosts(res.data.data);
    } catch {
      if (signal?.aborted) return;
      setKosts([]);
      setError("Gagal memuat data kost. Periksa koneksi ke backend lalu coba lagi.");
    } finally {
      if (signal?.aborted) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch must populate state on mount and when the gender filter changes
    void loadKosts(gender, controller.signal);
    return () => {
      controller.abort();
    };
  }, [gender, loadKosts]);

  function toggleFacility(facility: string) {
    setFacilities((prev) =>
      prev.includes(facility) ? prev.filter((f) => f !== facility) : [...prev, facility]
    );
  }

  function toggleFormFacility(facility: string) {
    setFormFacilities((prev) =>
      prev.includes(facility) ? prev.filter((f) => f !== facility) : [...prev, facility]
    );
  }

  function addCustomFacility() {
    const value = fasilitasInput.trim();
    if (!value) return;
    setFormFacilities((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setFasilitasInput("");
  }

  function updateForm<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function addKostPhotos(files: FileList | null) {
    if (!files) return;
    const next = Array.from(files).map((file) => {
      kostPhotoIdRef.current += 1;
      return { id: kostPhotoIdRef.current, url: URL.createObjectURL(file) };
    });
    setKostPhotos((prev) => [...prev, ...next].slice(0, 6));
  }

  function removeKostPhoto(id: number) {
    setKostPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  }

  function clearKostPhotos() {
    setKostPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
  }

  // Clicking the map placeholder drops the pin there and derives
  // latitude/longitude from the click position inside the map box.
  function handleMapPin(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const hasPointer = e.clientX !== 0 || e.clientY !== 0;
    const xRatio = hasPointer ? Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1) : 0.5;
    const yRatio = hasPointer ? Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1) : 0.5;
    setPinPos({ x: Math.round(xRatio * 100), y: Math.round(yRatio * 100) });
    // Map box spans roughly ±0.005° around the UPN Babarsari center.
    setLatitude(Number((-7.773428 + (0.5 - yRatio) * 0.01).toFixed(6)));
    setLongitude(Number((110.468241 + (xRatio - 0.5) * 0.01).toFixed(6)));
  }

  const clearCreateParam = useCallback(() => {
    if (searchParams.get("action") === "create") {
      router.replace("/kost");
    }
  }, [router, searchParams]);

  const closeModal = useCallback(() => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setSubmitError(null);
    setKostPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
    clearCreateParam();
  }, [isSubmitting, clearCreateParam]);

  // Open the modal when navigated via sidebar CTA (?action=create).
  useEffect(() => {
    if (createRequested) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- URL-driven modal must sync state when the search param appears
      setSubmitError(null);
      setIsModalOpen(true);
    }
  }, [createRequested]);

  // Close modal on Escape for keyboard users.
  useEffect(() => {
    if (!isModalOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, closeModal]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (formFacilities.length === 0) {
      setSubmitError("Pilih minimal satu fasilitas kost.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await apiFetch<KostCreateResponse>("/v1/kost", {
        method: "POST",
        body: JSON.stringify({
          title: formData.title.trim(),
          address: formData.address.trim(),
          gender_type: formData.gender_type,
          price: Number(formData.price),
          facilities: formFacilities,
          description: formData.description.trim() === "" ? null : formData.description.trim(),
          latitude,
          longitude,
        }),
      });
      const createdGender = res.data.gender_type;
      setIsModalOpen(false);
      setFormData(EMPTY_FORM);
      setFormFacilities([]);
      clearKostPhotos();
      clearCreateParam();
      // Switch the list filter to the new listing's type so it appears immediately.
      if (createdGender === "putra" || createdGender === "putri" || createdGender === "campur") {
        if (createdGender !== gender) {
          setGender(createdGender);
        } else {
          await loadKosts(gender);
        }
      } else {
        await loadKosts(gender);
      }
    } catch (err) {
      const apiError = err as ApiError;
      const fieldErrors = apiError.errors
        ? Object.values(apiError.errors).flat().join(" ")
        : null;
      setSubmitError(fieldErrors || apiError.message || "Gagal memasang iklan kost. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleFavorite(id: number) {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  }

  function resetFilters() {
    setGender("all");
    setMinPrice("");
    setMaxPrice("");
    setFacilities([]);
  }

  const activeGender = GENDER_OPTIONS.find((g) => g.value === gender) ?? null;

  // Price and facility filters apply client-side on top of the
  // server-filtered (gender_type) kost list.
  const filtered = kosts.filter((kost) => {
    if (!facilities.every((f) => facilityMatches(kost.facilities ?? [], f))) return false;
    const min = minPrice.trim() === "" ? null : Number(minPrice);
    const max = maxPrice.trim() === "" ? null : Number(maxPrice);
    const price = Number(kost.price);
    if (min !== null && !Number.isNaN(min) && price < min) return false;
    if (max !== null && !Number.isNaN(max) && price > max) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-[1180px]">
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

          <fieldset className="mt-5">
            <legend className="text-xs font-semibold text-[#002147]">Tipe Kost</legend>
            <div className="mt-2.5 space-y-2">
              {GENDER_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex cursor-pointer items-center gap-2.5 text-[13px] text-slate-700">
                  <input
                    type="radio"
                    name="kost-gender"
                    value={opt.value}
                    checked={gender === opt.value}
                    onChange={() => setGender(opt.value)}
                    className="h-3.5 w-3.5 shrink-0 accent-green-700"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

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
          ) : isLoading ? (
            <div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              role="status"
              aria-busy="true"
              aria-label="Memuat data kost"
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <KostCardSkeleton key={i} />
              ))}
              <span className="sr-only">Memuat data kost…</span>
            </div>
          ) : error ? (
            <div
              role="alert"
              className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center"
            >
              <p className="text-sm font-medium text-slate-900">Gagal memuat data kost</p>
              <p className="mt-1 text-xs text-slate-500">{error}</p>
              <button
                type="button"
                onClick={() => void loadKosts(gender)}
                className="mt-4 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
              >
                Coba lagi
              </button>
            </div>
          ) : (
            <>
              {/* Active filter chips */}
              {((activeGender && activeGender.value !== "all") || facilities.length > 0) && (
                <div className="flex flex-wrap gap-2" aria-label="Filter aktif">
                  {activeGender && activeGender.value !== "all" && (
                    <button
                      type="button"
                      onClick={() => setGender("all")}
                      aria-label={`Hapus filter tipe ${activeGender.label}`}
                      className="inline-flex items-center gap-1.5 rounded-md bg-green-100 px-2.5 py-1 text-xs font-medium text-green-900 hover:bg-green-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"
                    >
                      Kost {activeGender.label}
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

              <p className="mt-4 text-xs text-slate-500" role="status">
                Menampilkan {filtered.length} kost{gender !== "all" ? ` tipe ${GENDER_LABELS[gender] ?? gender}` : ""}
              </p>

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
                  {filtered.map((kost, index) => {
                    const isFavorite = favorites.includes(kost.id);
                    const genderLabel = GENDER_LABELS[kost.gender_type] ?? kost.gender_type;
                    const genderTone = GENDER_BADGE_TONES[kost.gender_type] ?? "bg-slate-100 text-slate-700";
                    const kostFacilities = kost.facilities ?? [];
                    const visibleFacilities = kostFacilities.slice(0, 4);
                    const hiddenCount = kostFacilities.length - visibleFacilities.length;
                    return (
                      <article
                        key={kost.id}
                        className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-[#002147] focus-within:ring-offset-2"
                      >
                        <div className="relative">
                          <RoomPlaceholder tone={IMAGE_TONES[index % IMAGE_TONES.length]} name={kost.title} />
                          <span
                            className={`absolute left-2.5 top-2.5 rounded px-2 py-1 text-[11px] font-semibold ${genderTone}`}
                          >
                            Kost {genderLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleFavorite(kost.id)}
                            aria-pressed={isFavorite}
                            aria-label={isFavorite ? `Hapus ${kost.title} dari favorit` : `Simpan ${kost.title} ke favorit`}
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
                            {formatRupiah(kost.price)} / bulan
                          </span>
                        </div>

                        <div className="flex flex-1 flex-col p-4">
                            <h2 className="text-[14px] font-semibold leading-5 text-slate-900">
                              <Link
                                href={`/kost/${kost.id}`}
                                className="hover:underline focus:outline-none focus-visible:underline"
                              >
                                {kost.title}
                              </Link>
                            </h2>

                          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-green-700">
                              <path d="M8 14C8 14 3.5 9.3 3.5 6C3.5 3.5 5.5 1.5 8 1.5C10.5 1.5 12.5 3.5 12.5 6C12.5 9.3 8 14 8 14Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                              <circle cx="8" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.2" />
                            </svg>
                            {kost.address}
                          </p>

                          {kostFacilities.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5" aria-label={`Fasilitas: ${kostFacilities.join(", ")}`}>
                              {visibleFacilities.map((facility) => (
                                <span
                                  key={facility}
                                  className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700"
                                >
                                  {facility}
                                </span>
                              ))}
                              {hiddenCount > 0 && (
                                <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">
                                  +{hiddenCount} lainnya
                                </span>
                              )}
                            </div>
                          )}

                          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                            <span className="text-[11px] font-semibold text-green-700">
                              Tersedia
                            </span>
                            <span className="max-w-[60%] truncate text-[11px] text-slate-500">
                              {kost.user?.name ?? "Pemilik Kost"}
                            </span>
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

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pasang-kost-title"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-[980px] overflow-y-auto rounded-2xl border border-gray-200 bg-[#F4F5F7]"
          >
            <div className="px-5 pt-5 sm:px-7 sm:pt-6">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] text-slate-400">
                  Beranda <span className="mx-1">/</span> Info Kost <span className="mx-1">/</span>{" "}
                  <span className="font-semibold text-slate-700">Pasang Iklan Kost</span>
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  aria-label="Tutup modal"
                  className="rounded-md px-2 py-0.5 text-xl leading-none text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 disabled:opacity-50"
                >
                  ×
                </button>
              </div>
              <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                Kanal Hunian Mahasiswa
              </p>
              <h2 id="pasang-kost-title" className="mt-1 text-[22px] font-bold tracking-tight text-slate-900">
                Pasang Iklan Kost &amp; Oper Sewa
              </h2>
              <p className="mt-0.5 max-w-[620px] text-[13px] leading-5 text-slate-500">
                Publikasikan kamar kost kosong atau tawarkan oper kontrak sisa masa tinggal kepada sesama
                civitas UPN &ldquo;Veteran&rdquo; Yogyakarta secara transparan tanpa calo.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-5 pb-6 pt-4 sm:px-7">
              <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_250px]">
                <div className="space-y-5">
                  {/* Informasi Hunian */}
                  <section aria-labelledby="kost-info-heading" className="rounded-xl border border-gray-200 bg-white p-5">
                    <h3 id="kost-info-heading" className="text-[14px] font-bold text-slate-900">Informasi Hunian</h3>
                    <p className="mt-0.5 text-[12px] text-slate-500">Tipe sewa, nama properti, dan alamat kost dekat kampus UPN</p>

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <fieldset>
                        <legend className="text-[12px] font-semibold text-slate-900">Jenis Iklan <span className="text-red-500">*</span></legend>
                        <div className="mt-1.5 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Jenis iklan">
                          {(
                            [
                              { value: "kamar", label: "Kamar Kosong" },
                              { value: "oper", label: "Oper Sewa" },
                            ] as const
                          ).map((opt) => {
                            const checked = jenisIklan === opt.value;
                            return (
                              <label
                                key={opt.value}
                                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-[12px] transition-colors ${
                                  checked
                                    ? "border-slate-300 bg-slate-50 font-semibold text-slate-900"
                                    : "border-slate-200 bg-[#F1F3F5] text-slate-500 hover:bg-slate-100"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="kost-jenis"
                                  value={opt.value}
                                  checked={checked}
                                  onChange={() => setJenisIklan(opt.value)}
                                  className="h-3.5 w-3.5 accent-[#0A2342]"
                                />
                                {opt.label}
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                      <fieldset>
                        <legend className="text-[12px] font-semibold text-slate-900">Tipe Penghuni <span className="text-red-500">*</span></legend>
                        <div className="mt-1.5 flex gap-2" role="radiogroup" aria-label="Tipe penghuni">
                          {GENDER_FORM_OPTIONS.map((opt) => {
                            const checked = formData.gender_type === opt.value;
                            return (
                              <label
                                key={opt.value}
                                className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border px-2 py-2.5 text-[12px] transition-colors ${
                                  checked
                                    ? "border-[#B9CDF3] bg-[#EAF1FB] font-semibold text-[#0A2342]"
                                    : "border-slate-200 bg-[#F1F3F5] text-slate-500 hover:bg-slate-100"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="kost-gender"
                                  value={opt.value}
                                  checked={checked}
                                  onChange={(e) => updateForm("gender_type", e.target.value)}
                                  required
                                  className="sr-only"
                                />
                                {opt.label}
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <label htmlFor="kost-title" className="text-[12px] font-semibold text-slate-900">
                          Nama Kost / Hunian <span className="text-red-500">*</span>
                        </label>
                        <span className="hidden text-[10px] text-slate-400 sm:block">Contoh: Kost Mawar Putih Babarsari</span>
                      </div>
                      <input
                        id="kost-title"
                        type="text"
                        required
                        maxLength={255}
                        value={formData.title}
                        onChange={(e) => updateForm("title", e.target.value)}
                        placeholder="Griya Mahasiswa Tambakbayan"
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002147]/15"
                      />
                    </div>

                    <div className="mt-4">
                      <label htmlFor="kost-address" className="text-[12px] font-semibold text-slate-900">
                        Alamat Lengkap <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="kost-address"
                        type="text"
                        required
                        value={formData.address}
                        onChange={(e) => updateForm("address", e.target.value)}
                        placeholder="Jl. Delima No. 14, Condongcatur, Kec. Depok, Sleman"
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002147]/15"
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="kost-jarak" className="text-[12px] font-semibold text-slate-900">
                          Jarak ke Kampus UPN <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="kost-jarak"
                          type="text"
                          value={jarakKampus}
                          onChange={(e) => setJarakKampus(e.target.value)}
                          placeholder="450 meter (Kampus 1 UPN Babarsari)"
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002147]/15"
                        />
                      </div>
                      <div>
                        <label htmlFor="kost-tempuh" className="text-[12px] font-semibold text-slate-900">
                          Waktu Tempuh
                        </label>
                        <input
                          id="kost-tempuh"
                          type="text"
                          value={waktuTempuh}
                          onChange={(e) => setWaktuTempuh(e.target.value)}
                          placeholder="5 menit jalan kaki santai"
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002147]/15"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-900">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-red-200 bg-red-50 text-[10px] text-red-600" aria-hidden="true">◎</span>
                          Titik Lokasi Kost di Peta (Pin Point)
                        </p>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">● GPS Aktif</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-4 text-slate-500">
                        Tandai titik koordinat kost pada peta interaktif agar mahasiswa dan calon penyewa mudah menemukan lokasinya secara akurat.
                      </p>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-slate-200 bg-[#F1F3F5] px-2.5 py-2">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-slate-400">
                            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
                            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                          </svg>
                          <input
                            type="text"
                            aria-label="Cari alamat di peta"
                            defaultValue="Jl. Delima No. 14, Condongcatur"
                            placeholder="Cari alamat…"
                            className="w-full bg-transparent text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                            Lokasi Saat Ini
                          </span>
                          <span className="inline-flex overflow-hidden rounded-lg border border-slate-200" aria-hidden="true">
                            <span className="bg-white px-2 py-1 text-[12px] text-slate-600">+</span>
                            <span className="border-l border-slate-200 bg-white px-2 py-1 text-[12px] text-slate-600">−</span>
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleMapPin}
                        aria-label={`Tandai lokasi kost di peta. Koordinat saat ini ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}
                        className="relative mt-2 block w-full overflow-hidden rounded-lg border border-slate-200 bg-[#E9EFE7] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
                      >
                        <span className="relative block h-40" aria-hidden="true">
                          <span className="absolute left-0 right-0 top-1/2 border-t-2 border-dashed border-amber-300" />
                          <span className="absolute bottom-3 left-3 rounded bg-white/90 px-2 py-1 text-[10px] font-medium text-slate-600">Kampus 1 UPN Babarsari</span>
                          <span
                            className="absolute -translate-x-1/2 -translate-y-1/2"
                            style={{ left: `${pinPos.x}%`, top: `${pinPos.y}%` }}
                          >
                            <span className="block whitespace-nowrap rounded-full bg-[#0A2342] px-2.5 py-1 text-[10px] font-bold text-white shadow">
                              {formData.title.trim() || "Griya Mahasiswa Tambakbayan"}
                            </span>
                            <span className="mx-auto mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] text-white">◎</span>
                          </span>
                          <span className="absolute right-3 top-3 rounded bg-white/90 px-1.5 py-0.5 text-[9px] text-slate-500">Fakultas Ekonomi UPN</span>
                        </span>
                        <span className="block bg-white/95 px-3 py-1.5 text-center text-[10px] text-slate-500">⊕ Klik peta untuk menandai posisi presisi</span>
                      </button>
                      <div className="mt-2 flex flex-col gap-2 text-[10px] leading-4 text-slate-500 sm:flex-row">
                        <span className="rounded-lg bg-slate-50 px-2 py-1" aria-live="polite">Koordinat: <strong className="text-slate-700">{latitude.toFixed(6)}, {longitude.toFixed(6)}</strong></span>
                        <span className="rounded-lg bg-slate-50 px-2 py-1">Terdeteksi 450m dari Kampus 1 UPN Babarsari (Akurasi Presisi GPS)</span>
                      </div>
                    </div>
                  </section>

                  {/* Harga Sewa & Utilitas */}
                  <section aria-labelledby="kost-harga-heading" className="rounded-xl border border-gray-200 bg-white p-5">
                    <h3 id="kost-harga-heading" className="text-[14px] font-bold text-slate-900">Harga Sewa &amp; Utilitas</h3>
                    <p className="mt-0.5 text-[12px] text-slate-500">Nominal biaya sewa dan ketentuan pemakaian listrik/air</p>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="kost-price" className="text-[12px] font-semibold text-slate-900">
                          Nominal Biaya <span className="text-red-500">*</span>
                        </label>
                        <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 focus-within:border-[#002147] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#002147]/15">
                          <span className="text-[13px] font-semibold text-slate-500">Rp</span>
                          <input
                            id="kost-price"
                            type="number"
                            required
                            min={0}
                            step="any"
                            value={formData.price}
                            onChange={(e) => updateForm("price", e.target.value)}
                            placeholder="850.000"
                            className="w-full bg-transparent text-[13px] font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="kost-periode" className="text-[12px] font-semibold text-slate-900">
                          Periode Pembayaran <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="kost-periode"
                          value={periodeBayar}
                          onChange={(e) => setPeriodeBayar(e.target.value)}
                          className="mt-1.5 w-full appearance-none rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 text-[13px] text-slate-700 focus:border-[#002147] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002147]/15"
                        >
                          <option>Per Bulan</option>
                          <option>Per 6 Bulan</option>
                          <option>Per Tahun</option>
                        </select>
                      </div>
                    </div>
                    <fieldset className="mt-4">
                      <legend className="text-[12px] font-semibold text-slate-900">Status Biaya Air</legend>
                      <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Status biaya air">
                        {(
                          [
                            { value: "include", label: "Include / Gratis (Sudah termasuk harga sewa)" },
                            { value: "exclude", label: "Exclude / Bayar Sendiri (Ada biaya tambahan bulanan)" },
                          ] as const
                        ).map((opt) => (
                          <label
                            key={opt.value}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-[12px] ${statusAir === opt.value ? "border-slate-300 bg-slate-50 font-semibold text-slate-900" : "border-slate-200 bg-[#F1F3F5] text-slate-500"}`}
                          >
                            <input type="radio" name="kost-air" checked={statusAir === opt.value} onChange={() => setStatusAir(opt.value)} className="h-3.5 w-3.5 shrink-0 accent-emerald-700" />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <fieldset className="mt-4">
                      <legend className="text-[12px] font-semibold text-slate-900">Status Biaya Listrik</legend>
                      <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Status biaya listrik">
                        {(
                          [
                            { value: "include", label: "Include / Gratis (Sudah termasuk harga sewa)" },
                            { value: "token", label: "Token Mandiri (Penghuni beli token sendiri per kamar)" },
                            { value: "tagihan", label: "Tagihan Bulanan (Meteran biasa, ditagih di akhir bulan)" },
                          ] as const
                        ).map((opt) => (
                          <label
                            key={opt.value}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-[12px] ${statusListrik === opt.value ? "border-slate-300 bg-slate-50 font-semibold text-slate-900" : "border-slate-200 bg-[#F1F3F5] text-slate-500"}`}
                          >
                            <input type="radio" name="kost-listrik" checked={statusListrik === opt.value} onChange={() => setStatusListrik(opt.value)} className="h-3.5 w-3.5 shrink-0 accent-emerald-700" />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </section>

                  {/* Spesifikasi & Fasilitas */}
                  <section aria-labelledby="kost-fasilitas-heading" className="rounded-xl border border-gray-200 bg-white p-5">
                    <h3 id="kost-fasilitas-heading" className="text-[14px] font-bold text-slate-900">Spesifikasi &amp; Fasilitas</h3>
                    <p className="mt-0.5 text-[12px] text-slate-500">Ukuran ruang dan fasilitas siap pakai bagi penghuni</p>
                    <div className="mt-4">
                      <label htmlFor="kost-dimensi" className="text-[12px] font-semibold text-slate-900">Ukuran Dimensi Kamar</label>
                      <input
                        id="kost-dimensi"
                        type="text"
                        value={dimensiKamar}
                        onChange={(e) => setDimensiKamar(e.target.value)}
                        placeholder="3 × 4 Meter (Ukuran Standar Lega)"
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002147]/15"
                      />
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-semibold text-slate-900">Fasilitas Kamar &amp; Bersama <span className="font-normal text-slate-400">(Kustom &amp; Fleksibel)</span></p>
                        <span className="text-[10px] font-semibold text-slate-400">{formFacilities.length} Fasilitas Aktif</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5 rounded-lg bg-slate-50 p-2" aria-live="polite">
                        {formFacilities.length === 0 && (
                          <span className="px-1 py-1 text-[11px] text-slate-400">Belum ada fasilitas. Tambahkan lewat kolom di bawah.</span>
                        )}
                        {formFacilities.map((facility) => (
                          <span key={facility} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700">
                            <span className="text-emerald-600" aria-hidden="true">✓</span>
                            {facility}
                            <button
                              type="button"
                              onClick={() => toggleFormFacility(facility)}
                              aria-label={`Hapus fasilitas ${facility}`}
                              className="rounded px-0.5 text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={fasilitasInput}
                          onChange={(e) => setFasilitasInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustomFacility();
                            }
                          }}
                          placeholder="+ Tambah Fasilitas (tekan Enter)"
                          aria-label="Tambah fasilitas kustom"
                          className="flex-1 rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002147]/15"
                        />
                        <button
                          type="button"
                          onClick={addCustomFacility}
                          className="shrink-0 rounded-lg bg-[#0A2342] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#12325e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
                        >
                          + Tambah
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Saran fasilitas cepat">
                        {FACILITY_OPTIONS.filter((f) => !formFacilities.includes(f)).map((facility) => (
                          <button
                            key={facility}
                            type="button"
                            onClick={() => toggleFormFacility(facility)}
                            className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[11px] text-slate-500 hover:border-slate-400 hover:bg-slate-50"
                          >
                            + {facility}
                          </button>
                        ))}
                      </div>
                      <p className="mt-1.5 text-[10px] leading-4 text-slate-400">Contoh cepat: Dapur Bersama, Kulkas, Water Heater, Meja Belajar, Parkir Motor.</p>
                    </div>
                    <div className="mt-4">
                      <label htmlFor="kost-description" className="text-[12px] font-semibold text-slate-900">Catatan &amp; Tata Tertib</label>
                      <textarea
                        id="kost-description"
                        rows={4}
                        value={formData.description}
                        onChange={(e) => updateForm("description", e.target.value)}
                        placeholder={catatanTambahan}
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 text-[12px] leading-5 text-slate-900 placeholder:text-slate-500 focus:border-[#002147] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002147]/15"
                      />
                    </div>
                  </section>

                  {/* Foto & Kontak */}
                  <section aria-labelledby="kost-foto-heading" className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 id="kost-foto-heading" className="text-[14px] font-bold text-slate-900">Foto &amp; Kontak Survei</h3>
                        <p className="mt-0.5 text-[12px] text-slate-500">Foto asli kamar dan nomor WhatsApp untuk janji temu survei</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Maks. 5MB</span>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-2" role="group" aria-label="Foto kost">
                      {kostPhotos.map((photo, i) => (
                        <span key={photo.id} className="relative block h-16">
                          {/* eslint-disable-next-line @next/next/no-img-element -- local object URLs for instant upload preview only */}
                          <img src={photo.url} alt={`Foto kost ${i + 1}`} className="h-16 w-full rounded-lg border border-slate-200 object-cover" />
                          <button
                            type="button"
                            onClick={() => removeKostPhoto(photo.id)}
                            aria-label={`Hapus foto kost ${i + 1}`}
                            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold leading-none text-white hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {kostPhotos.length === 0 && (
                        <>
                          <span className="flex h-16 items-end rounded-lg bg-[#3B4A5A] p-1.5 text-[9px] font-bold text-white">Utama</span>
                          <span className="flex h-16 items-end rounded-lg bg-[#5A6B7D] p-1.5 text-[9px] font-bold text-white">01</span>
                          <span className="flex h-16 items-end rounded-lg bg-[#7A8A9C] p-1.5 text-[9px] font-bold text-white">Parkir</span>
                        </>
                      )}
                      <label className="flex h-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-slate-300 bg-[#F1F3F5] text-slate-500 hover:border-slate-400 hover:bg-slate-100 focus-within:outline-none focus-within:ring-2 focus-within:ring-[#002147] focus-within:ring-offset-2">
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.5 2" />
                          <path d="M8 5.5V10.5M5.5 8H10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                        <span className="text-[10px] font-medium">+ Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          aria-label="Tambah foto kost"
                          className="sr-only"
                          onChange={(e) => {
                            addKostPhotos(e.target.files);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="kost-pemilik" className="text-[12px] font-semibold text-slate-900">
                          Nama Pemilik / Pengelola <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="kost-pemilik"
                          type="text"
                          value={namaPemilik}
                          onChange={(e) => setNamaPemilik(e.target.value)}
                          placeholder="Ibu Sri Wahyuni (Pemilik)"
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002147]/15"
                        />
                      </div>
                      <div>
                        <label htmlFor="kost-wa" className="text-[12px] font-semibold text-slate-900">
                          Nomor WhatsApp Aktif <span className="text-red-500">*</span>
                        </label>
                        <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 focus-within:border-[#002147] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#002147]/15">
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-emerald-600">
                            <path d="M8 1.5C4.4 1.5 1.5 4.4 1.5 8C1.5 9.4 1.9 10.7 2.6 11.8L1.5 14.5L4.3 13.4C5.4 14.1 6.6 14.5 8 14.5C11.6 14.5 14.5 11.6 14.5 8C14.5 4.4 11.6 1.5 8 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                          </svg>
                          <input
                            id="kost-wa"
                            type="tel"
                            value={nomorWa}
                            onChange={(e) => setNomorWa(e.target.value)}
                            placeholder="081234567890"
                            className="w-full bg-transparent text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  {submitError && (
                    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                      {submitError}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 pb-1">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={isSubmitting}
                      className="rounded-lg bg-slate-200/70 px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                    >
                      Simpan Draft
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-lg bg-[#0A2342] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#12325e] disabled:opacity-60"
                    >
                      {isSubmitting ? "Menyimpan…" : "Terbitkan Iklan"}
                    </button>
                  </div>
                </div>

                {/* Live preview */}
                <aside aria-label="Pratinjau kartu kost" className="rounded-xl border border-gray-200 bg-white p-3 lg:sticky lg:top-0">
                  <div className="flex items-center justify-between">
                    <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <span className="text-emerald-600" aria-hidden="true">◎</span> Pratinjau Kartu
                    </p>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Live Mode</span>
                  </div>
                  <div className="mt-2 overflow-hidden rounded-lg border border-slate-100">
                    <div className="relative flex aspect-[4/3] items-center justify-center bg-[#3B4A5A]">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-white/60">
                        <rect x="3" y="7" width="18" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                        <path d="M3 11H21" stroke="currentColor" strokeWidth="1.3" />
                      </svg>
                      <span className="absolute left-2 top-2 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                        Khusus {GENDER_LABELS[formData.gender_type] ?? "Putri"}
                      </span>
                      <span className="absolute right-2 top-2 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">Kost Baru</span>
                      <span className="absolute bottom-2 left-2 rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">450 meter (Kampus 1 UPN Babarsari)</span>
                    </div>
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[12px] font-bold leading-4 text-slate-900">Fasilitas Kamar &amp; Bersama</p>
                        <p className="shrink-0 text-right text-[10px] leading-3 text-slate-500">Kustom &amp;<br />Fleksibel<br /><span className="font-bold text-slate-700">{formFacilities.length} Fasilitas Aktif</span></p>
                      </div>
                      <div className="mt-2 space-y-1.5">
                        {(formFacilities.length > 0 ? formFacilities.slice(0, 4) : ["Kamar Mandi Dalam", "WiFi 50 Mbps", "AC", "Kasur Springbed"]).map((f) => (
                          <span key={f} className="flex items-center gap-1.5 rounded-md border border-slate-100 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600">
                            <span className="text-emerald-600" aria-hidden="true">✓</span> {f}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-[13px] font-bold text-slate-900">
                        {formData.price ? `${formatRupiah(Number(formData.price) || 0)} / bln` : "Rp 850.000 / bln"}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-slate-700">
                        {formData.title || "Griya Mahasiswa Tambakbayan"}
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function KostPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Memuat kost…</p>}>
      <KostContent />
    </Suspense>
  );
}
