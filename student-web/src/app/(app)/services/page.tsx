"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  apiFetch,
  fetchPublicCategories,
  uploadMedia,
  type ApiError,
  type PublicCategory,
} from "@/lib/api";
import ListingImage from "@/components/ListingImage";
import { getUser } from "@/lib/auth";
import type { ApiImage } from "@/lib/images";

// API types: shape of GET /api/v1/services (Laravel paginator wrapped in
// a standard { message, data } JSON envelope).
type ApiServiceItem = {
  id: number;
  title: string;
  description: string | null;
  price_min: number | string;
  price_max: number | string | null;
  pricing_type?: string | null;
  estimated_time?: string | null;
  payment_method?: string | null;
  whatsapp_number?: string | null;
  target_faculties?: string[] | null;
  status: string;
  created_at: string;
  user?: { id: number; name: string } | null;
  category?: { id: number; name: string; slug: string } | null;
  images?: ApiImage[] | null;
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
  estimated_time: "1-2 Hari Kerja",
  whatsapp_number: "",
  description: "",
};

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

const PRICING_MODELS = [
  { value: "starting_from", label: "Mulai Dari" },
  { value: "fixed", label: "Tarif Tetap" },
  { value: "per_hour", label: "Per Jam" },
  { value: "negotiable", label: "Negosiasi" },
] as const;

const PRICING_LABELS: Record<string, string> = {
  starting_from: "Mulai dari",
  fixed: "Tarif tetap",
  per_hour: "Per jam",
  negotiable: "Negosiasi",
};

const PAYMENT_METHODS = [
  { value: "dp", label: "DP (Uang Muka)" },
  { value: "full", label: "Bayar Lunas Selesai" },
  { value: "flexible", label: "Fleksibel" },
] as const;

const ESTIMASI_OPTIONS = [
  "< 1 Hari",
  "1-2 Hari Kerja",
  "3-5 Hari Kerja",
  "1 Minggu+",
  "Fleksibel / Sesuai Kesepakatan",
] as const;

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
  return `${formatRupiah(min)} - ${formatRupiah(max)}`;
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

function ProviderAvatar({ name }: { name: string }) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "UP";
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#141416] text-[13px] font-semibold text-white">
      {initials}
    </span>
  );
}

function ServiceCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white">
      <div className="aspect-[4/3] animate-pulse bg-[#EFECE8]" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="h-5 w-24 animate-pulse rounded-md bg-[#F4F1EE]" />
        <div className="h-5 w-4/5 animate-pulse rounded-lg bg-[#F4F1EE]" />
        <div className="h-6 w-2/5 animate-pulse rounded-lg bg-[#EFECE8]" />
        <div className="h-4 w-full animate-pulse rounded-lg bg-[#F4F1EE]" />
        <div className="mt-auto flex items-center justify-between border-t border-[#F1EDE8] pt-4">
          <div className="h-6 w-28 animate-pulse rounded-full bg-[#F4F1EE]" />
          <div className="h-4 w-16 animate-pulse rounded-lg bg-[#F4F1EE]" />
        </div>
      </div>
    </div>
  );
}

function ServicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createRequested = searchParams.get("action") === "create";
  const urlQuery = (searchParams.get("q") ?? "").trim();

  const [items, setItems] = useState<ApiServiceItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [query, setQuery] = useState(urlQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(urlQuery);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [pricingType, setPricingType] = useState<string>("starting_from");
  const [paymentMethod, setPaymentMethod] = useState<string>("flexible");
  const [targetFakultas, setTargetFakultas] = useState<string[]>([...TARGET_FAKULTAS_OPTIONS]);
  const [photos, setPhotos] = useState<{ id: number; url: string; file: File }[]>([]);
  const [backendCategories, setBackendCategories] = useState<PublicCategory[]>([]);
  const [currentUser] = useState(() => getUser());
  const photoIdRef = useRef(0);
  const debouncedQueryRef = useRef(urlQuery);
  const prevUrlQueryRef = useRef(urlQuery);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === debouncedQueryRef.current) return;
    const t = window.setTimeout(() => {
      debouncedQueryRef.current = trimmed;
      setDebouncedQuery(trimmed);
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (prevUrlQueryRef.current !== urlQuery) {
      prevUrlQueryRef.current = urlQuery;
      debouncedQueryRef.current = urlQuery;
      setQuery(urlQuery);
      setDebouncedQuery(urlQuery);
      setPage(1);
    }
  }, [urlQuery]);

  const loadServices = useCallback(
    async (
      pageNum: number,
      categoryId: number | null,
      searchQuery: string,
      signal?: AbortSignal
    ) => {
      try {
        setIsLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("page", String(pageNum));
        if (categoryId !== null) params.set("category_id", String(categoryId));
        if (searchQuery !== "") params.set("q", searchQuery);
        const res = await apiFetch<ServiceListResponse>(`/v1/services?${params.toString()}`);
        if (signal?.aborted) return;
        setItems(res.data.data);
        setPage(res.data.current_page);
        setLastPage(res.data.last_page);
        setTotal(res.data.total);
      } catch {
        if (signal?.aborted) return;
        setItems([]);
        setError("Gagal memuat daftar jasa. Periksa koneksi backend lalu coba lagi.");
      } finally {
        if (signal?.aborted) return;
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchPublicCategories("service")
      .then((cats) => {
        if (!controller.signal.aborted) setBackendCategories(cats);
      })
      .catch(() => {});
    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch must populate state when filters/page change
    void loadServices(page, activeCategoryId, debouncedQuery, controller.signal);
    return () => {
      controller.abort();
    };
  }, [page, activeCategoryId, debouncedQuery, loadServices]);

  const filterCategories = useMemo(() => {
    if (backendCategories.length > 0) {
      return backendCategories.map((c) => ({ id: c.id, name: c.name }));
    }
    const byId = new Map<number, string>();
    for (const item of items) {
      if (item.category?.id && item.category?.name) {
        byId.set(item.category.id, item.category.name);
      }
    }
    return [...byId.entries()].map(([id, name]) => ({ id, name }));
  }, [backendCategories, items]);

  const categoryOptions = useMemo(() => {
    const byId = new Map<number, string>();
    for (const cat of backendCategories) {
      byId.set(cat.id, cat.name);
    }
    for (const item of items) {
      if (item.category?.id && item.category?.name) {
        byId.set(item.category.id, item.category.name);
      }
    }
    return [...byId.entries()].map(([id, name]) => ({ id, name }));
  }, [backendCategories, items]);

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
      return { id: photoIdRef.current, url: URL.createObjectURL(file), file };
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

  function clearPhotos() {
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
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

  const clearCreateParam = useCallback(() => {
    if (searchParams.get("action") === "create") {
      const next = urlQuery ? `/services?q=${encodeURIComponent(urlQuery)}` : "/services";
      router.replace(next);
    }
  }, [router, searchParams, urlQuery]);

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
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      setSubmitError("Pilih kategori layanan yang tersedia terlebih dahulu.");
      return;
    }
    const priceMin = Number(formData.price_min);
    if (formData.price_min.trim() === "" || Number.isNaN(priceMin) || priceMin < 0) {
      setSubmitError("Masukkan nominal harga minimal yang valid.");
      return;
    }
    const priceMaxRaw = formData.price_max.trim();
    const priceMax = priceMaxRaw === "" ? null : Number(priceMaxRaw);
    if (priceMax !== null && (Number.isNaN(priceMax) || priceMax < priceMin)) {
      setSubmitError("Harga maksimal tidak boleh lebih kecil dari harga minimal.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const uploaded =
        photos.length > 0
          ? await Promise.all(photos.map((p) => uploadMedia(p.file, "services")))
          : [];
      await apiFetch<ServiceCreateResponse>("/v1/services", {
        method: "POST",
        body: JSON.stringify({
          title: formData.title.trim(),
          category_id: categoryId,
          price_min: priceMin,
          price_max: priceMax,
          pricing_type: pricingType,
          estimated_time:
            formData.estimated_time.trim() === "" ? null : formData.estimated_time.trim(),
          payment_method: paymentMethod,
          whatsapp_number:
            formData.whatsapp_number.trim() === "" ? null : formData.whatsapp_number.trim(),
          target_faculties: targetFakultas,
          description: formData.description.trim(),
          image_paths: uploaded.map((u) => u.path),
        }),
      });
      setIsModalOpen(false);
      setFormData(EMPTY_FORM);
      setPricingType("starting_from");
      setPaymentMethod("flexible");
      setTargetFakultas([...TARGET_FAKULTAS_OPTIONS]);
      clearPhotos();
      clearCreateParam();
      setPage(1);
      await loadServices(1, activeCategoryId, debouncedQuery);
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

  const hasActiveFilter =
    activeCategoryId !== null ||
    query.trim() !== "" ||
    debouncedQuery !== "" ||
    urlQuery !== "";

  function clearFilters() {
    setActiveCategoryId(null);
    setQuery("");
    debouncedQueryRef.current = "";
    setDebouncedQuery("");
    setPage(1);
    if (urlQuery !== "") {
      prevUrlQueryRef.current = "";
      router.replace("/services");
    }
  }

  const previewCategory =
    categoryOptions.find((c) => String(c.id) === formData.category_id)?.name ?? "Kategori";
  const parsedPreviewMin = Number(formData.price_min);
  const hasValidPreviewPrice =
    formData.price_min.trim() !== "" &&
    !Number.isNaN(parsedPreviewMin) &&
    parsedPreviewMin >= 0;
  const parsedPreviewMax = Number(formData.price_max);
  const previewHasRange =
    hasValidPreviewPrice &&
    formData.price_max.trim() !== "" &&
    !Number.isNaN(parsedPreviewMax) &&
    parsedPreviewMax > parsedPreviewMin;
  const previewModelLabel =
    PRICING_MODELS.find((m) => m.value === pricingType)?.label ?? "Mulai Dari";
  const previewPriceLine = !hasValidPreviewPrice
    ? "Tarif belum diisi"
    : pricingType === "per_hour"
      ? `${formatRupiah(parsedPreviewMin)} / jam`
      : pricingType === "negotiable"
        ? `${formatPriceRange(parsedPreviewMin, previewHasRange ? parsedPreviewMax : null)} (Nego)`
        : formatPriceRange(parsedPreviewMin, previewHasRange ? parsedPreviewMax : null);

  const previewProviderName =
    currentUser?.profile?.name || currentUser?.name || "Mahasiswa UPN";
  const previewProviderFaculty =
    currentUser?.profile?.faculty || "UPN Veteran Jatim";

  return (
    <div className="auth-shell-enter mx-auto max-w-[1200px] space-y-7">
      {/* Header Band */}
      <section className="flex flex-col justify-between gap-5 border-b border-[#E5E0DA] pb-6 lg:flex-row lg:items-end">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] font-medium text-[#6E6A66]">
            <span>Portal Mahasiswa / Layanan &amp; Jasa</span>
            <span aria-hidden="true" className="text-[#CFC8BF]">
              ·
            </span>
            <span>{isLoading ? "Memuat layanan…" : `${total} jasa aktif`}</span>
            {debouncedQuery !== "" && (
              <>
                <span aria-hidden="true" className="text-[#CFC8BF]">
                  ·
                </span>
                <span className="text-[#141416]">
                  Pencarian: &ldquo;{debouncedQuery}&rdquo;
                </span>
              </>
            )}
          </div>

          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[#141416] sm:text-[32px] sm:leading-[1.18]">
            Jasa &amp; Layanan Mahasiswa
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-[#57534E]">
            Temukan layanan les privat, desain grafis, fotografi, dan servis teknis dari mahasiswa UPN.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSubmitError(null);
            setIsModalOpen(true);
          }}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          Tawarkan jasa
        </button>
      </section>

      {/* Unified Category + Search Filter Bar */}
      <section
        aria-label="Filter katalog jasa"
        className="rounded-[20px] border border-[#E5E0DA] bg-white p-5 sm:p-6"
      >
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter berdasarkan kategori"
        >
          <button
            type="button"
            onClick={() => {
              setActiveCategoryId(null);
              setPage(1);
            }}
            aria-pressed={activeCategoryId === null}
            className={`min-h-[44px] rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] ${
              activeCategoryId === null
                ? "bg-[#141416] text-white"
                : "bg-[#F4F1EE] text-[#57534E] hover:bg-[#EAE6E2] hover:text-[#141416]"
            }`}
          >
            Semua kategori
          </button>
          {filterCategories.map((cat) => {
            const isActive = activeCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategoryId(cat.id);
                  setPage(1);
                }}
                aria-pressed={isActive}
                className={`min-h-[44px] rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] ${
                  isActive
                    ? "bg-[#141416] text-white"
                    : "bg-[#F4F1EE] text-[#57534E] hover:bg-[#EAE6E2] hover:text-[#141416]"
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-[#F1EDE8] pt-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            <label htmlFor="services-search" className="block text-[13px] font-medium text-[#57534E]">
              Cari jasa atau keahlian
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E6A66]">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </span>
              <input
                id="services-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari judul layanan atau keahlian"
                className="h-11 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] pl-10 pr-4 text-[14px] text-[#141416] placeholder:text-[#66625E] transition-all duration-150 hover:border-[#CFC8BF] focus:border-[#141416] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
              />
            </div>
          </div>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-5 text-[14px] font-medium text-[#141416] transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:border-[#141416] hover:bg-[#FAF8F6] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              Atur ulang filter
            </button>
          )}
        </div>
      </section>

      {/* Catalog Grid */}
      <section aria-label="Daftar jasa dan layanan mahasiswa">
        {isLoading ? (
          <div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
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
            className="rounded-[20px] border border-[#E5E0DA] bg-white px-6 py-14 text-center"
          >
            <h2 className="font-display text-lg font-semibold text-[#141416]">
              Gagal memuat katalog jasa
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-[14px] text-[#6E6A66]">{error}</p>
            <button
              type="button"
              onClick={() => void loadServices(page, activeCategoryId, debouncedQuery)}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              Muat ulang daftar
            </button>
          </div>
        ) : items.length === 0 ? (
          <div
            role="status"
            className="rounded-[20px] border border-[#E5E0DA] bg-white px-6 py-14 text-center"
          >
            <h2 className="font-display text-lg font-semibold text-[#141416]">
              {hasActiveFilter ? "Tidak ada jasa sesuai filter" : "Belum ada jasa dipublikasikan"}
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-[14px] text-[#6E6A66]">
              {hasActiveFilter
                ? "Ubah kategori atau kata kunci pencarian untuk melihat layanan lain."
                : "Tawarkan jasa pertama Anda untuk membantu mahasiswa UPN dalam belajar, desain, atau servis."}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-6 text-[14px] font-medium text-[#141416] transition-all duration-150 hover:-translate-y-[1px] hover:border-[#141416] hover:bg-[#FAF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  Atur ulang filter
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSubmitError(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                Tawarkan jasa
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, idx) => {
              const categoryName = item.category?.name ?? "Lainnya";
              const providerName = item.user?.name ?? "Mahasiswa UPN";
              const pricingLabel = item.pricing_type
                ? (PRICING_LABELS[item.pricing_type] ?? item.pricing_type)
                : null;
              const priceText =
                item.pricing_type === "per_hour"
                  ? `${formatPriceRange(item.price_min, item.price_max)} / jam`
                  : formatPriceRange(item.price_min, item.price_max);
              const footerMeta = item.estimated_time?.trim() || formatTimeAgo(item.created_at);

              return (
                <article
                  key={item.id}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white transition-all duration-180 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[2px] hover:border-[#CFC8BF] hover:shadow-[0_14px_28px_-14px_rgba(20,20,22,0.10)] focus-within:ring-2 focus-within:ring-[#141416] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <Link
                    href={`/services/${item.id}`}
                    aria-label={`Lihat detail ${item.title}`}
                    className="block overflow-hidden bg-[#F4F1EE] focus:outline-none"
                  >
                    <ListingImage
                      module="service"
                      seed={item.id}
                      eager={idx < 3}
                      width={800}
                      height={600}
                      hint={`${categoryName} ${item.title}`}
                      images={item.images}
                      alt={`Foto layanan ${item.title}`}
                      className="aspect-[4/3] w-full object-cover transition-transform duration-600 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  </Link>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-md bg-[#F4F1EE] px-2.5 py-1 text-[13px] font-medium text-[#57534E]">
                        {categoryName}
                      </span>
                      {pricingLabel && (
                        <span className="text-[13px] font-medium text-[#6E6A66]">
                          {pricingLabel}
                        </span>
                      )}
                    </div>

                    <h2 className="mt-3 line-clamp-2 font-display text-[16px] font-semibold leading-snug text-[#141416]">
                      <Link
                        href={`/services/${item.id}`}
                        className="hover:underline focus:outline-none"
                      >
                        {item.title}
                      </Link>
                    </h2>

                    <p className="mt-1.5 font-display text-[20px] font-bold tracking-tight text-[#141416]">
                      {priceText}
                    </p>

                    <p className="mt-2 line-clamp-2 flex-1 text-[14px] leading-relaxed text-[#57534E]">
                      {item.description ?? "Tidak ada deskripsi tambahan."}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#F1EDE8] pt-4">
                      <span className="flex min-w-0 items-center gap-2">
                        <ProviderAvatar name={providerName} />
                        <span className="truncate text-[13px] font-medium text-[#141416]">
                          {providerName}
                        </span>
                      </span>
                      {footerMeta && (
                        <span className="shrink-0 text-[13px] text-[#6E6A66]">
                          {footerMeta}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!isLoading && !error && lastPage > 1 && (
          <nav
            aria-label="Navigasi halaman jasa"
            className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#E5E0DA] bg-white px-5 py-4 text-[14px] text-[#57534E]"
          >
            <span>
              Halaman <strong className="font-semibold text-[#141416]">{page}</strong> dari{" "}
              <strong className="font-semibold text-[#141416]">{lastPage}</strong> ({total} layanan)
            </span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#E5E0DA] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-40"
              >
                ← Sebelumnya
              </button>
              <button
                type="button"
                disabled={page >= lastPage}
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#E5E0DA] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-40"
              >
                Berikutnya →
              </button>
            </div>
          </nav>
        )}
      </section>

      {/* Matte Warm-Alabaster Modal Tawarkan Jasa */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#141416]/50 p-3 sm:p-4"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pasang-jasa-title"
            onClick={(e) => e.stopPropagation()}
            className="auth-shell-enter max-h-[92vh] w-full max-w-[960px] overflow-y-auto rounded-[24px] border border-[#E5E0DA] bg-[#F4F1EE] p-4 shadow-[0_20px_48px_-20px_rgba(20,20,22,0.20)] sm:rounded-[28px] sm:p-7"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E5E0DA] pb-4">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[#6E6A66]">
                  Layanan &amp; Jasa UPN · Tawarkan jasa baru
                </p>
                <h2
                  id="pasang-jasa-title"
                  className="mt-1 font-display text-2xl font-semibold tracking-tight text-[#141416]"
                >
                  Tawarkan jasa mahasiswa.{" "}
                  <span className="font-normal text-[#6E6A66]">
                    Bagikan keahlian Anda ke sesama mahasiswa.
                  </span>
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                aria-label="Tutup form tawarkan jasa"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5E0DA] bg-white text-lg text-[#57534E] transition-colors hover:border-[#141416] hover:text-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5">
              <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.45fr_0.85fr]">
                {/* Form Card */}
                <div className="min-w-0 space-y-6 rounded-[20px] border border-[#E5E0DA] bg-white p-5 sm:p-6">
                  {/* Informasi Layanan */}
                  <section aria-labelledby="jasa-info-heading" className="space-y-4">
                    <h3 id="jasa-info-heading" className="font-display text-[16px] font-semibold text-[#141416]">
                      Informasi layanan
                    </h3>
                    <div>
                      <label htmlFor="jasa-title" className="block text-[14px] font-medium text-[#141416]">
                        Judul jasa atau layanan <span className="text-[#B83232]">*</span>
                      </label>
                      <input
                        id="jasa-title"
                        type="text"
                        required
                        maxLength={255}
                        value={formData.title}
                        onChange={(e) => updateForm("title", e.target.value)}
                        placeholder="Judul layanan yang ditawarkan"
                        className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 text-[14px] text-[#141416] placeholder:text-[#66625E] transition-all focus:border-[#141416] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                      />
                      <p className="mt-1.5 text-[13px] text-[#6E6A66]">
                        Gunakan judul spesifik dan jelas agar mudah ditemukan di pencarian.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="jasa-category" className="block text-[14px] font-medium text-[#141416]">
                          Kategori layanan <span className="text-[#B83232]">*</span>
                        </label>
                        <div className="relative mt-1.5">
                          <select
                            id="jasa-category"
                            required
                            value={formData.category_id}
                            onChange={(e) => updateForm("category_id", e.target.value)}
                            disabled={categoryOptions.length === 0}
                            className="h-11 w-full appearance-none rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] pl-3.5 pr-9 text-[14px] text-[#141416] transition-all hover:border-[#CFC8BF] focus:border-[#141416] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-60"
                          >
                            <option value="">Pilih kategori</option>
                            {categoryOptions.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 16 16"
                            fill="none"
                            aria-hidden="true"
                            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6E6A66]"
                          >
                            <path
                              d="M4 6l4 4 4-4"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        {categoryOptions.length === 0 && (
                          <p className="mt-1.5 text-[13px] text-[#6E6A66]">
                            Kategori belum tersedia. Tunggu data jasa dimuat.
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="jasa-estimasi" className="block text-[14px] font-medium text-[#141416]">
                          Estimasi waktu pengerjaan
                        </label>
                        <div className="relative mt-1.5">
                          <select
                            id="jasa-estimasi"
                            value={formData.estimated_time}
                            onChange={(e) => updateForm("estimated_time", e.target.value)}
                            className="h-11 w-full appearance-none rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] pl-3.5 pr-9 text-[14px] text-[#141416] transition-all hover:border-[#CFC8BF] focus:border-[#141416] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                          >
                            {ESTIMASI_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 16 16"
                            fill="none"
                            aria-hidden="true"
                            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6E6A66]"
                          >
                            <path
                              d="M4 6l4 4 4-4"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <fieldset>
                      <legend className="text-[14px] font-medium text-[#141416]">
                        Target fakultas atau jurusan
                      </legend>
                      <div
                        className="mt-2 grid grid-cols-1 gap-2 rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] p-2.5 sm:grid-cols-2"
                        role="group"
                        aria-label="Target fakultas"
                      >
                        <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-xl border border-[#E5E0DA] bg-white px-3 py-2 text-[13px] font-semibold text-[#141416] transition-colors hover:border-[#CFC8BF] focus-within:ring-2 focus-within:ring-[#141416]">
                          <input
                            type="checkbox"
                            checked={allFakultasSelected}
                            onChange={toggleAllFakultas}
                            className="h-4 w-4 shrink-0 accent-[#141416] focus-visible:outline-none"
                          />
                          <span>Semua Fakultas</span>
                        </label>
                        {TARGET_FAKULTAS_OPTIONS.map((f) => {
                          const checked = targetFakultas.includes(f);
                          return (
                            <label
                              key={f}
                              className={`flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors focus-within:ring-2 focus-within:ring-[#141416] ${
                                checked
                                  ? "border-[#141416] bg-white text-[#141416]"
                                  : "border-[#E5E0DA] bg-white text-[#57534E] hover:border-[#CFC8BF]"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleFakultas(f)}
                                className="h-4 w-4 shrink-0 accent-[#141416] focus-visible:outline-none"
                              />
                              <span>{f}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  </section>

                  {/* Skema Tarif & Pembayaran */}
                  <section
                    aria-labelledby="jasa-tarif-heading"
                    className="space-y-4 border-t border-[#F1EDE8] pt-5"
                  >
                    <h3 id="jasa-tarif-heading" className="font-display text-[16px] font-semibold text-[#141416]">
                      Skema tarif &amp; pelaksanaan
                    </h3>

                    <fieldset>
                      <legend className="text-[14px] font-medium text-[#141416]">Model tarif</legend>
                      <div
                        className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"
                        role="radiogroup"
                        aria-label="Model tarif"
                      >
                        {PRICING_MODELS.map((opt) => {
                          const checked = pricingType === opt.value;
                          return (
                            <label
                              key={opt.value}
                              className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-center text-[13px] font-medium transition-all focus-within:ring-2 focus-within:ring-[#141416] focus-within:ring-offset-2 ${
                                checked
                                  ? "border-[#141416] bg-[#141416] text-white"
                                  : "border-[#E5E0DA] bg-[#F6F4F1] text-[#57534E] hover:border-[#CFC8BF]"
                              }`}
                            >
                              <input
                                type="radio"
                                name="jasa-pricing"
                                value={opt.value}
                                checked={checked}
                                onChange={() => setPricingType(opt.value)}
                                className="sr-only"
                              />
                              <span>{opt.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="jasa-price-min"
                          className="block text-[14px] font-medium text-[#141416]"
                        >
                          Nominal harga (Rp) <span className="text-[#B83232]">*</span>
                        </label>
                        <div className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 transition-all focus-within:border-[#141416] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#141416]">
                          <span className="text-[14px] font-semibold text-[#57534E]">Rp</span>
                          <input
                            id="jasa-price-min"
                            type="number"
                            required
                            min={0}
                            step="any"
                            value={formData.price_min}
                            onChange={(e) => updateForm("price_min", e.target.value)}
                            placeholder="Masukkan nominal minimal"
                            className="w-full bg-transparent text-[14px] font-semibold text-[#141416] placeholder:font-normal placeholder:text-[#66625E] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="jasa-price-max"
                          className="block text-[14px] font-medium text-[#141416]"
                        >
                          Harga maksimal (Rp){" "}
                          <span className="font-normal text-[#6E6A66]">(opsional)</span>
                        </label>
                        <div className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 transition-all focus-within:border-[#141416] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#141416]">
                          <span className="text-[14px] font-semibold text-[#57534E]">Rp</span>
                          <input
                            id="jasa-price-max"
                            type="number"
                            min={0}
                            step="any"
                            value={formData.price_max}
                            onChange={(e) => updateForm("price_max", e.target.value)}
                            placeholder="Opsional jika tarif tetap"
                            className="w-full bg-transparent text-[14px] font-semibold text-[#141416] placeholder:font-normal placeholder:text-[#66625E] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <fieldset>
                      <legend className="text-[14px] font-medium text-[#141416]">
                        Metode pembayaran
                      </legend>
                      <div
                        className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3"
                        role="radiogroup"
                        aria-label="Metode pembayaran"
                      >
                        {PAYMENT_METHODS.map((opt) => {
                          const checked = paymentMethod === opt.value;
                          return (
                            <label
                              key={opt.value}
                              className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-center text-[13px] font-medium transition-all focus-within:ring-2 focus-within:ring-[#141416] focus-within:ring-offset-2 ${
                                checked
                                  ? "border-[#141416] bg-[#141416] text-white"
                                  : "border-[#E5E0DA] bg-[#F6F4F1] text-[#57534E] hover:border-[#CFC8BF]"
                              }`}
                            >
                              <input
                                type="radio"
                                name="jasa-payment"
                                value={opt.value}
                                checked={checked}
                                onChange={() => setPaymentMethod(opt.value)}
                                className="sr-only"
                              />
                              <span>{opt.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  </section>

                  {/* Deskripsi & Kontak */}
                  <section
                    aria-labelledby="jasa-deskripsi-heading"
                    className="space-y-4 border-t border-[#F1EDE8] pt-5"
                  >
                    <h3 id="jasa-deskripsi-heading" className="font-display text-[16px] font-semibold text-[#141416]">
                      Deskripsi &amp; kontak
                    </h3>
                    <div>
                      <label
                        htmlFor="jasa-description"
                        className="block text-[14px] font-medium text-[#141416]"
                      >
                        Deskripsi layanan <span className="text-[#B83232]">*</span>
                      </label>
                      <textarea
                        id="jasa-description"
                        required
                        rows={4}
                        value={formData.description}
                        onChange={(e) => updateForm("description", e.target.value)}
                        placeholder="Jelaskan cakupan layanan, metode pengerjaan, dan cara pemesanan"
                        className="mt-1.5 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] p-3.5 text-[14px] leading-relaxed text-[#141416] placeholder:text-[#66625E] transition-all focus:border-[#141416] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                      />
                    </div>

                    <div>
                      <span
                        id="jasa-photos-label"
                        className="block text-[14px] font-medium text-[#141416]"
                      >
                        Foto sampul atau portofolio (maksimal 6)
                      </span>
                      <div
                        className="mt-2 flex flex-wrap gap-3"
                        role="group"
                        aria-labelledby="jasa-photos-label"
                      >
                        {photos.map((photo, i) => (
                          <span key={photo.id} className="relative h-20 w-20">
                            {/* eslint-disable-next-line @next/next/no-img-element -- local object URLs for instant upload preview only */}
                            <img
                              src={photo.url}
                              alt={`Foto portofolio ${i + 1}`}
                              width={80}
                              height={80}
                              className="h-20 w-20 rounded-xl border border-[#E5E0DA] object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removePhoto(photo.id)}
                              aria-label={`Hapus foto portofolio ${i + 1}`}
                              className="group absolute -right-3 -top-3 flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                            >
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#141416] text-[13px] font-bold leading-none text-white transition-colors group-hover:bg-[#B83232]">
                                ×
                              </span>
                            </button>
                          </span>
                        ))}
                        <label className="flex h-20 min-w-[120px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#CFC8BF] bg-[#F6F4F1] px-4 text-[#57534E] transition-colors hover:border-[#141416] hover:bg-white focus-within:ring-2 focus-within:ring-[#141416]">
                          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path
                              d="M8 3v10M3 8h10"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="text-[13px] font-medium">Tambah foto</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            aria-label="Unggah foto sampul atau portofolio"
                            className="sr-only"
                            onChange={(e) => {
                              addPhotos(e.target.files);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="jasa-wa" className="block text-[14px] font-medium text-[#141416]">
                        Nomor WhatsApp{" "}
                        <span className="font-normal text-[#6E6A66]">(opsional)</span>
                      </label>
                      <input
                        id="jasa-wa"
                        type="tel"
                        value={formData.whatsapp_number}
                        onChange={(e) => updateForm("whatsapp_number", e.target.value)}
                        placeholder="Nomor WhatsApp aktif (opsional)"
                        className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 text-[14px] text-[#141416] placeholder:text-[#66625E] transition-all focus:border-[#141416] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                      />
                    </div>
                  </section>

                  {submitError && (
                    <p
                      role="alert"
                      className="rounded-xl border border-[#F1C9C9] bg-[#FDF2F2] px-4 py-3 text-[13px] font-medium text-[#B83232]"
                    >
                      {submitError}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#F1EDE8] pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={isSubmitting}
                      className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    >
                      {isSubmitting ? "Menyimpan layanan…" : "Terbitkan layanan"}
                    </button>
                  </div>
                </div>

                {/* Live Preview Card */}
                <aside
                  aria-label="Pratinjau kartu jasa"
                  className="min-w-0 rounded-[20px] border border-[#E5E0DA] bg-white p-5 lg:sticky lg:top-0"
                >
                  <p className="text-[13px] font-semibold text-[#141416]">
                    Pratinjau tampilan katalog
                  </p>
                  <div className="mt-3 overflow-hidden rounded-2xl border border-[#EAE5DF] bg-white">
                    <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#EFECE8] text-[#5F5B57]">
                      {photos.length > 0 ? (
                        // eslint-disable-next-line @next/next/no-img-element -- local preview before upload
                        <img
                          src={photos[0].url}
                          alt="Pratinjau foto portofolio layanan"
                          width={640}
                          height={480}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-[13px] font-medium">
                          Belum ada foto dipilih
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-md bg-[#F4F1EE] px-2.5 py-0.5 text-[13px] font-medium text-[#57534E]">
                          {previewCategory}
                        </span>
                        <span className="text-[13px] font-medium text-[#6E6A66]">
                          {previewModelLabel}
                        </span>
                      </div>
                      <p className="mt-2.5 line-clamp-2 font-display text-[15px] font-semibold text-[#141416]">
                        {formData.title.trim() || "Judul layanan belum diisi"}
                      </p>
                      <p
                        className={`mt-1 font-display text-[17px] ${
                          hasValidPreviewPrice ? "font-bold text-[#141416]" : "font-medium text-[#6E6A66]"
                        }`}
                      >
                        {previewPriceLine}
                      </p>
                      <div className="mt-2 space-y-1 text-[13px] text-[#57534E]">
                        <p className="truncate">Estimasi: {formData.estimated_time || "Fleksibel"}</p>
                        <p className="truncate">Target: {fakultasSummary}</p>
                        {formData.whatsapp_number.trim() !== "" && (
                          <p className="truncate">WhatsApp: {formData.whatsapp_number.trim()}</p>
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-2 border-t border-[#F1EDE8] pt-3">
                        <ProviderAvatar name={previewProviderName} />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-[#141416]">
                            {previewProviderName}
                          </p>
                          <p className="truncate text-[13px] text-[#6E6A66]">
                            {previewProviderFaculty}
                          </p>
                        </div>
                      </div>
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
    <Suspense fallback={<p className="text-[14px] text-[#6E6A66]">Memuat jasa…</p>}>
      <ServicesContent />
    </Suspense>
  );
}
