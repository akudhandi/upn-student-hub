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
  images?: ApiImage[] | null;
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
  { value: "like-new", label: "Bekas seperti baru" },
  { value: "good", label: "Layak pakai" },
  { value: "fair", label: "Perlu perbaikan" },
] as const;

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
  "like-new": "Seperti baru",
  good: "Layak pakai",
  fair: "Perlu perbaikan",
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

function SellerAvatar({ name }: { name: string }) {
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

function ArrowGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-[#787470] transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:translate-x-[3px] group-hover:text-[#141416]"
    >
      <path
        d="M3.5 8h9M8.5 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ItemCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white">
      <div className="aspect-[4/3] animate-pulse bg-[#EFECE8]" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="h-5 w-24 animate-pulse rounded-full bg-[#F4F1EE]" />
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

function MarketplaceContent() {
  const [items, setItems] = useState<ApiMarketplaceItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [priceFilter, setPriceFilter] = useState("any");
  const [conditionFilter, setConditionFilter] = useState("any");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState<{ id: number; url: string; file: File }[]>([]);
  const [backendCategories, setBackendCategories] = useState<PublicCategory[]>([]);
  const [currentUser] = useState(() => getUser());
  const photoIdRef = useRef(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const createRequested = searchParams.get("action") === "create";
  const urlSearchQuery = (searchParams.get("q") ?? "").trim();

  const loadItems = useCallback(
    async (
      pageNum: number,
      categoryId: number | null,
      condition: string,
      searchQuery: string,
      signal?: AbortSignal
    ) => {
      try {
        setIsLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("page", String(pageNum));
        if (categoryId !== null) params.set("category_id", String(categoryId));
        if (condition !== "any") params.set("condition", condition);
        if (searchQuery !== "") params.set("q", searchQuery);
        const res = await apiFetch<MarketplaceListResponse>(
          `/v1/marketplace?${params.toString()}`
        );
        if (signal?.aborted) return;
        setItems(res.data.data);
        setPage(res.data.current_page);
        setLastPage(res.data.last_page);
        setTotal(res.data.total);
      } catch {
        if (signal?.aborted) return;
        setItems([]);
        setError("Gagal memuat daftar barang. Periksa koneksi backend lalu coba lagi.");
      } finally {
        if (signal?.aborted) return;
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchPublicCategories("marketplace")
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
    void loadItems(page, activeCategoryId, conditionFilter, urlSearchQuery, controller.signal);
    return () => {
      controller.abort();
    };
  }, [page, activeCategoryId, conditionFilter, urlSearchQuery, loadItems]);

  const clearCreateParam = useCallback(() => {
    if (searchParams.get("action") === "create") {
      const next = urlSearchQuery
        ? `/marketplace?q=${encodeURIComponent(urlSearchQuery)}`
        : "/marketplace";
      router.replace(next);
    }
  }, [router, searchParams, urlSearchQuery]);

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

  useEffect(() => {
    if (!isModalOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, closeModal]);

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
    const merged = [...byId.entries()].map(([id, name]) => ({ id, name }));
    const known = new Set(merged.map((c) => normalizeName(c.name)));
    CATEGORY_SUGGESTIONS.forEach((name, i) => {
      if (!known.has(normalizeName(name))) {
        merged.push({ id: -(i + 1), name });
      }
    });
    return merged;
  }, [backendCategories, items]);

  function updateForm<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
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
      setSubmitError("Kategori tersebut belum tersedia di backend. Pilih kategori lain yang aktif.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const uploaded =
        photos.length > 0
          ? await Promise.all(photos.map((p) => uploadMedia(p.file, "marketplace")))
          : [];
      await apiFetch<MarketplaceCreateResponse>("/v1/marketplace", {
        method: "POST",
        body: JSON.stringify({
          title: formData.title.trim(),
          category_id: categoryId,
          condition: formData.condition,
          price: Number(formData.price),
          description: formData.description.trim(),
          image_paths: uploaded.map((u) => u.path),
        }),
      });
      setIsModalOpen(false);
      setFormData(EMPTY_FORM);
      setPhotos((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.url));
        return [];
      });
      clearCreateParam();
      setPage(1);
      await loadItems(1, activeCategoryId, conditionFilter, urlSearchQuery);
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
    const price = Number(item.price);
    if (priceFilter === "under500" && price >= 500000) return false;
    if (priceFilter === "500-1000" && (price < 500000 || price > 1000000)) return false;
    if (priceFilter === "over1000" && price <= 1000000) return false;
    return true;
  });

  const hasActiveFilter =
    activeCategoryId !== null ||
    priceFilter !== "any" ||
    conditionFilter !== "any" ||
    urlSearchQuery !== "";

  function resetFilters() {
    setActiveCategoryId(null);
    setPriceFilter("any");
    setConditionFilter("any");
    setPage(1);
    if (urlSearchQuery !== "") {
      router.replace("/marketplace");
    }
  }

  const previewCategoryName =
    categoryOptions.find((c) => String(c.id) === formData.category_id)?.name ?? "Kategori";
  const previewSellerName = currentUser?.profile?.name || currentUser?.name || "Mahasiswa UPN";
  const previewSellerFaculty = currentUser?.profile?.faculty || "UPN Veteran Jatim";

  return (
    <div className="auth-shell-enter mx-auto max-w-[1200px] space-y-7">
      {/* Header Band */}
      <section className="flex flex-col justify-between gap-5 border-b border-[#E5E0DA] pb-6 lg:flex-row lg:items-end">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] font-medium text-[#6E6A66]">
            <span>Katalog Mahasiswa UPN</span>
            <span aria-hidden="true" className="text-[#CFC8BF]">
              ·
            </span>
            <span>{isLoading ? "Memuat katalog…" : `${total} barang aktif`}</span>
            {urlSearchQuery !== "" && (
              <>
                <span aria-hidden="true" className="text-[#CFC8BF]">
                  ·
                </span>
                <span className="text-[#141416]">
                  Pencarian: &ldquo;{urlSearchQuery}&rdquo;
                </span>
              </>
            )}
          </div>

          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[#141416] sm:text-[32px] sm:leading-[1.18]">
            Marketplace kampus.{" "}
            <span className="font-normal text-[#6E6A66]">
              Jual beli buku kuliah dan kebutuhan mahasiswa.
            </span>
          </h1>
        </div>

        <button
          type="button"
          onClick={() => {
            setSubmitError(null);
            setIsModalOpen(true);
          }}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          Pasang iklan barang
        </button>
      </section>

      {/* Unified Category + Quick Filters Bar */}
      <section
        aria-label="Filter katalog marketplace"
        className="rounded-[20px] border border-[#E5E0DA] bg-white p-5 sm:p-6"
      >
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter berdasarkan kategori">
          <button
            type="button"
            onClick={() => {
              setActiveCategoryId(null);
              setPage(1);
            }}
            aria-pressed={activeCategoryId === null}
            className={`min-h-[38px] rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] ${
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
                className={`min-h-[38px] rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] ${
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

        {/* Select Controls Row */}
        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-[#F1EDE8] pt-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <div>
            <label htmlFor="price-range" className="block text-[13px] font-medium text-[#57534E]">
              Rentang harga
            </label>
            <div className="relative mt-1.5">
              <select
                id="price-range"
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] pl-3.5 pr-9 text-[14px] text-[#141416] transition-all duration-150 hover:border-[#CFC8BF] focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none"
              >
                <option value="any">Semua harga</option>
                <option value="under500">Di bawah Rp 500.000</option>
                <option value="500-1000">Rp 500.000 – 1.000.000</option>
                <option value="over1000">Di atas Rp 1.000.000</option>
              </select>
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6E6A66]"
              >
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <div>
            <label htmlFor="condition" className="block text-[13px] font-medium text-[#57534E]">
              Kondisi barang
            </label>
            <div className="relative mt-1.5">
              <select
                id="condition"
                value={conditionFilter}
                onChange={(e) => {
                  setConditionFilter(e.target.value);
                  setPage(1);
                }}
                className="h-11 w-full appearance-none rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] pl-3.5 pr-9 text-[14px] text-[#141416] transition-all duration-150 hover:border-[#CFC8BF] focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none"
              >
                <option value="any">Semua kondisi</option>
                <option value="new">Baru</option>
                <option value="like-new">Bekas seperti baru</option>
                <option value="good">Layak pakai</option>
                <option value="fair">Perlu perbaikan</option>
              </select>
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6E6A66]"
              >
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-5 text-[14px] font-medium text-[#141416] transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:border-[#141416] hover:bg-[#FAF8F6] active:translate-y-[1px] active:scale-[0.985]"
            >
              Atur ulang filter
            </button>
          )}
        </div>
      </section>

      {/* Catalog Grid */}
      <section aria-label="Daftar barang marketplace">
        {isLoading ? (
          <div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
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
            className="rounded-[20px] border border-[#E5E0DA] bg-white px-6 py-14 text-center"
          >
            <h2 className="font-display text-lg font-semibold text-[#141416]">
              Gagal memuat katalog barang
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-[14px] text-[#6E6A66]">{error}</p>
            <button
              type="button"
              onClick={() => void loadItems(page, activeCategoryId, conditionFilter, urlSearchQuery)}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985]"
            >
              Muat ulang daftar
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[20px] border border-[#E5E0DA] bg-white px-6 py-14 text-center">
            <h2 className="font-display text-lg font-semibold text-[#141416]">
              Belum ada barang yang cocok
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-[14px] text-[#6E6A66]">
              Coba ubah kategori, rentang harga, atau kata kunci pencarian Anda.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-6 text-[14px] font-medium text-[#141416] transition-all duration-150 hover:-translate-y-[1px] hover:border-[#141416]"
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
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428]"
              >
                Pasang iklan barang
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => {
              const categoryName = item.category?.name ?? "Lainnya";
              const sellerName = item.user?.name ?? "Mahasiswa UPN";
              const conditionLabel = CONDITION_LABELS[item.condition] ?? item.condition;
              return (
                <article
                  key={item.id}
                  className="group flex flex-col overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white transition-all duration-180 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[2px] hover:border-[#CFC8BF] hover:shadow-[0_14px_28px_-14px_rgba(20,20,22,0.10)] focus-within:ring-2 focus-within:ring-[#141416]"
                >
                  <Link
                    href={`/marketplace/${item.id}`}
                    aria-label={`Lihat detail ${item.title}`}
                    className="block overflow-hidden bg-[#F4F1EE] focus:outline-none"
                  >
                    <ListingImage
                      module="marketplace"
                      seed={item.id}
                      hint={`${categoryName} ${item.title}`}
                      images={item.images}
                      alt={`Foto ${item.title}`}
                      className="aspect-[4/3] w-full object-cover transition-transform duration-600 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:scale-[1.03]"
                    />
                  </Link>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-[#F4F1EE] px-3 py-1 text-[13px] font-medium text-[#57534E]">
                        {categoryName}
                      </span>
                      {conditionLabel && (
                        <span className="text-[13px] font-medium text-[#6E6A66]">
                          {conditionLabel}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 line-clamp-2 font-display text-[16px] font-semibold leading-snug text-[#141416]">
                      <Link
                        href={`/marketplace/${item.id}`}
                        className="hover:underline focus:outline-none"
                      >
                        {item.title}
                      </Link>
                    </h3>

                    <p className="mt-1.5 font-display text-[20px] font-bold tracking-tight text-[#141416]">
                      {formatRupiah(item.price)}
                    </p>

                    <p className="mt-2 line-clamp-2 flex-1 text-[14px] leading-relaxed text-[#57534E]">
                      {item.description ?? "Tidak ada deskripsi tambahan."}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#F1EDE8] pt-4">
                      <span className="flex min-w-0 items-center gap-2">
                        <SellerAvatar name={sellerName} />
                        <span className="truncate text-[13px] font-medium text-[#141416]">
                          {sellerName}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-[13px] text-[#6E6A66]">
                        <span>{formatTimeAgo(item.created_at)}</span>
                        <ArrowGlyph />
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!isLoading && !error && lastPage > 1 && (
          <nav
            aria-label="Navigasi halaman marketplace"
            className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#E5E0DA] bg-white px-5 py-4 text-[14px] text-[#57534E]"
          >
            <span>
              Halaman <strong className="font-semibold text-[#141416]">{page}</strong> dari{" "}
              <strong className="font-semibold text-[#141416]">{lastPage}</strong> ({total} barang)
            </span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#E5E0DA] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] disabled:pointer-events-none disabled:opacity-40"
              >
                ← Sebelumnya
              </button>
              <button
                type="button"
                disabled={page >= lastPage}
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#E5E0DA] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] disabled:pointer-events-none disabled:opacity-40"
              >
                Berikutnya →
              </button>
            </div>
          </nav>
        )}
      </section>

      {/* Warm-Alabaster Modal Pasang Iklan */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#141416]/45 p-4 backdrop-blur-[2px]"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pasang-iklan-title"
            onClick={(e) => e.stopPropagation()}
            className="auth-shell-enter max-h-[92vh] w-full max-w-[940px] overflow-y-auto rounded-[28px] border border-[#E5E0DA] bg-[#F4F1EE] p-5 shadow-[0_28px_70px_-24px_rgba(20,20,22,0.28)] sm:p-7"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E5E0DA] pb-4">
              <div>
                <p className="text-[13px] font-medium text-[#6E6A66]">
                  Marketplace UPN · Pasang iklan baru
                </p>
                <h2
                  id="pasang-iklan-title"
                  className="mt-1 font-display text-2xl font-semibold tracking-tight text-[#141416]"
                >
                  Pasang iklan barang.{" "}
                  <span className="font-normal text-[#6E6A66]">
                    Tawarkan ke sesama mahasiswa.
                  </span>
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                aria-label="Tutup form pasang iklan"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E5E0DA] bg-white text-lg text-[#57534E] transition-colors hover:border-[#141416] hover:text-[#141416] disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5">
              <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.45fr_0.85fr]">
                {/* Form Card */}
                <div className="space-y-4 rounded-[20px] border border-[#E5E0DA] bg-white p-5 sm:p-6">
                  <div>
                    <label
                      htmlFor="iklan-title"
                      className="block text-[14px] font-medium text-[#141416]"
                    >
                      Judul barang <span className="text-[#C53939]">*</span>
                    </label>
                    <input
                      id="iklan-title"
                      type="text"
                      required
                      maxLength={255}
                      value={formData.title}
                      onChange={(e) => updateForm("title", e.target.value)}
                      placeholder="Mis. Buku Kalkulus Purcell Edisi 9 (Lengkap Catatan)"
                      className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 text-[14px] text-[#141416] placeholder:text-[#787470] transition-all focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="iklan-category"
                        className="block text-[14px] font-medium text-[#141416]"
                      >
                        Kategori <span className="text-[#C53939]">*</span>
                      </label>
                      <select
                        id="iklan-category"
                        required
                        value={formData.category_id}
                        onChange={(e) => updateForm("category_id", e.target.value)}
                        disabled={categoryOptions.length === 0}
                        className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 text-[14px] text-[#141416] transition-all focus:border-[#141416] focus:bg-white focus:outline-none disabled:opacity-60"
                      >
                        <option value="">Pilih kategori</option>
                        {categoryOptions.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      {categoryOptions.length === 0 && (
                        <p className="mt-1.5 text-[13px] text-[#6E6A66]">
                          Kategori belum tersedia. Tunggu data marketplace dimuat.
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="iklan-price"
                        className="block text-[14px] font-medium text-[#141416]"
                      >
                        Harga (Rp) <span className="text-[#C53939]">*</span>
                      </label>
                      <div className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 transition-all focus-within:border-[#141416] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(20,20,22,0.06)]">
                        <span className="text-[14px] font-semibold text-[#57534E]">Rp</span>
                        <input
                          id="iklan-price"
                          type="number"
                          required
                          min={0}
                          step="any"
                          value={formData.price}
                          onChange={(e) => updateForm("price", e.target.value)}
                          placeholder="85000"
                          className="w-full bg-transparent text-[14px] font-semibold text-[#141416] placeholder:font-normal placeholder:text-[#787470] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <fieldset>
                    <legend className="text-[14px] font-medium text-[#141416]">
                      Kondisi barang <span className="text-[#C53939]">*</span>
                    </legend>
                    <div
                      className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"
                      role="radiogroup"
                      aria-label="Kondisi barang"
                    >
                      {CONDITION_OPTIONS.map((opt) => {
                        const checked = formData.condition === opt.value;
                        return (
                          <label
                            key={opt.value}
                            className={`flex min-h-[40px] cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-center text-[13px] font-medium transition-all ${
                              checked
                                ? "border-[#141416] bg-[#141416] text-white"
                                : "border-[#E5E0DA] bg-[#F6F4F1] text-[#57534E] hover:border-[#CFC8BF]"
                            }`}
                          >
                            <input
                              type="radio"
                              name="iklan-condition"
                              value={opt.value}
                              checked={checked}
                              onChange={(e) => updateForm("condition", e.target.value)}
                              required
                              className="sr-only"
                            />
                            <span>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div>
                    <label
                      htmlFor="iklan-description"
                      className="block text-[14px] font-medium text-[#141416]"
                    >
                      Deskripsi barang <span className="text-[#C53939]">*</span>
                    </label>
                    <textarea
                      id="iklan-description"
                      required
                      rows={4}
                      value={formData.description}
                      onChange={(e) => updateForm("description", e.target.value)}
                      placeholder="Jelaskan kondisi barang, kelengkapan, dan titik temu COD di area kampus (mis. Gazebo FIK atau Perpustakaan Pusat)."
                      className="mt-1.5 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] p-3.5 text-[14px] leading-relaxed text-[#141416] placeholder:text-[#787470] transition-all focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <span id="iklan-photos-label" className="block text-[14px] font-medium text-[#141416]">
                      Foto barang (maksimal 6)
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2.5" role="group" aria-labelledby="iklan-photos-label">
                      {photos.map((photo, i) => (
                        <span key={photo.id} className="relative h-20 w-20">
                          {/* eslint-disable-next-line @next/next/no-img-element -- local object URLs for instant upload preview only */}
                          <img
                            src={photo.url}
                            alt={`Foto barang ${i + 1}`}
                            className="h-20 w-20 rounded-xl border border-[#E5E0DA] object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(photo.id)}
                            aria-label={`Hapus foto barang ${i + 1}`}
                            className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#141416] text-[13px] font-bold leading-none text-white hover:bg-[#C53939]"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <label className="flex h-20 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#CFC8BF] bg-[#F6F4F1] text-[#57534E] transition-colors hover:border-[#141416] hover:bg-white focus-within:ring-2 focus-within:ring-[#141416]">
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <span className="text-[13px] font-medium">Tambah</span>
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
                      className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] disabled:opacity-50"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] disabled:opacity-60"
                    >
                      {isSubmitting ? "Menyimpan iklan…" : "Terbitkan iklan barang"}
                    </button>
                  </div>
                </div>

                {/* Live Preview Card matching exact catalog card style */}
                <aside
                  aria-label="Pratinjau kartu iklan"
                  className="rounded-[20px] border border-[#E5E0DA] bg-white p-5 lg:sticky lg:top-0"
                >
                  <p className="text-[13px] font-semibold text-[#141416]">
                    Pratinjau tampilan katalog
                  </p>
                  <div className="mt-3 overflow-hidden rounded-2xl border border-[#EAE5DF] bg-white">
                    <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#F4F1EE]">
                      {photos.length > 0 ? (
                        // eslint-disable-next-line @next/next/no-img-element -- local preview before upload
                        <img
                          src={photos[0].url}
                          alt="Pratinjau foto barang"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <svg
                          width="36"
                          height="36"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                          className="text-[#85817C]"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.4" />
                          <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.4" />
                          <path
                            d="M3 16L8.5 11L13 15.5L16 13L21 18"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-[#F4F1EE] px-2.5 py-0.5 text-[13px] font-medium text-[#57534E]">
                          {previewCategoryName}
                        </span>
                        <span className="text-[13px] font-medium text-[#6E6A66]">
                          {CONDITION_LABELS[formData.condition] ?? "Layak pakai"}
                        </span>
                      </div>
                      <p className="mt-2.5 line-clamp-2 font-display text-[15px] font-semibold text-[#141416]">
                        {formData.title || "Judul barang tampil di sini"}
                      </p>
                      <p className="mt-1 font-display text-[18px] font-bold text-[#141416]">
                        {formData.price ? formatRupiah(Number(formData.price) || 0) : "Rp 85.000"}
                      </p>
                      <div className="mt-3 flex items-center gap-2 border-t border-[#F1EDE8] pt-3">
                        <SellerAvatar name={previewSellerName} />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-[#141416]">
                            {previewSellerName}
                          </p>
                          <p className="truncate text-[13px] text-[#6E6A66]">
                            {previewSellerFaculty}
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

export default function MarketplacePage() {
  return (
    <Suspense fallback={<p className="text-[14px] text-[#6E6A66]">Memuat marketplace…</p>}>
      <MarketplaceContent />
    </Suspense>
  );
}
