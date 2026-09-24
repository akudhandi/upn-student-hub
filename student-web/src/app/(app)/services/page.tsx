"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, type ApiError } from "@/lib/api";

// ---------------------------------------------------------------------------
// API types — shape of GET /api/v1/services (Laravel paginator wrapped in
// a standard { message, data } JSON envelope).
// ---------------------------------------------------------------------------
type ApiServiceItem = {
  id: number;
  title: string;
  description: string | null;
  price_min: number | string;
  price_max: number | string | null;
  status: string;
  created_at: string;
  user?: { id: number; name: string } | null;
  category?: { id: number; name: string; slug: string } | null;
};

type ServiceListResponse = {
  message: string;
  data: {
    current_page: number;
    last_page: number;
    total: number;
    data: ApiServiceItem[];
  };
};

type ServiceCreateResponse = {
  message: string;
  data: ApiServiceItem;
};

const EMPTY_FORM = {
  title: "",
  category_id: "",
  price_min: "",
  price_max: "",
  description: "",
};

function formatRupiah(value: number | string): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatPriceRange(min: number | string, max: number | string | null): string {
  if (max === null || max === undefined || max === "" || Number(max) <= 0) {
    return formatRupiah(min);
  }
  if (Number(max) === Number(min)) {
    return formatRupiah(min);
  }
  return `${formatRupiah(min)} – ${formatRupiah(max)}`;
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
  const name = category.toLowerCase();
  // Small inline glyphs reused by pills and card icon squares. Pure SVG, no deps.
  if (name.includes("desain") || name.includes("media") || name.includes("foto")) {
    return (
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3.5 11.5L8 3.5L12.5 11.5H3.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M6.5 11.5H9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M8 3.5V2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (name.includes("servis") || name.includes("service") || name.includes("teknik") || name.includes("laptop")) {
    return (
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M10.5 2.5L13.5 5.5L6 13L2.5 13.5L3 10L10.5 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name.includes("laundry") || name.includes("print") || name.includes("cetak") || name.includes("jilid")) {
    return (
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5 7H11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M5.5 10H10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "semua") {
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

function ServiceCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-5 w-20 animate-pulse rounded-md bg-slate-100" />
      </div>
      <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-slate-100" />
      <div className="mt-2 h-3 w-full animate-pulse rounded bg-slate-100" />
      <div className="mt-1 h-3 w-2/3 animate-pulse rounded bg-slate-100" />
      <div className="mt-4 flex items-end justify-between border-t border-gray-100 pt-4">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

function ServicesContent() {
  const [items, setItems] = useState<ApiServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("Semua");
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const createRequested = searchParams.get("action") === "create";

  const loadServices = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);
      // Resolves to http://localhost:8000/api/v1/services by default
      // (or NEXT_PUBLIC_API_URL when configured).
      const res = await apiFetch<ServiceListResponse>("/v1/services");
      if (signal?.aborted) return;
      setItems(res.data.data);
    } catch {
      if (signal?.aborted) return;
      setItems([]);
      setError("Gagal memuat data jasa. Periksa koneksi ke backend lalu coba lagi.");
    } finally {
      if (signal?.aborted) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch must populate state on mount
    void loadServices(controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadServices]);

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
    return [...byId.entries()].map(([id, name]) => ({ id, name }));
  }, [items]);

  function updateForm<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  const clearCreateParam = useCallback(() => {
    if (searchParams.get("action") === "create") {
      router.replace("/services");
    }
  }, [router, searchParams]);

  const closeModal = useCallback(() => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setSubmitError(null);
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
    const priceMin = Number(formData.price_min);
    const priceMaxRaw = formData.price_max.trim();
    const priceMax = priceMaxRaw === "" ? null : Number(priceMaxRaw);
    if (priceMax !== null && priceMax < priceMin) {
      setSubmitError("Harga maksimal tidak boleh lebih kecil dari harga minimal.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await apiFetch<ServiceCreateResponse>("/v1/services", {
        method: "POST",
        body: JSON.stringify({
          title: formData.title.trim(),
          category_id: Number(formData.category_id),
          price_min: priceMin,
          price_max: priceMax,
          description: formData.description.trim(),
        }),
      });
      setIsModalOpen(false);
      setFormData(EMPTY_FORM);
      clearCreateParam();
      await loadServices();
    } catch (err) {
      const apiError = err as ApiError;
      const fieldErrors = apiError.errors
        ? Object.values(apiError.errors).flat().join(" ")
        : null;
      setSubmitError(fieldErrors || apiError.message || "Gagal memasang iklan jasa. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const previewCategory =
    categoryOptions.find((c) => String(c.id) === formData.category_id)?.name ?? "Kategori Jasa";
  const previewHasRange =
    formData.price_max.trim() !== "" && Number(formData.price_max) > Number(formData.price_min);
  const previewPrice = formData.price_min
    ? formatPriceRange(formData.price_min, previewHasRange ? formData.price_max : null)
    : "Rp 50.000";

  const filtered = items.filter((item) => {
    const categoryName = item.category?.name ?? "";
    if (activeCategory !== "Semua" && categoryName !== activeCategory) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      (item.description ?? "").toLowerCase().includes(q) ||
      (item.user?.name ?? "").toLowerCase().includes(q)
    );
  });

  function clearFilters() {
    setActiveCategory("Semua");
    setQuery("");
  }

  return (
    <div className="mx-auto max-w-[1180px]">
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
        {categories.map((cat) => {
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
              {cat === "Semua" ? "Semua Jasa" : cat}
            </button>
          );
        })}
      </div>

      {/* Grid: 1 col mobile, 2 tablet, 3 desktop */}
      <div className="mt-6">
        {isLoading ? (
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            role="status"
            aria-busy="true"
            aria-label="Memuat jasa dan layanan"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <ServiceCardSkeleton key={i} />
            ))}
            <span className="sr-only">Memuat data jasa…</span>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center"
          >
            <p className="text-sm font-medium text-slate-900">Gagal memuat data jasa</p>
            <p className="mt-1 text-xs text-gray-500">{error}</p>
            <button
              type="button"
              onClick={() => void loadServices()}
              className="mt-4 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              Coba lagi
            </button>
          </div>
        ) : filtered.length === 0 ? (
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
            {filtered.map((item) => {
              const categoryName = item.category?.name ?? "Lainnya";
              const providerName = item.user?.name ?? "Mahasiswa UPN";
              const hasRange =
                item.price_max !== null &&
                item.price_max !== undefined &&
                item.price_max !== "" &&
                Number(item.price_max) > Number(item.price_min);
              return (
                <article
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-gray-200 border-t-4 border-t-gray-200 bg-white transition-colors hover:border-x-gray-300 hover:border-b-gray-300 hover:border-t-teal-500 focus-within:ring-2 focus-within:ring-teal-600 focus-within:ring-offset-2"
                >
                  <Link
                    href={`/services/${item.id}`}
                    aria-label={`Lihat detail ${item.title}`}
                    className="flex flex-1 flex-col p-5 focus:outline-none"
                  >
                    {/* Card header: icon (left) + category badge (right) */}
                    <div className="flex items-start justify-between gap-2">
                      <CategoryIcon category={categoryName} />
                      <span className="max-w-[55%] truncate rounded-md border border-teal-100 bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-700">
                        {categoryName}
                      </span>
                    </div>

                    <h2 className="mt-4 line-clamp-2 text-[14px] font-bold leading-5 text-slate-900 hover:underline">
                      {item.title}
                    </h2>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-gray-500">
                      {item.description ?? "Tidak ada deskripsi."}
                    </p>

                    {/* Card footer pushed to bottom */}
                    <div className="mt-auto pt-4">
                      <div className="flex items-end justify-between gap-2 border-t border-gray-100 pt-4">
                        <span className="flex min-w-0 items-center gap-2">
                          <ProviderAvatar name={providerName} />
                          <span className="flex min-w-0 flex-col">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Penyedia</span>
                            <span className="truncate text-xs font-medium text-slate-700">{providerName}</span>
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                            {hasRange ? "Kisaran" : "Harga"}
                          </span>
                          <span className="text-[14px] font-bold text-slate-900">
                            {formatPriceRange(item.price_min, item.price_max)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </Link>
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
            aria-labelledby="pasang-jasa-title"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-[920px] overflow-y-auto rounded-2xl border border-gray-200 bg-[#F4F5F7]"
          >
            <div className="px-5 pt-5 sm:px-7 sm:pt-6">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] text-slate-400">
                  Beranda <span className="mx-1">/</span> Jasa &amp; Layanan <span className="mx-1">/</span>{" "}
                  <span className="font-semibold text-slate-700">Pasang Iklan Jasa</span>
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
              <h2 id="pasang-jasa-title" className="mt-1.5 text-[22px] font-bold tracking-tight text-slate-900">
                Pasang Iklan Jasa
              </h2>
              <p className="mt-0.5 text-[13px] text-slate-500">
                Tawarkan keahlianmu kepada sesama mahasiswa UPN — les, desain, servis, dan lainnya.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-5 pb-6 pt-4 sm:px-7">
              <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_250px]">
                {/* Main form card */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
                  <div>
                    <label htmlFor="jasa-title" className="text-[12px] font-semibold text-slate-900">
                      Judul Layanan / Jasa
                    </label>
                    <input
                      id="jasa-title"
                      type="text"
                      required
                      maxLength={255}
                      value={formData.title}
                      onChange={(e) => updateForm("title", e.target.value)}
                      placeholder="Jasa Print & Jilid Antar Kampus"
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/15"
                    />
                  </div>

                  <div className="mt-4">
                    <label htmlFor="jasa-category" className="text-[12px] font-semibold text-slate-900">
                      Kategori Layanan
                    </label>
                    <select
                      id="jasa-category"
                      required
                      value={formData.category_id}
                      onChange={(e) => updateForm("category_id", e.target.value)}
                      disabled={categoryOptions.length === 0}
                      className="mt-1.5 w-full appearance-none rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 text-[13px] text-slate-700 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/15 disabled:opacity-60"
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
                        Kategori belum tersedia. Tunggu data jasa dimuat.
                      </p>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="jasa-price-min" className="text-[12px] font-semibold text-slate-900">
                        Harga Minimal (Rp)
                      </label>
                      <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 focus-within:border-teal-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-600/15">
                        <span className="text-[13px] font-semibold text-slate-500">Rp</span>
                        <input
                          id="jasa-price-min"
                          type="number"
                          required
                          min={0}
                          step="any"
                          value={formData.price_min}
                          onChange={(e) => updateForm("price_min", e.target.value)}
                          placeholder="50000"
                          className="w-full bg-transparent text-[13px] font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="jasa-price-max" className="text-[12px] font-semibold text-slate-900">
                        Harga Maksimal (Rp) <span className="font-normal text-slate-400">(opsional)</span>
                      </label>
                      <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 focus-within:border-teal-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-600/15">
                        <span className="text-[13px] font-semibold text-slate-500">Rp</span>
                        <input
                          id="jasa-price-max"
                          type="number"
                          min={0}
                          step="any"
                          value={formData.price_max}
                          onChange={(e) => updateForm("price_max", e.target.value)}
                          placeholder="150000"
                          className="w-full bg-transparent text-[13px] font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Kosongkan jika tarif tunggal (tidak ada kisaran).
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label htmlFor="jasa-description" className="text-[12px] font-semibold text-slate-900">
                      Deskripsi Layanan
                    </label>
                    <textarea
                      id="jasa-description"
                      required
                      rows={5}
                      value={formData.description}
                      onChange={(e) => updateForm("description", e.target.value)}
                      placeholder="Jelaskan layanan yang ditawarkan, estimasi pengerjaan, dan cara pemesanan…"
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 text-[13px] leading-5 text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/15"
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
                <aside aria-label="Pratinjau kartu jasa" className="rounded-xl border border-gray-200 bg-white p-3 lg:sticky lg:top-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pratinjau Kartu</p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                      Live Preview
                    </span>
                  </div>
                  <div className="mt-2 overflow-hidden rounded-lg border border-slate-100 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <CategoryIcon category={previewCategory} />
                      <span className="max-w-[55%] truncate rounded-md border border-teal-100 bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-700">
                        {previewCategory}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-[12px] font-bold leading-5 text-slate-900">
                      {formData.title || "Jasa Print & Jilid Antar Kampus"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">
                      {formData.description || "Deskripsi layanan akan tampil di sini."}
                    </p>
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {previewHasRange ? "Kisaran" : "Harga"}
                      </p>
                      <p className="text-[15px] font-bold text-slate-900">{previewPrice}</p>
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

export default function ServicesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Memuat jasa…</p>}>
      <ServicesContent />
    </Suspense>
  );
}
