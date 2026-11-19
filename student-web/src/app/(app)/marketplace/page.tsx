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
import VerifiedBadge from "@/components/VerifiedBadge";
import { getToken, getUser } from "@/lib/auth";
import type { ApiImage } from "@/lib/images";
import { fetchFavorites, toggleFavorite } from "@/lib/interactions";

type ApiMarketplaceItem = {
  id: number;
  title: string;
  description: string | null;
  price: number | string;
  condition: string;
  status: string;
  created_at: string;
  user?: {
    id: number;
    name: string;
    is_official_account?: boolean;
  } | null;
  category?: { id: number; name: string; slug: string } | null;
  images?: ApiImage[] | null;
};

type MarketplaceListResponse = {
  message: string;
  data: {
    current_page: number;
    last_page: number;
    per_page?: number;
    from?: number | null;
    to?: number | null;
    total: number;
    data: ApiMarketplaceItem[];
  };
};

type MarketplaceCreateResponse = {
  message: string;
  data: ApiMarketplaceItem;
};

type SortOption = "latest" | "price_asc" | "price_desc";

const CONDITION_OPTIONS = [
  { value: "new", label: "Baru" },
  { value: "like-new", label: "Seperti baru" },
  { value: "good", label: "Layak pakai" },
  { value: "fair", label: "Perlu perbaikan" },
] as const;

const PRICE_RANGE_OPTIONS = [
  { value: "any", label: "Semua harga" },
  { value: "under500", label: "Di bawah Rp 500.000" },
  { value: "500-1000", label: "Rp 500.000 - Rp 1.000.000" },
  { value: "over1000", label: "Di atas Rp 1.000.000" },
] as const;

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "latest", label: "Terbaru" },
  { value: "price_asc", label: "Harga termurah" },
  { value: "price_desc", label: "Harga termahal" },
];

const EMPTY_FORM = {
  title: "",
  category_id: "",
  condition: "good",
  price: "",
  description: "",
};

const CONDITION_META: Record<string, { label: string; badgeClass: string }> = {
  new: {
    label: "Baru",
    badgeClass: "bg-[#E4F2EA] text-[#1E603E]",
  },
  "like-new": {
    label: "Seperti baru",
    badgeClass: "bg-[#E4F2EA] text-[#1E603E]",
  },
  good: {
    label: "Layak pakai",
    badgeClass: "bg-[#F4F1EE] text-[#57534E]",
  },
  fair: {
    label: "Perlu perbaikan",
    badgeClass: "bg-[#FDF6EB] text-[#7C4A12]",
  },
};

const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

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

type FilterMenuKey = "price" | "condition" | "sort" | "category-mobile" | "category-overflow";

function priceRangeParams(
  priceFilter: string,
  customMinPrice: string,
  customMaxPrice: string
): {
  minPrice?: string;
  maxPrice?: string;
} {
  switch (priceFilter) {
    case "under500":
      return { maxPrice: "499999" };
    case "500-1000":
      return { minPrice: "500000", maxPrice: "1000000" };
    case "over1000":
      return { minPrice: "1000001" };
    case "custom": {
      const result: { minPrice?: string; maxPrice?: string } = {};
      if (customMinPrice !== "") result.minPrice = customMinPrice;
      if (customMaxPrice !== "") result.maxPrice = customMaxPrice;
      return result;
    }
    default:
      return {};
  }
}

function formatPriceFilterLabel(
  priceFilter: string,
  customMinPrice: string,
  customMaxPrice: string
): string {
  if (priceFilter === "custom") {
    const hasMin = customMinPrice !== "";
    const hasMax = customMaxPrice !== "";
    if (hasMin && hasMax) {
      return `${formatRupiah(customMinPrice)} - ${formatRupiah(customMaxPrice)}`;
    }
    if (hasMin) return `Mulai ${formatRupiah(customMinPrice)}`;
    if (hasMax) return `Maks. ${formatRupiah(customMaxPrice)}`;
  }
  return PRICE_RANGE_OPTIONS.find((p) => p.value === priceFilter)?.label ?? "Semua harga";
}

function ChevronDownIcon({ rotated }: { rotated: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 text-[#6E6A66] transition-transform duration-150 ${
        rotated ? "rotate-180" : ""
      }`}
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M3.5 8.5L6.5 11.5L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FilterDropdown({
  id,
  label,
  value,
  displayLabel,
  isOpen,
  onToggle,
  onSelect,
  options,
  className,
}: {
  id: string;
  label: string;
  value: string;
  displayLabel: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[13px] font-medium text-[#57534E]">
        {label}
      </label>
      <div className="relative mt-1.5">
        <button
          id={id}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={onToggle}
          className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-left text-[14px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] ${
            isOpen
              ? "border-[#141416] bg-white text-[#141416] shadow-[0_0_0_3px_rgba(20,20,22,0.06)]"
              : "border-[#E5E0DA] bg-[#F6F4F1] text-[#141416] hover:border-[#CFC8BF]"
          }`}
        >
          <span className="truncate font-medium">{displayLabel}</span>
          <ChevronDownIcon rotated={isOpen} />
        </button>

        {isOpen && (
          <div
            role="listbox"
            aria-label={label}
            className="absolute left-0 top-[calc(100%+8px)] z-30 w-full min-w-[210px] rounded-2xl border border-[#E5E0DA] bg-white p-1.5 shadow-[0_18px_36px_-18px_rgba(20,20,22,0.18)]"
          >
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {options.map((opt) => {
                const selected = value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => onSelect(opt.value)}
                    className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl px-3.5 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] ${
                      selected
                        ? "bg-[#141416] font-semibold text-white"
                        : "font-medium text-[#141416] hover:bg-[#F4F1EE]"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {selected && <CheckIcon />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
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
    <span
      aria-hidden="true"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#141416] text-[13px] font-semibold text-white"
    >
      {initials}
    </span>
  );
}

function ItemCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white">
      <div className="aspect-[4/3] animate-pulse bg-[#EFECE8]" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="h-6 w-24 animate-pulse rounded-md bg-[#F4F1EE]" />
          <div className="h-6 w-20 animate-pulse rounded-md bg-[#F4F1EE]" />
        </div>
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const createRequested = searchParams.get("action") === "create";
  const urlSearchQuery = (searchParams.get("q") ?? "").trim();

  const [items, setItems] = useState<ApiMarketplaceItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [rangeEnd, setRangeEnd] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [openMenu, setOpenMenu] = useState<FilterMenuKey | null>(null);
  const [priceFilter, setPriceFilter] = useState("any");
  const [customMinPrice, setCustomMinPrice] = useState("");
  const [customMaxPrice, setCustomMaxPrice] = useState("");
  const [draftMinPrice, setDraftMinPrice] = useState("");
  const [draftMaxPrice, setDraftMaxPrice] = useState("");
  const [customPriceError, setCustomPriceError] = useState<string | null>(null);
  const [conditionFilter, setConditionFilter] = useState("any");
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [searchDraft, setSearchDraft] = useState({ base: urlSearchQuery, value: urlSearchQuery });
  const searchInput = searchDraft.base === urlSearchQuery ? searchDraft.value : urlSearchQuery;
  const [reloadNonce, setReloadNonce] = useState(0);

  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [togglingFavoriteIds, setTogglingFavoriteIds] = useState<Set<number>>(new Set());
  const [feedbackNotice, setFeedbackNotice] = useState<{
    tone: "success" | "error" | "info";
    text: string;
    href?: string;
    hrefLabel?: string;
  } | null>(null);

  const [isModalManuallyOpen, setIsModalManuallyOpen] = useState(false);
  const isModalOpen = isModalManuallyOpen || createRequested;
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState<{ id: number; url: string; file: File }[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [backendCategories, setBackendCategories] = useState<PublicCategory[]>([]);
  const [currentUser] = useState(() => getUser());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const photoIdRef = useRef(0);
  const photosRef = useRef(photos);
  const catalogSectionRef = useRef<HTMLElement | null>(null);
  const filterBarRef = useRef<HTMLElement | null>(null);
  const createTriggerRef = useRef<HTMLButtonElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const wasModalOpenRef = useRef(false);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, []);

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
    if (!getToken()) return;
    let active = true;
    fetchFavorites()
      .then((entries) => {
        if (!active) return;
        const ids = new Set<number>();
        for (const entry of entries) {
          if (entry.type === "marketplace" && typeof entry.item?.id === "number") {
            ids.add(entry.item.id);
          }
        }
        setFavoriteIds(ids);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (activeCategoryId !== null) params.set("category_id", String(activeCategoryId));
    if (conditionFilter !== "any") params.set("condition", conditionFilter);
    const { minPrice, maxPrice } = priceRangeParams(priceFilter, customMinPrice, customMaxPrice);
    if (minPrice) params.set("min_price", minPrice);
    if (maxPrice) params.set("max_price", maxPrice);
    if (sortBy !== "latest") params.set("sort", sortBy);
    if (urlSearchQuery !== "") params.set("q", urlSearchQuery);

    apiFetch<MarketplaceListResponse>(`/v1/marketplace?${params.toString()}`)
      .then((res) => {
        if (cancelled) return;
        setItems(res.data.data);
        setPage(res.data.current_page);
        setLastPage(res.data.last_page);
        setTotal(res.data.total);
        setRangeStart(res.data.from ?? (res.data.data.length > 0 ? 1 : null));
        setRangeEnd(res.data.to ?? (res.data.data.length > 0 ? res.data.data.length : null));
        setError(null);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setRangeStart(null);
        setRangeEnd(null);
        setError("Gagal memuat daftar barang. Periksa koneksi backend lalu muat ulang.");
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    page,
    activeCategoryId,
    conditionFilter,
    priceFilter,
    customMinPrice,
    customMaxPrice,
    sortBy,
    urlSearchQuery,
    reloadNonce,
  ]);

  const applySearchToUrl = useCallback(
    (rawValue: string) => {
      const trimmed = rawValue.trim();
      if (trimmed === urlSearchQuery) return;
      setIsLoading(true);
      setPage(1);
      const next = trimmed ? `/marketplace?q=${encodeURIComponent(trimmed)}` : "/marketplace";
      router.replace(next, { scroll: false });
    },
    [router, urlSearchQuery]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      applySearchToUrl(searchInput);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [searchInput, applySearchToUrl]);

  const clearCreateParam = useCallback(() => {
    if (searchParams.get("action") === "create") {
      const next = urlSearchQuery
        ? `/marketplace?q=${encodeURIComponent(urlSearchQuery)}`
        : "/marketplace";
      router.replace(next, { scroll: false });
    }
  }, [router, searchParams, urlSearchQuery]);

  const openModal = useCallback(() => {
    setSubmitError(null);
    setPhotoError(null);
    setIsModalManuallyOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (isSubmitting) return;
    setIsModalManuallyOpen(false);
    setSubmitError(null);
    setPhotoError(null);
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
    clearCreateParam();
  }, [isSubmitting, clearCreateParam]);

  useEffect(() => {
    if (!isModalOpen) {
      if (wasModalOpenRef.current) {
        wasModalOpenRef.current = false;
        createTriggerRef.current?.focus();
      }
      return;
    }

    wasModalOpenRef.current = true;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const rafId = window.requestAnimationFrame(() => {
      titleInputRef.current?.focus();
    });

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(rafId);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen, closeModal]);

  useEffect(() => {
    if (!openMenu) return;

    function handleMouseDown(e: MouseEvent) {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenMenu(null);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenu]);

  const categoryOptions = useMemo(() => {
    const raw =
      backendCategories.length > 0
        ? backendCategories.map((c) => ({ id: c.id, name: c.name }))
        : (() => {
            const byId = new Map<number, string>();
            for (const item of items) {
              if (item.category?.id && item.category?.name) {
                byId.set(item.category.id, item.category.name);
              }
            }
            return [...byId.entries()].map(([id, name]) => ({ id, name }));
          })();

    return [...raw].sort((a, b) => {
      const aOther = a.name.trim().toLowerCase() === "lainnya";
      const bOther = b.name.trim().toLowerCase() === "lainnya";
      if (aOther !== bOther) return aOther ? 1 : -1;
      return a.name.localeCompare(b.name, "id-ID");
    });
  }, [backendCategories, items]);

  const primaryCategories = useMemo(() => categoryOptions.slice(0, 4), [categoryOptions]);
  const overflowCategories = useMemo(() => categoryOptions.slice(4), [categoryOptions]);
  const activeOverflowCategory = useMemo(
    () => overflowCategories.find((c) => c.id === activeCategoryId) ?? null,
    [overflowCategories, activeCategoryId]
  );

  function updateForm<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPhotoError(null);

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      setPhotoError(`Maksimal ${MAX_PHOTOS} foto per iklan.`);
      return;
    }

    const accepted: { id: number; url: string; file: File }[] = [];
    let skippedType = 0;
    let skippedSize = 0;

    for (const file of Array.from(files)) {
      if (accepted.length >= remaining) break;
      if (!file.type.startsWith("image/")) {
        skippedType += 1;
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        skippedSize += 1;
        continue;
      }
      photoIdRef.current += 1;
      accepted.push({
        id: photoIdRef.current,
        url: URL.createObjectURL(file),
        file,
      });
    }

    if (skippedType > 0 || skippedSize > 0) {
      const reasons: string[] = [];
      if (skippedType > 0) reasons.push("format harus berupa gambar");
      if (skippedSize > 0) reasons.push("ukuran maksimal 5 MB per foto");
      setPhotoError(`Sebagian file dilewati (${reasons.join(", ")}).`);
    }

    if (accepted.length > 0) {
      setPhotos((prev) => [...prev, ...accepted].slice(0, MAX_PHOTOS));
    }
  }

  function removePhoto(id: number) {
    setPhotoError(null);
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  }

  async function handleToggleFavorite(item: ApiMarketplaceItem) {
    if (!getToken()) {
      setFeedbackNotice({
        tone: "info",
        text: "Masuk dengan akun mahasiswa UPN untuk menyimpan barang ke daftar favorit.",
        href: "/login",
        hrefLabel: "Masuk sekarang",
      });
      return;
    }

    if (togglingFavoriteIds.has(item.id)) return;
    const wasFavorited = favoriteIds.has(item.id);

    setTogglingFavoriteIds((prev) => new Set(prev).add(item.id));
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (wasFavorited) next.delete(item.id);
      else next.add(item.id);
      return next;
    });

    try {
      const favorited = await toggleFavorite("marketplace", item.id);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (favorited) next.add(item.id);
        else next.delete(item.id);
        return next;
      });
      setFeedbackNotice({
        tone: "success",
        text: favorited
          ? `"${item.title}" disimpan ke daftar favorit.`
          : `"${item.title}" dihapus dari daftar favorit.`,
        href: favorited ? "/favorites" : undefined,
        hrefLabel: favorited ? "Lihat favorit" : undefined,
      });
    } catch {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorited) next.add(item.id);
        else next.delete(item.id);
        return next;
      });
      setFeedbackNotice({
        tone: "error",
        text: "Gagal memperbarui daftar favorit. Periksa koneksi lalu coba lagi.",
      });
    } finally {
      setTogglingFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const categoryId = Number(formData.category_id);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      setSubmitError("Pilih kategori barang yang tersedia terlebih dahulu.");
      return;
    }
    const parsedPrice = Number(formData.price);
    if (formData.price.trim() === "" || Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setSubmitError("Masukkan nominal harga yang valid (minimal Rp 0).");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const uploaded =
        photos.length > 0
          ? await Promise.all(photos.map((p) => uploadMedia(p.file, "marketplace")))
          : [];
      const created = await apiFetch<MarketplaceCreateResponse>("/v1/marketplace", {
        method: "POST",
        body: JSON.stringify({
          title: formData.title.trim(),
          category_id: categoryId,
          condition: formData.condition,
          price: parsedPrice,
          description: formData.description.trim(),
          image_paths: uploaded.map((u) => u.path),
        }),
      });
      setIsModalManuallyOpen(false);
      setFormData(EMPTY_FORM);
      setPhotoError(null);
      setPhotos((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.url));
        return [];
      });
      clearCreateParam();
      setIsLoading(true);
      setPage(1);
      setReloadNonce((n) => n + 1);
      setFeedbackNotice({
        tone: "success",
        text: `Iklan "${created.data.title}" berhasil diterbitkan di Marketplace.`,
        href: `/marketplace/${created.data.id}`,
        hrefLabel: "Buka halaman iklan",
      });
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

  function handlePageChange(nextPage: number) {
    setIsLoading(true);
    setPage(nextPage);
    if (typeof window !== "undefined") {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      catalogSectionRef.current?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
      });
    }
  }

  const activeCategoryName =
    activeCategoryId !== null
      ? (categoryOptions.find((c) => c.id === activeCategoryId)?.name ?? null)
      : null;
  const activePriceLabel =
    priceFilter !== "any"
      ? formatPriceFilterLabel(priceFilter, customMinPrice, customMaxPrice)
      : null;
  const activeConditionLabel =
    conditionFilter !== "any"
      ? (CONDITION_META[conditionFilter]?.label ?? conditionFilter)
      : null;
  const activeSortLabel = SORT_OPTIONS.find((s) => s.value === sortBy)?.label ?? "Terbaru";

  const hasActiveFilter =
    activeCategoryId !== null ||
    priceFilter !== "any" ||
    conditionFilter !== "any" ||
    urlSearchQuery !== "";

  function toggleFilterMenu(key: FilterMenuKey) {
    if (key === "price" && openMenu !== "price") {
      setDraftMinPrice(customMinPrice);
      setDraftMaxPrice(customMaxPrice);
      setCustomPriceError(null);
    }
    setOpenMenu((prev) => (prev === key ? null : key));
  }

  function applyPresetPriceRange(value: string) {
    setPriceFilter(value);
    setCustomMinPrice("");
    setCustomMaxPrice("");
    setDraftMinPrice("");
    setDraftMaxPrice("");
    setCustomPriceError(null);
    setOpenMenu(null);
    setPage(1);
  }

  function applyCustomPriceRange() {
    const minStr = draftMinPrice.trim();
    const maxStr = draftMaxPrice.trim();
    if (minStr === "" && maxStr === "") {
      setCustomPriceError("Isi harga minimal atau maksimal terlebih dahulu.");
      return;
    }

    const minNum = minStr === "" ? null : Number(minStr);
    const maxNum = maxStr === "" ? null : Number(maxStr);
    if ((minNum !== null && (Number.isNaN(minNum) || minNum < 0)) || (maxNum !== null && (Number.isNaN(maxNum) || maxNum < 0))) {
      setCustomPriceError("Masukkan nominal angka minimal Rp 0.");
      return;
    }
    if (minNum !== null && maxNum !== null && minNum > maxNum) {
      setCustomPriceError("Harga minimal tidak boleh melebihi maksimal.");
      return;
    }

    setCustomMinPrice(minStr);
    setCustomMaxPrice(maxStr);
    setPriceFilter("custom");
    setCustomPriceError(null);
    setOpenMenu(null);
    setPage(1);
  }

  function resetFilters() {
    setIsLoading(true);
    setOpenMenu(null);
    setActiveCategoryId(null);
    setPriceFilter("any");
    setCustomMinPrice("");
    setCustomMaxPrice("");
    setDraftMinPrice("");
    setDraftMaxPrice("");
    setCustomPriceError(null);
    setConditionFilter("any");
    setSortBy("latest");
    setSearchDraft({ base: "", value: "" });
    setPage(1);
    if (urlSearchQuery !== "") {
      router.replace("/marketplace", { scroll: false });
    }
  }

  const previewCategoryName =
    categoryOptions.find((c) => String(c.id) === formData.category_id)?.name ?? "Kategori";
  const previewSellerName = currentUser?.profile?.name || currentUser?.name || "Mahasiswa UPN";
  const previewSellerFaculty = currentUser?.profile?.faculty || "UPN Veteran Jatim";
  const parsedPreviewPrice = Number(formData.price);
  const hasValidPreviewPrice =
    formData.price.trim() !== "" && !Number.isNaN(parsedPreviewPrice) && parsedPreviewPrice >= 0;
  const previewCondition = CONDITION_META[formData.condition] ?? CONDITION_META.good;

  return (
    <div className="auth-shell-enter mx-auto max-w-[1200px] space-y-6">
      {/* Header Band */}
      <section className="flex flex-col justify-between gap-5 border-b border-[#E5E0DA] pb-6 lg:flex-row lg:items-end">
        <div className="space-y-2">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-[#6E6A66]"
          >
            <Link
              href="/dashboard"
              className="transition-colors hover:text-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] rounded"
            >
              Portal Mahasiswa
            </Link>
            <span aria-hidden="true" className="text-[#CFC8BF]">
              /
            </span>
            <span className="text-[#141416]">Marketplace</span>
            <span aria-hidden="true" className="text-[#CFC8BF]">
              ·
            </span>
            <span>{isLoading ? "Memuat katalog..." : `${total} barang aktif`}</span>
          </nav>

          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[#141416] sm:text-[32px] sm:leading-[1.18]">
            Marketplace kampus.{" "}
            <span className="font-normal text-[#6E6A66]">
              Jual beli buku kuliah, alat praktikum, dan kebutuhan mahasiswa.
            </span>
          </h1>
        </div>

        <button
          ref={createTriggerRef}
          type="button"
          onClick={openModal}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          Pasang iklan barang
        </button>
      </section>

      {/* Inline Action Feedback Banner */}
      {feedbackNotice && (
        <div
          role={feedbackNotice.tone === "error" ? "alert" : "status"}
          className={`flex flex-wrap items-center justify-between gap-3 rounded-[20px] border px-5 py-3.5 text-[14px] font-medium ${
            feedbackNotice.tone === "success"
              ? "border-[#CBE5D5] bg-[#E4F2EA] text-[#1E603E]"
              : feedbackNotice.tone === "error"
                ? "border-[#F1C9C9] bg-[#FDF2F2] text-[#B83232]"
                : "border-[#E5E0DA] bg-white text-[#141416]"
          }`}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{feedbackNotice.text}</span>
            {feedbackNotice.href && feedbackNotice.hrefLabel && (
              <Link
                href={feedbackNotice.href}
                className="underline underline-offset-4 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] rounded"
              >
                {feedbackNotice.hrefLabel}
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            aria-label="Tutup pemberitahuan"
            className="inline-flex h-11 min-w-[44px] items-center justify-center rounded-full px-3 text-[13px] font-semibold transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Search, Category & Filter Panel */}
      <section
        ref={filterBarRef}
        aria-label="Pencarian dan filter katalog marketplace"
        className="rounded-[20px] border border-[#E5E0DA] bg-white p-5 sm:p-6"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Inline Search */}
          <form
            role="search"
            className="sm:col-span-2 lg:col-span-1"
            onSubmit={(e) => {
              e.preventDefault();
              applySearchToUrl(searchInput);
            }}
          >
            <label htmlFor="marketplace-search" className="block text-[13px] font-medium text-[#57534E]">
              Cari barang
            </label>
            <div className="relative mt-1.5">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E6A66]"
              >
                <circle cx="7.25" cy="7.25" r="4.75" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                id="marketplace-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchDraft({ base: urlSearchQuery, value: e.target.value })}
                placeholder="Cari judul atau deskripsi barang"
                className="h-11 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] pl-10 pr-11 text-[14px] text-[#141416] placeholder:text-[#66625E] transition-all duration-150 hover:border-[#CFC8BF] focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none"
              />
              {searchInput !== "" && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchDraft({ base: "", value: "" });
                    applySearchToUrl("");
                  }}
                  aria-label="Hapus kata kunci pencarian"
                  className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-[#57534E] transition-colors hover:text-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                >
                  ×
                </button>
              )}
            </div>
          </form>

          {/* Custom Price Range Dropdown (Presets + Custom Min/Max) */}
          <div>
            <label htmlFor="price-range" className="block text-[13px] font-medium text-[#57534E]">
              Rentang harga
            </label>
            <div className="relative mt-1.5">
              <button
                id="price-range"
                type="button"
                aria-haspopup="dialog"
                aria-expanded={openMenu === "price"}
                onClick={() => toggleFilterMenu("price")}
                className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-left text-[14px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] ${
                  openMenu === "price"
                    ? "border-[#141416] bg-white text-[#141416] shadow-[0_0_0_3px_rgba(20,20,22,0.06)]"
                    : "border-[#E5E0DA] bg-[#F6F4F1] text-[#141416] hover:border-[#CFC8BF]"
                }`}
              >
                <span className="truncate font-medium">
                  {formatPriceFilterLabel(priceFilter, customMinPrice, customMaxPrice)}
                </span>
                <ChevronDownIcon rotated={openMenu === "price"} />
              </button>

              {openMenu === "price" && (
                <div
                  role="dialog"
                  aria-label="Pilih atau atur rentang harga"
                  className="absolute left-0 top-[calc(100%+8px)] z-30 w-full min-w-[280px] sm:w-[320px] rounded-2xl border border-[#E5E0DA] bg-white p-2.5 shadow-[0_18px_36px_-18px_rgba(20,20,22,0.18)]"
                >
                  <div className="space-y-1" role="listbox" aria-label="Pilihan rentang harga cepat">
                    {PRICE_RANGE_OPTIONS.map((opt) => {
                      const selected = priceFilter === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => applyPresetPriceRange(opt.value)}
                          className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl px-3.5 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] ${
                            selected
                              ? "bg-[#141416] font-semibold text-white"
                              : "font-medium text-[#141416] hover:bg-[#F4F1EE]"
                          }`}
                        >
                          <span className="truncate">{opt.label}</span>
                          {selected && <CheckIcon />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2.5 border-t border-[#F1EDE8] px-1 pt-3">
                    <p className="text-[13px] font-semibold text-[#141416]">
                      Rentang harga khusus
                    </p>
                    <div
                      className="mt-2 grid grid-cols-2 gap-2"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          applyCustomPriceRange();
                        }
                      }}
                    >
                      <div>
                        <label htmlFor="custom-min-price" className="sr-only">
                          Harga minimal (Rp)
                        </label>
                        <div className="flex h-11 items-center gap-1.5 rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-2.5 transition-all focus-within:border-[#141416] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(20,20,22,0.06)]">
                          <span className="text-[13px] font-semibold text-[#57534E]">Rp</span>
                          <input
                            id="custom-min-price"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={draftMinPrice}
                            onChange={(e) => {
                              setDraftMinPrice(e.target.value);
                              setCustomPriceError(null);
                            }}
                            placeholder="Minimal"
                            className="w-full min-w-0 bg-transparent text-[13px] font-medium text-[#141416] placeholder:font-normal placeholder:text-[#66625E] focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="custom-max-price" className="sr-only">
                          Harga maksimal (Rp)
                        </label>
                        <div className="flex h-11 items-center gap-1.5 rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-2.5 transition-all focus-within:border-[#141416] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(20,20,22,0.06)]">
                          <span className="text-[13px] font-semibold text-[#57534E]">Rp</span>
                          <input
                            id="custom-max-price"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={draftMaxPrice}
                            onChange={(e) => {
                              setDraftMaxPrice(e.target.value);
                              setCustomPriceError(null);
                            }}
                            placeholder="Maksimal"
                            className="w-full min-w-0 bg-transparent text-[13px] font-medium text-[#141416] placeholder:font-normal placeholder:text-[#66625E] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {customPriceError && (
                      <p role="alert" className="mt-2 text-[13px] font-medium text-[#B83232]">
                        {customPriceError}
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-end gap-2">
                      {(priceFilter !== "any" || draftMinPrice !== "" || draftMaxPrice !== "") && (
                        <button
                          type="button"
                          onClick={() => applyPresetPriceRange("any")}
                          className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-4 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                        >
                          Reset
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={applyCustomPriceRange}
                        className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-[#141416] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#242428] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                      >
                        Terapkan
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Custom Condition Dropdown */}
          <FilterDropdown
            id="condition"
            label="Kondisi barang"
            value={conditionFilter}
            displayLabel={activeConditionLabel ?? "Semua kondisi"}
            isOpen={openMenu === "condition"}
            onToggle={() => toggleFilterMenu("condition")}
            onSelect={(nextVal) => {
              setConditionFilter(nextVal);
              setOpenMenu(null);
              setPage(1);
            }}
            options={[
              { value: "any", label: "Semua kondisi" },
              ...CONDITION_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label })),
            ]}
          />

          {/* Custom Sort Dropdown */}
          <FilterDropdown
            id="marketplace-sort"
            label="Urutkan"
            value={sortBy}
            displayLabel={activeSortLabel}
            isOpen={openMenu === "sort"}
            onToggle={() => toggleFilterMenu("sort")}
            onSelect={(nextVal) => {
              setSortBy(nextVal as SortOption);
              setOpenMenu(null);
              setPage(1);
            }}
            options={SORT_OPTIONS}
          />

          {/* Mobile / Tablet Custom Category Dropdown */}
          <FilterDropdown
            id="marketplace-category-mobile"
            label="Kategori barang"
            className="lg:hidden"
            value={activeCategoryId === null ? "" : String(activeCategoryId)}
            displayLabel={activeCategoryName ?? "Semua kategori"}
            isOpen={openMenu === "category-mobile"}
            onToggle={() => toggleFilterMenu("category-mobile")}
            onSelect={(nextVal) => {
              setActiveCategoryId(nextVal === "" ? null : Number(nextVal));
              setOpenMenu(null);
              setPage(1);
            }}
            options={[
              { value: "", label: "Semua kategori" },
              ...categoryOptions.map((cat) => ({ value: String(cat.id), label: cat.name })),
            ]}
          />
        </div>

        {/* Editorial Single-Row Category Tabs (Desktop) */}
        <div
          className="mt-5 hidden items-center border-t border-[#F1EDE8] pt-2 lg:flex"
          role="group"
          aria-label="Filter berdasarkan kategori"
        >
          <div className="flex flex-1 items-center gap-6 border-b border-[#F1EDE8]">
            <button
              type="button"
              onClick={() => {
                setActiveCategoryId(null);
                setOpenMenu(null);
                setPage(1);
              }}
              aria-pressed={activeCategoryId === null}
              className={`-mb-px inline-flex min-h-[44px] items-center whitespace-nowrap border-b-2 px-0.5 text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 rounded-t ${
                activeCategoryId === null
                  ? "border-[#141416] font-semibold text-[#141416]"
                  : "border-transparent font-medium text-[#57534E] hover:border-[#CFC8BF] hover:text-[#141416]"
              }`}
            >
              Semua kategori
            </button>

            {primaryCategories.map((cat) => {
              const isActive = activeCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveCategoryId(cat.id);
                    setOpenMenu(null);
                    setPage(1);
                  }}
                  aria-pressed={isActive}
                  className={`-mb-px inline-flex min-h-[44px] items-center whitespace-nowrap border-b-2 px-0.5 text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 rounded-t ${
                    isActive
                      ? "border-[#141416] font-semibold text-[#141416]"
                      : "border-transparent font-medium text-[#57534E] hover:border-[#CFC8BF] hover:text-[#141416]"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}

            {overflowCategories.length > 0 && (
              <div className="relative -mb-px">
                <button
                  type="button"
                  onClick={() => toggleFilterMenu("category-overflow")}
                  aria-expanded={openMenu === "category-overflow"}
                  aria-haspopup="menu"
                  className={`inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap border-b-2 px-0.5 text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 rounded-t ${
                    activeOverflowCategory !== null || openMenu === "category-overflow"
                      ? "border-[#141416] font-semibold text-[#141416]"
                      : "border-transparent font-medium text-[#57534E] hover:border-[#CFC8BF] hover:text-[#141416]"
                  }`}
                >
                  <span>
                    {activeOverflowCategory
                      ? activeOverflowCategory.name
                      : `Kategori lain (${overflowCategories.length})`}
                  </span>
                  <ChevronDownIcon rotated={openMenu === "category-overflow"} />
                </button>

                {openMenu === "category-overflow" && (
                  <div
                    role="menu"
                    aria-label="Kategori marketplace lainnya"
                    className="absolute left-0 top-[calc(100%+8px)] z-30 w-72 rounded-2xl border border-[#E5E0DA] bg-white p-2 shadow-[0_18px_36px_-18px_rgba(20,20,22,0.18)]"
                  >
                    <div className="max-h-72 space-y-1 overflow-y-auto">
                      {overflowCategories.map((cat) => {
                        const isActive = activeCategoryId === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            role="menuitemradio"
                            aria-checked={isActive}
                            onClick={() => {
                              setActiveCategoryId(cat.id);
                              setOpenMenu(null);
                              setPage(1);
                            }}
                            className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl px-3.5 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] ${
                              isActive
                                ? "bg-[#141416] font-semibold text-white"
                                : "font-medium text-[#141416] hover:bg-[#F4F1EE]"
                            }`}
                          >
                            <span className="truncate">{cat.name}</span>
                            {isActive && <CheckIcon />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Catalog Summary & Active Filter Chips */}
      <section ref={catalogSectionRef} aria-label="Daftar barang marketplace" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] text-[#57534E]">
            {isLoading ? (
              "Memuat katalog barang..."
            ) : total === 0 ? (
              "0 barang ditemukan"
            ) : rangeStart !== null && rangeEnd !== null ? (
              <>
                Menampilkan{" "}
                <strong className="font-semibold text-[#141416]">
                  {rangeStart}-{rangeEnd}
                </strong>{" "}
                dari <strong className="font-semibold text-[#141416]">{total}</strong> barang
              </>
            ) : (
              <>
                <strong className="font-semibold text-[#141416]">{total}</strong> barang aktif
              </>
            )}
          </p>

          {hasActiveFilter && (
            <div className="flex flex-wrap items-center gap-2">
              {urlSearchQuery !== "" && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchDraft({ base: "", value: "" });
                    applySearchToUrl("");
                  }}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D9D2C9] bg-white px-3.5 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                >
                  <span>Cari: &ldquo;{urlSearchQuery}&rdquo;</span>
                  <span aria-hidden="true">×</span>
                </button>
              )}
              {activeCategoryName && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategoryId(null);
                    setPage(1);
                  }}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D9D2C9] bg-white px-3.5 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                >
                  <span>Kategori: {activeCategoryName}</span>
                  <span aria-hidden="true">×</span>
                </button>
              )}
              {activePriceLabel && (
                <button
                  type="button"
                  onClick={() => applyPresetPriceRange("any")}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D9D2C9] bg-white px-3.5 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                >
                  <span>{activePriceLabel}</span>
                  <span aria-hidden="true">×</span>
                </button>
              )}
              {activeConditionLabel && (
                <button
                  type="button"
                  onClick={() => {
                    setConditionFilter("any");
                    setPage(1);
                  }}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D9D2C9] bg-white px-3.5 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                >
                  <span>Kondisi: {activeConditionLabel}</span>
                  <span aria-hidden="true">×</span>
                </button>
              )}
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full px-3 text-[13px] font-semibold text-[#57534E] underline underline-offset-4 transition-colors hover:text-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
              >
                Atur ulang semua
              </button>
            </div>
          )}
        </div>

        {/* Catalog Grid States */}
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
            <span className="sr-only">Memuat data marketplace...</span>
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
              onClick={() => {
                setIsLoading(true);
                setError(null);
                setReloadNonce((n) => n + 1);
              }}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
            >
              Muat ulang daftar
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[20px] border border-[#E5E0DA] bg-white px-6 py-14 text-center">
            <h2 className="font-display text-lg font-semibold text-[#141416]">
              {hasActiveFilter ? "Tidak ada barang sesuai filter" : "Belum ada barang dipublikasikan"}
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-[14px] text-[#6E6A66]">
              {hasActiveFilter
                ? "Ubah kategori, rentang harga, kondisi, atau kata kunci untuk melihat barang lain."
                : "Pasang iklan pertama untuk menawarkan buku kuliah atau perlengkapan ke mahasiswa UPN."}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-6 text-[14px] font-medium text-[#141416] transition-all duration-150 hover:-translate-y-[1px] hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                >
                  Atur ulang filter
                </button>
              )}
              <button
                type="button"
                onClick={openModal}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
              >
                Pasang iklan barang
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, idx) => {
              const categoryName = item.category?.name ?? "Lainnya";
              const sellerName = item.user?.name ?? "Mahasiswa UPN";
              const conditionInfo = CONDITION_META[item.condition] ?? {
                label: item.condition,
                badgeClass: "bg-[#F4F1EE] text-[#57534E]",
              };
              const isFavorited = favoriteIds.has(item.id);
              const isTogglingFavorite = togglingFavoriteIds.has(item.id);
              const photoCount = item.images?.length ?? 0;

              return (
                <article
                  key={item.id}
                  className="group relative flex flex-col overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white transition-all duration-180 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[2px] hover:border-[#CFC8BF] hover:shadow-[0_14px_28px_-14px_rgba(20,20,22,0.10)] focus-within:ring-2 focus-within:ring-[#141416]"
                >
                  {/* Media Frame */}
                  <div className="relative overflow-hidden bg-[#EFECE8]">
                    <ListingImage
                      module="marketplace"
                      seed={item.id}
                      eager={idx < 3}
                      hint={`${categoryName} ${item.title}`}
                      images={item.images}
                      alt={`Foto ${item.title}`}
                      className="aspect-[4/3] w-full object-cover transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:scale-[1.03]"
                    />

                    {/* Quick Favorite Button (44px touch target, matte high-contrast surface) */}
                    <button
                      type="button"
                      onClick={() => void handleToggleFavorite(item)}
                      disabled={isTogglingFavorite}
                      aria-pressed={isFavorited}
                      aria-label={
                        isFavorited
                          ? `Hapus ${item.title} dari favorit`
                          : `Simpan ${item.title} ke favorit`
                      }
                      className={`absolute right-2.5 top-2.5 z-10 flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 disabled:opacity-60 ${
                        isFavorited
                          ? "border-[#141416] bg-[#141416] text-white"
                          : "border-[#E5E0DA] bg-white text-[#141416] hover:border-[#141416]"
                      }`}
                    >
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 20 20"
                        fill={isFavorited ? "currentColor" : "none"}
                        aria-hidden="true"
                      >
                        <path
                          d="M10 17.2l-1.15-1.05C4.7 12.4 2 9.95 2 6.95 2 4.5 3.92 2.6 6.35 2.6c1.38 0 2.7.65 3.65 1.66A4.9 4.9 0 0 1 13.65 2.6C16.08 2.6 18 4.5 18 6.95c0 3-2.7 5.45-6.85 9.2L10 17.2Z"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {photoCount > 1 && (
                      <span className="pointer-events-none absolute bottom-2.5 right-2.5 rounded-md bg-[#141416]/85 px-2.5 py-1 text-[13px] font-medium text-white">
                        {photoCount} foto
                      </span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-md bg-[#F4F1EE] px-2.5 py-1 text-[13px] font-medium text-[#57534E]">
                        {categoryName}
                      </span>
                      {conditionInfo.label && (
                        <span
                          className={`rounded-md px-2.5 py-1 text-[13px] font-medium ${conditionInfo.badgeClass}`}
                        >
                          {conditionInfo.label}
                        </span>
                      )}
                    </div>

                    <h2 className="mt-3 line-clamp-2 font-display text-[16px] font-semibold leading-snug text-[#141416]">
                      <Link
                        href={`/marketplace/${item.id}`}
                        className="after:absolute after:inset-0 hover:underline focus:outline-none"
                      >
                        {item.title}
                      </Link>
                    </h2>

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
                        {item.user?.is_official_account && (
                          <VerifiedBadge
                            size="xs"
                            title="Akun resmi terverifikasi UPN"
                          />
                        )}
                      </span>
                      <span className="shrink-0 text-[13px] text-[#6E6A66]">
                        {formatTimeAgo(item.created_at)}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Pagination */}
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
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#E5E0DA] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={page >= lastPage}
                onClick={() => handlePageChange(Math.min(lastPage, page + 1))}
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#E5E0DA] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          </nav>
        )}
      </section>

      {/* Matte Modal Pasang Iklan */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#141416]/50 p-4"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pasang-iklan-title"
            onClick={(e) => e.stopPropagation()}
            className="auth-shell-enter max-h-[92vh] w-full max-w-[940px] overflow-y-auto rounded-[28px] border border-[#E5E0DA] bg-[#F4F1EE] p-5 shadow-[0_20px_48px_-20px_rgba(20,20,22,0.20)] sm:p-7"
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
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5E0DA] bg-white text-lg text-[#57534E] transition-colors hover:border-[#141416] hover:text-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5">
              <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.45fr_0.85fr]">
                {/* Form Card */}
                <div className="space-y-4 rounded-[20px] border border-[#E5E0DA] bg-white p-5 sm:p-6">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="iklan-title"
                        className="block text-[14px] font-medium text-[#141416]"
                      >
                        Judul barang <span className="text-[#B83232]">*</span>
                      </label>
                      <span className="text-[13px] text-[#6E6A66]">
                        {formData.title.length}/255
                      </span>
                    </div>
                    <input
                      ref={titleInputRef}
                      id="iklan-title"
                      type="text"
                      required
                      maxLength={255}
                      value={formData.title}
                      onChange={(e) => updateForm("title", e.target.value)}
                      placeholder="Nama barang yang ditawarkan"
                      className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 text-[14px] text-[#141416] placeholder:text-[#66625E] transition-all focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="iklan-category"
                        className="block text-[14px] font-medium text-[#141416]"
                      >
                        Kategori <span className="text-[#B83232]">*</span>
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
                        Harga (Rp) <span className="text-[#B83232]">*</span>
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
                          placeholder="Masukkan nominal harga"
                          className="w-full bg-transparent text-[14px] font-semibold text-[#141416] placeholder:font-normal placeholder:text-[#66625E] focus:outline-none"
                        />
                      </div>
                      {hasValidPreviewPrice && (
                        <p className="mt-1.5 text-[13px] text-[#6E6A66]">
                          Tampilan harga: {formatRupiah(parsedPreviewPrice)}
                        </p>
                      )}
                    </div>
                  </div>

                  <fieldset>
                    <legend className="text-[14px] font-medium text-[#141416]">
                      Kondisi barang <span className="text-[#B83232]">*</span>
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
                            className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-center text-[13px] font-medium transition-all focus-within:ring-2 focus-within:ring-[#141416] focus-within:ring-offset-1 ${
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
                      Deskripsi barang <span className="text-[#B83232]">*</span>
                    </label>
                    <textarea
                      id="iklan-description"
                      required
                      rows={4}
                      value={formData.description}
                      onChange={(e) => updateForm("description", e.target.value)}
                      placeholder="Jelaskan kondisi barang, kelengkapan, dan titik temu COD di area kampus"
                      className="mt-1.5 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] p-3.5 text-[14px] leading-relaxed text-[#141416] placeholder:text-[#66625E] transition-all focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        id="iklan-photos-label"
                        className="block text-[14px] font-medium text-[#141416]"
                      >
                        Foto barang ({photos.length}/{MAX_PHOTOS})
                      </span>
                      <span className="text-[13px] text-[#6E6A66]">
                        Foto pertama menjadi sampul
                      </span>
                    </div>
                    <div
                      className="mt-2 flex flex-wrap gap-3"
                      role="group"
                      aria-labelledby="iklan-photos-label"
                    >
                      {photos.map((photo, i) => (
                        <span key={photo.id} className="relative h-20 w-20">
                          {/* eslint-disable-next-line @next/next/no-img-element -- local object URLs for instant upload preview only */}
                          <img
                            src={photo.url}
                            alt={`Foto barang ${i + 1}`}
                            width={80}
                            height={80}
                            className="h-20 w-20 rounded-xl border border-[#E5E0DA] object-cover"
                          />
                          {i === 0 && (
                            <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-[#141416]/85 px-1.5 py-0.5 text-[11px] font-medium text-white">
                              Utama
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => removePhoto(photo.id)}
                            aria-label={`Hapus foto barang ${i + 1}`}
                            className="group absolute -right-3 -top-3 flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                          >
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#141416] text-[13px] font-bold leading-none text-white transition-colors group-hover:bg-[#B83232]">
                              ×
                            </span>
                          </button>
                        </span>
                      ))}
                      {photos.length < MAX_PHOTOS && (
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
                      )}
                    </div>
                    {photoError && (
                      <p role="alert" className="mt-2 text-[13px] font-medium text-[#B83232]">
                        {photoError}
                      </p>
                    )}
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
                      className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-60"
                    >
                      {isSubmitting ? "Menyimpan iklan..." : "Terbitkan iklan barang"}
                    </button>
                  </div>
                </div>

                {/* Live Preview Card */}
                <aside
                  aria-label="Pratinjau kartu iklan"
                  className="rounded-[20px] border border-[#E5E0DA] bg-white p-5 lg:sticky lg:top-0"
                >
                  <p className="text-[13px] font-semibold text-[#141416]">
                    Pratinjau tampilan katalog
                  </p>
                  <div className="mt-3 overflow-hidden rounded-2xl border border-[#EAE5DF] bg-white">
                    <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#EFECE8] text-[#5F5B57]">
                      {photos.length > 0 ? (
                        // eslint-disable-next-line @next/next/no-img-element -- local preview before upload
                        <img
                          src={photos[0].url}
                          alt="Pratinjau foto barang"
                          width={640}
                          height={480}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-[13px] font-medium">Belum ada foto dipilih</span>
                      )}
                      {photos.length > 1 && (
                        <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-[#141416]/85 px-2 py-0.5 text-[13px] font-medium text-white">
                          {photos.length} foto
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-md bg-[#F4F1EE] px-2.5 py-0.5 text-[13px] font-medium text-[#57534E]">
                          {previewCategoryName}
                        </span>
                        <span
                          className={`rounded-md px-2.5 py-0.5 text-[13px] font-medium ${previewCondition.badgeClass}`}
                        >
                          {previewCondition.label}
                        </span>
                      </div>
                      <p className="mt-2.5 line-clamp-2 font-display text-[15px] font-semibold text-[#141416]">
                        {formData.title.trim() || "Judul barang belum diisi"}
                      </p>
                      <p
                        className={`mt-1 font-display text-[17px] font-bold ${
                          hasValidPreviewPrice ? "text-[#141416]" : "font-medium text-[#6E6A66]"
                        }`}
                      >
                        {hasValidPreviewPrice
                          ? formatRupiah(parsedPreviewPrice)
                          : "Harga belum diisi"}
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
    <Suspense fallback={<p className="text-[14px] text-[#6E6A66]">Memuat marketplace...</p>}>
      <MarketplaceContent />
    </Suspense>
  );
}
