"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, type ApiError } from "@/lib/api";

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

type MarketplaceCreateResponse = {
  message: string;
  data: ApiMarketplaceItem;
};

const CONDITION_OPTIONS = [
  { value: "new", label: "Baru" },
  { value: "like-new", label: "Bekas Seperti Baru" },
  { value: "good", label: "Layak Pakai" },
  { value: "fair", label: "Perlu Perbaikan" },
] as const;

const TARGET_FAKULTAS_OPTIONS = [
  "Fakultas Kedokteran",
  "Fakultas Ekonomi & Bisnis",
  "Fakultas Teknik",
  "Fakultas Ilmu Komputer",
  "Fakultas Pertanian",
  "Fakultas Ilmu Sosial & Politik",
  "Fakultas Arsitektur & Desain",
  "Fakultas Hukum",
] as const;

// Static category suggestions (IDs resolve from the backend-seeded
// categories by name so POST /v1/marketplace stays valid).
const CATEGORY_SUGGESTIONS = [
  "Buku & Catatan",
  "Elektronik & Gadget",
  "Perlengkapan Kuliah",
  "Pakaian & Aksesori",
  "Hobi & Olahraga",
  "Peralatan Kamar/Kost",
  "Lainnya",
] as const;

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9&]/g, "");
}

const EMPTY_FORM = {
  title: "",
  category_id: "",
  condition: "good",
  price: "",
  description: "",
};

const CONDITION_LABELS: Record<string, string> = {
  new: "Baru",
  "like-new": "Bekas Seperti Baru",
  good: "Layak Pakai",
  fair: "Perlu Perbaikan",
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

function MarketplaceContent() {
  const [items, setItems] = useState<ApiMarketplaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("Semua");
  const [priceFilter, setPriceFilter] = useState("any");
  const [conditionFilter, setConditionFilter] = useState("any");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [targetFakultas, setTargetFakultas] = useState<string[]>([...TARGET_FAKULTAS_OPTIONS]);
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [codLocation, setCodLocation] = useState("Perpustakaan Pusat UPN Lantai 1 / Gazebo FTI");
  const [photos, setPhotos] = useState<{ id: number; url: string }[]>([]);
  const photoIdRef = useRef(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const createRequested = searchParams.get("action") === "create";

  const loadItems = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);
      // Resolves to http://localhost:8000/api/v1/marketplace by default
      // (or NEXT_PUBLIC_API_URL when configured).
      const res = await apiFetch<MarketplaceListResponse>("/v1/marketplace");
      if (signal?.aborted) return;
      setItems(res.data.data);
    } catch {
      if (signal?.aborted) return;
      setItems([]);
      setError("Gagal memuat data. Periksa koneksi ke backend lalu coba lagi.");
    } finally {
      if (signal?.aborted) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch must populate state on mount
    void loadItems(controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadItems]);

  const clearCreateParam = useCallback(() => {
    if (searchParams.get("action") === "create") {
      router.replace("/marketplace");
    }
  }, [router, searchParams]);

  const closeModal = useCallback(() => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setSubmitError(null);
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
    clearCreateParam();
  }, [isSubmitting, clearCreateParam]);

  // Close modal on Escape for keyboard users.
  useEffect(() => {
    if (!isModalOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, closeModal]);

  const categories = useMemo(() => {
    const names = new Set<string>();
    for (const item of items) {
      if (item.category?.name) names.add(item.category.name);
    }
    return ["Semua", ...names];
  }, [items]);

  const categoryOptions = useMemo(() => {
    const byId = new Map<number, string>();
    for (const item of items) {
      if (item.category?.id && item.category?.name) {
        byId.set(item.category.id, item.category.name);
      }
    }
    const merged = [...byId.entries()].map(([id, name]) => ({ id, name }));
    const known = new Set(merged.map((c) => normalizeName(c.name)));
    // Static suggestions resolve against seeded backend categories by
    // name; entries without a backend match are skipped so the select
    // only ever submits a valid category_id.
    CATEGORY_SUGGESTIONS.forEach((name, i) => {
      if (!known.has(normalizeName(name))) {
        merged.push({ id: -(i + 1), name });
      }
    });
    return merged;
  }, [items]);

  function updateForm<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function toggleFakultas(name: string) {
    setTargetFakultas((prev) =>
      prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name]
    );
  }

  function toggleAllFakultas() {
    setTargetFakultas((prev) =>
      prev.length === TARGET_FAKULTAS_OPTIONS.length ? [] : [...TARGET_FAKULTAS_OPTIONS]
    );
  }

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const next = Array.from(files).map((file) => {
      photoIdRef.current += 1;
      return { id: photoIdRef.current, url: URL.createObjectURL(file) };
    });
    setPhotos((prev) => [...prev, ...next].slice(0, 6));
  }

  function removePhoto(id: number) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  }

  const allFakultasSelected = targetFakultas.length === TARGET_FAKULTAS_OPTIONS.length;
  const fakultasSummary = allFakultasSelected
    ? "Semua Fakultas"
    : targetFakultas.length === 0
      ? "Belum ada target"
      : targetFakultas.length <= 2
        ? targetFakultas.join(", ")
        : `${targetFakultas.slice(0, 2).join(", ")} +${targetFakultas.length - 2}`;

  // Open the modal when navigated via sidebar CTA (?action=create).
  useEffect(() => {
    if (createRequested) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- URL-driven modal must sync state when the search param appears
      setSubmitError(null);
      setIsModalOpen(true);
    }
  }, [createRequested]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const categoryId = Number(formData.category_id);
    // Static suggestion entries carry a temporary negative id until the
    // backend has listings referencing that category — never POST those.
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      setSubmitError("Kategori tersebut belum tersedia di backend. Pilih kategori lain yang aktif.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await apiFetch<MarketplaceCreateResponse>("/v1/marketplace", {
        method: "POST",
        body: JSON.stringify({
          title: formData.title.trim(),
          category_id: categoryId,
          condition: formData.condition,
          price: Number(formData.price),
          description: formData.description.trim(),
        }),
      });
      setIsModalOpen(false);
      setFormData(EMPTY_FORM);
      setTargetFakultas([...TARGET_FAKULTAS_OPTIONS]);
      setPhotos((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.url));
        return [];
      });
      clearCreateParam();
      await loadItems();
    } catch (err) {
      const apiError = err as ApiError;
      const fieldErrors = apiError.errors
        ? Object.values(apiError.errors).flat().join(" ")
        : null;
      setSubmitError(fieldErrors || apiError.message || "Gagal memasang iklan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

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
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-slate-900">Marketplace</h1>
            <p className="mt-1 text-sm text-slate-500">Beli dan jual barang di lingkungan komunitas UPN.</p>
          </div>

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
              onClick={() => void loadItems()}
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
                  <Link href={`/marketplace/${item.id}`} aria-label={`Lihat detail ${item.title}`}>
                    <ItemImagePlaceholder category={categoryName} />
                  </Link>
                  <div className="flex flex-1 flex-col px-4 py-3">
                    <h3 className="line-clamp-2 text-[13px] font-semibold leading-5 text-slate-900">
                      <Link href={`/marketplace/${item.id}`} className="hover:underline focus:outline-none">
                        {item.title}
                      </Link>
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

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pasang-iklan-title"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-[920px] overflow-y-auto rounded-2xl border border-gray-200 bg-[#F4F5F7]"
          >
            <div className="px-5 pt-5 sm:px-7 sm:pt-6">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] text-slate-400">
                  Beranda <span className="mx-1">/</span> Marketplace <span className="mx-1">/</span>{" "}
                  <span className="font-semibold text-slate-700">Pasang Iklan Marketplace</span>
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
              <h2 id="pasang-iklan-title" className="mt-1.5 text-[22px] font-bold tracking-tight text-slate-900">
                Pasang Iklan Marketplace
              </h2>
              <p className="mt-0.5 text-[13px] text-slate-500">
                Isi detail barang jual beli yang ingin kamu tawarkan kepada sesama mahasiswa UPN.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-5 pb-6 pt-4 sm:px-7">
              <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_250px]">
                {/* Main form card */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
                  <div>
                    <label htmlFor="iklan-title" className="text-[12px] font-semibold text-slate-900">
                      Judul Iklan
                    </label>
                    <input
                      id="iklan-title"
                      type="text"
                      required
                      maxLength={255}
                      value={formData.title}
                      onChange={(e) => updateForm("title", e.target.value)}
                      placeholder="Buku Kalkulus Stewart Edisi ke-9 (Lengkap Catatan Kuliah)"
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002147]/15"
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="iklan-category" className="text-[12px] font-semibold text-slate-900">
                        Kategori
                      </label>
                      <select
                        id="iklan-category"
                        required
                        value={formData.category_id}
                        onChange={(e) => updateForm("category_id", e.target.value)}
                        disabled={categoryOptions.length === 0}
                        className="mt-1.5 w-full appearance-none rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 text-[13px] text-slate-700 focus:border-[#002147] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002147]/15 disabled:opacity-60"
                      >
                        <option value="">Pilih kategori</option>
                        {categoryOptions.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      {categoryOptions.length === 0 && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          Kategori belum tersedia. Tunggu data marketplace dimuat.
                        </p>
                      )}
                    </div>
                    <fieldset>
                      <legend className="text-[12px] font-semibold text-slate-900">
                        Target Fakultas
                      </legend>
                      <div className="mt-1.5 grid grid-cols-1 gap-1.5 rounded-lg border border-slate-200 bg-[#F1F3F5] p-2.5 sm:grid-cols-2" role="group" aria-label="Target fakultas">
                        <label className="flex cursor-pointer items-center gap-2 rounded-md bg-white px-2.5 py-2 text-[12px] font-semibold text-slate-900 ring-1 ring-inset ring-slate-200">
                          <input
                            type="checkbox"
                            checked={allFakultasSelected}
                            onChange={toggleAllFakultas}
                            className="h-3.5 w-3.5 shrink-0 accent-[#0A2342]"
                          />
                          Semua Fakultas
                        </label>
                        {TARGET_FAKULTAS_OPTIONS.map((f) => (
                          <label
                            key={f}
                            className="flex cursor-pointer items-center gap-2 rounded-md bg-white px-2.5 py-2 text-[12px] text-slate-600 ring-1 ring-inset ring-slate-200 hover:ring-slate-300"
                          >
                            <input
                              type="checkbox"
                              checked={targetFakultas.includes(f)}
                              onChange={() => toggleFakultas(f)}
                              className="h-3.5 w-3.5 shrink-0 accent-[#0A2342]"
                            />
                            {f}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </div>

                  <div className="mt-4">
                    <label htmlFor="iklan-price" className="text-[12px] font-semibold text-slate-900">
                      Harga (Rp)
                    </label>
                    <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 focus-within:border-[#002147] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#002147]/15">
                        <span className="text-[13px] font-semibold text-slate-500">Rp</span>
                        <input
                          id="iklan-price"
                          type="number"
                          required
                          min={0}
                          step="any"
                          value={formData.price}
                          onChange={(e) => updateForm("price", e.target.value)}
                          placeholder="85.000"
                          className="w-full bg-transparent text-[13px] font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsNegotiable((v) => !v)}
                        aria-pressed={isNegotiable}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${
                          isNegotiable
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : "border-slate-200 bg-[#F1F3F5] text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <rect x="2" y="2" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
                          {isNegotiable && <path d="M5.5 8L7.3 9.8L10.8 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />}
                        </svg>
                        Bisa Nego Santai
                      </button>
                    </div>
                  </div>

                  <fieldset className="mt-4">
                    <legend className="text-[12px] font-semibold text-slate-900">Kondisi</legend>
                    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2.5" role="radiogroup" aria-label="Kondisi barang">
                      {CONDITION_OPTIONS.map((opt) => {
                        const checked = formData.condition === opt.value;
                        return (
                          <label key={opt.value} className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-600">
                            <input
                              type="radio"
                              name="iklan-condition"
                              value={opt.value}
                              checked={checked}
                              onChange={(e) => updateForm("condition", e.target.value)}
                              required
                              className="h-3.5 w-3.5 accent-[#0A2342]"
                            />
                            <span className={checked ? "font-semibold text-slate-900" : ""}>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className="mt-4">
                    <label htmlFor="iklan-description" className="text-[12px] font-semibold text-slate-900">
                      Deskripsi Barang
                    </label>
                    <textarea
                      id="iklan-description"
                      required
                      rows={5}
                      value={formData.description}
                      onChange={(e) => updateForm("description", e.target.value)}
                      placeholder="Kondisi kertas masih sangat mulus dan bersih, tidak ada coretan pulpen ataupun highlighter yang mengganggu. Dulu dibeli untuk mata kuliah Matematika Teknik Semester 1 di Teknik Informatika. Bonus lembar catatan UTS."
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 text-[13px] leading-5 text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002147]/15"
                    />
                  </div>

                  <div className="mt-4">
                    <span id="iklan-photos-label" className="text-[12px] font-semibold text-slate-900">
                      Foto Barang
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-2" role="group" aria-labelledby="iklan-photos-label">
                      {photos.map((photo, i) => (
                        <span key={photo.id} className="relative h-16 w-16">
                          {/* eslint-disable-next-line @next/next/no-img-element -- local object URLs for instant upload preview only */}
                          <img
                            src={photo.url}
                            alt={`Foto barang ${i + 1}`}
                            className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(photo.id)}
                            aria-label={`Hapus foto barang ${i + 1}`}
                            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold leading-none text-white hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {photos.length === 0 && (
                        <>
                          <span className="flex h-16 w-16 items-center justify-center rounded-lg border border-slate-200 bg-[#E9EDF2] text-[10px] font-medium text-slate-500">
                            Foto 1
                          </span>
                          <span className="flex h-16 w-16 items-center justify-center rounded-lg border border-slate-200 bg-[#E9EDF2] text-[10px] font-medium text-slate-500">
                            Foto 2
                          </span>
                          <span className="flex h-16 w-16 items-center justify-center rounded-lg border border-slate-200 bg-[#E9EDF2] text-[10px] font-medium text-slate-500">
                            Foto 3
                          </span>
                        </>
                      )}
                      <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-slate-300 bg-[#F1F3F5] text-slate-500 hover:border-slate-400 hover:bg-slate-100 focus-within:outline-none focus-within:ring-2 focus-within:ring-[#002147] focus-within:ring-offset-2">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.5 2" />
                          <path d="M8 5.5V10.5M5.5 8H10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                        <span className="text-[10px] font-medium">Tambah</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          aria-label="Tambah foto barang"
                          className="sr-only"
                          onChange={(e) => {
                            addPhotos(e.target.files);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label htmlFor="iklan-cod" className="text-[12px] font-semibold text-slate-900">
                      Lokasi COD di Kampus
                    </label>
                    <input
                      id="iklan-cod"
                      type="text"
                      value={codLocation}
                      onChange={(e) => setCodLocation(e.target.value)}
                      placeholder="Perpustakaan Pusat UPN Lantai 1 / Gazebo FTI"
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002147]/15"
                    />
                  </div>

                  {submitError && (
                    <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                      {submitError}
                    </p>
                  )}

                  <div className="mt-5 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={isSubmitting}
                      className="rounded-lg bg-slate-100 px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
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

                {/* Live preview card */}
                <aside aria-label="Pratinjau kartu iklan" className="rounded-xl border border-gray-200 bg-white p-3 lg:sticky lg:top-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pratinjau Kartu</p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                      Live Preview
                    </span>
                  </div>
                  <div className="mt-2 overflow-hidden rounded-lg border border-slate-100">
                    <div className="relative flex aspect-[4/3] items-center justify-center bg-[#E9EDF2]">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-slate-400">
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.3" />
                        <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.3" />
                        <path d="M3 16L8.5 11L13 15.5L16 13L21 18" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
                      </svg>
                      <span className="absolute left-2 top-2 rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        FTI / Buku
                      </span>
                      {isNegotiable && (
                        <span className="absolute bottom-2 right-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                          Bisa Nego
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[15px] font-bold text-slate-900">
                          {formData.price ? formatRupiah(Number(formData.price) || 0) : "Rp 85.000"}
                        </p>
                        <span className="shrink-0 text-[10px] font-semibold text-amber-700">
                          {CONDITION_LABELS[formData.condition] ?? "Seperti Baru"}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-5 text-slate-900">
                        {formData.title || "Buku Kalkulus Stewart Edisi ke-9 (Lengkap Catatan Kuliah)"}
                      </p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[8px] font-bold text-white">
                          AR
                        </span>
                        Alex Rivera <span className="text-slate-300">|</span> Informatika &apos;22
                      </p>
                      <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5 text-[10px] font-medium leading-4 text-slate-500">
                        Target: {fakultasSummary}
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

export default function MarketplacePage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Memuat marketplace…</p>}>
      <MarketplaceContent />
    </Suspense>
  );
}
