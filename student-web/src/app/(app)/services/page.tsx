"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
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
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_PHOTOS, UPN_FACULTIES } from "@/lib/constants";
import { formatRupiah, formatTimeAgo, initialsOf } from "@/lib/formatters";
import FilterDropdown, { CheckIcon, ChevronDownIcon } from "@/components/FilterDropdown";

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
  user?: {
    id: number;
    name: string;
    is_official_account?: boolean;
  } | null;
  category?: { id: number; name: string; slug: string } | null;
  images?: ApiImage[] | null;
};

type ServiceListResponse = {
  message: string;
  data: {
    current_page: number;
    last_page: number;
    from?: number | null;
    to?: number | null;
    total: number;
    data: ApiServiceItem[];
  };
};

type ServiceCreateResponse = {
  message: string;
  data: ApiServiceItem;
};

type SortOption = "latest" | "price_asc" | "price_desc";
type FilterMenuKey =
  | "price"
  | "pricing-type"
  | "sort"
  | "category-mobile"
  | "category-overflow"
  | "modal-category"
  | "modal-estimasi";

const EMPTY_FORM = {
  title: "",
  category_id: "",
  price_min: "",
  price_max: "",
  estimated_time: "1-2 Hari Kerja",
  whatsapp_number: "",
  description: "",
};

const TARGET_FAKULTAS_OPTIONS = UPN_FACULTIES;

const PRICING_MODELS = [
  { value: "starting_from", label: "Mulai Dari" },
  { value: "fixed", label: "Tarif Tetap" },
  { value: "per_hour", label: "Per Jam" },
  { value: "negotiable", label: "Negosiasi" },
] as const;

const PRICING_META: Record<string, { label: string; badgeClass: string }> = {
  starting_from: {
    label: "Mulai dari",
    badgeClass: "bg-[#F4F1EE] text-[#57534E]",
  },
  fixed: {
    label: "Tarif tetap",
    badgeClass: "bg-[#E4F2EA] text-[#1E603E]",
  },
  per_hour: {
    label: "Per jam",
    badgeClass: "bg-[#F4F1EE] text-[#57534E]",
  },
  negotiable: {
    label: "Negosiasi",
    badgeClass: "bg-[#FDF6EB] text-[#7C4A12]",
  },
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

const PRICE_RANGE_OPTIONS = [
  { value: "any", label: "Semua tarif" },
  { value: "under50", label: "Di bawah Rp 50.000" },
  { value: "50-150", label: "Rp 50.000 - Rp 150.000" },
  { value: "over150", label: "Di atas Rp 150.000" },
] as const;

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "latest", label: "Terbaru" },
  { value: "price_asc", label: "Tarif termurah" },
  { value: "price_desc", label: "Tarif termahal" },
];

const MAX_PHOTOS = MAX_UPLOAD_PHOTOS;
const MAX_PHOTO_BYTES = MAX_UPLOAD_BYTES;

function subscribeNoop() {
  return () => {};
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

function priceRangeParams(
  priceFilter: string,
  customMinPrice: string,
  customMaxPrice: string
): {
  minPrice?: string;
  maxPrice?: string;
} {
  switch (priceFilter) {
    case "under50":
      return { maxPrice: "49999" };
    case "50-150":
      return { minPrice: "50000", maxPrice: "150000" };
    case "over150":
      return { minPrice: "150001" };
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
  return PRICE_RANGE_OPTIONS.find((p) => p.value === priceFilter)?.label ?? "Semua tarif";
}

function ProviderAvatar({ name }: { name: string }) {
  const initials = initialsOf(name);
  return (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#141416] text-[13px] font-semibold text-white"
    >
      {initials}
    </span>
  );
}

function ServiceCardSkeleton() {
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

function ServicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createRequested = searchParams.get("action") === "create";
  const urlQuery = (searchParams.get("q") ?? "").trim();

  const [items, setItems] = useState<ApiServiceItem[]>([]);
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
  const [pricingFilter, setPricingFilter] = useState("any");
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [searchDraft, setSearchDraft] = useState({ base: urlQuery, value: urlQuery });
  const searchInput = searchDraft.base === urlQuery ? searchDraft.value : urlQuery;
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
  const isMounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [pricingType, setPricingType] = useState<string>("starting_from");
  const [paymentMethod, setPaymentMethod] = useState<string>("flexible");
  const [targetMode, setTargetMode] = useState<"all" | "custom">("all");
  const [targetFakultas, setTargetFakultas] = useState<string[]>([...TARGET_FAKULTAS_OPTIONS]);
  const [photos, setPhotos] = useState<{ id: number; url: string; file: File }[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [backendCategories, setBackendCategories] = useState<PublicCategory[]>([]);
  const [currentUser] = useState(() => getUser());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const photoIdRef = useRef(0);
  const photosRef = useRef(photos);
  const filterBarRef = useRef<HTMLElement | null>(null);
  const modalCategoryRef = useRef<HTMLDivElement | null>(null);
  const modalEstimasiRef = useRef<HTMLDivElement | null>(null);
  const catalogSectionRef = useRef<HTMLElement | null>(null);
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
    fetchPublicCategories("service", controller.signal)
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
    const controller = new AbortController();
    fetchFavorites(controller.signal)
      .then((entries) => {
        if (controller.signal.aborted) return;
        const ids = new Set<number>();
        for (const entry of entries) {
          if (entry.type === "service" && typeof entry.item?.id === "number") {
            ids.add(entry.item.id);
          }
        }
        setFavoriteIds(ids);
      })
      .catch(() => {});
    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (activeCategoryId !== null) params.set("category_id", String(activeCategoryId));
    if (pricingFilter !== "any") params.set("pricing_type", pricingFilter);
    const { minPrice, maxPrice } = priceRangeParams(priceFilter, customMinPrice, customMaxPrice);
    if (minPrice) params.set("min_price", minPrice);
    if (maxPrice) params.set("max_price", maxPrice);
    if (sortBy !== "latest") params.set("sort", sortBy);
    if (urlQuery !== "") params.set("q", urlQuery);

    apiFetch<ServiceListResponse>(`/v1/services?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (controller.signal.aborted) return;
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
        if (controller.signal.aborted) return;
        setItems([]);
        setRangeStart(null);
        setRangeEnd(null);
        setError("Gagal memuat daftar jasa. Periksa koneksi backend lalu muat ulang.");
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [
    page,
    activeCategoryId,
    pricingFilter,
    priceFilter,
    customMinPrice,
    customMaxPrice,
    sortBy,
    urlQuery,
    reloadNonce,
  ]);

  const applySearchToUrl = useCallback(
    (rawValue: string) => {
      const trimmed = rawValue.trim();
      if (trimmed === urlQuery) return;
      setIsLoading(true);
      setPage(1);
      const next = trimmed ? `/services?q=${encodeURIComponent(trimmed)}` : "/services";
      router.replace(next, { scroll: false });
    },
    [router, urlQuery]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      applySearchToUrl(searchInput);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [searchInput, applySearchToUrl]);

  const clearCreateParam = useCallback(() => {
    if (searchParams.get("action") === "create") {
      const next = urlQuery ? `/services?q=${encodeURIComponent(urlQuery)}` : "/services";
      router.replace(next, { scroll: false });
    }
  }, [router, searchParams, urlQuery]);

  const openModal = useCallback((triggerEl?: HTMLButtonElement | null) => {
    if (triggerEl) createTriggerRef.current = triggerEl;
    setSubmitError(null);
    setPhotoError(null);
    setOpenMenu(null);
    setIsModalManuallyOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (isSubmitting) return;
    setIsModalManuallyOpen(false);
    setOpenMenu(null);
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
        createTriggerRef.current?.focus({ preventScroll: true });
      }
      return;
    }

    wasModalOpenRef.current = true;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const rafId = window.requestAnimationFrame(() => {
      titleInputRef.current?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      document.body.style.overflow = prevOverflow;
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (!isModalOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (openMenu === "modal-category" || openMenu === "modal-estimasi") {
          setOpenMenu(null);
          return;
        }
        closeModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen, openMenu, closeModal]);

  useEffect(() => {
    if (!openMenu) return;

    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (openMenu === "modal-category") {
        if (modalCategoryRef.current && !modalCategoryRef.current.contains(target)) {
          setOpenMenu(null);
        }
        return;
      }
      if (openMenu === "modal-estimasi") {
        if (modalEstimasiRef.current && !modalEstimasiRef.current.contains(target)) {
          setOpenMenu(null);
        }
        return;
      }
      if (filterBarRef.current && !filterBarRef.current.contains(target)) {
        setOpenMenu(null);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "Escape" &&
        openMenu !== "modal-category" &&
        openMenu !== "modal-estimasi"
      ) {
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

  function toggleMenu(key: FilterMenuKey) {
    if (key === "price" && openMenu !== "price") {
      setDraftMinPrice(customMinPrice);
      setDraftMaxPrice(customMaxPrice);
      setCustomPriceError(null);
    }
    setOpenMenu((prev) => (prev === key ? null : key));
  }

  function applyPresetPriceRange(value: string) {
    setIsLoading(true);
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
      setCustomPriceError("Isi tarif minimal atau maksimal terlebih dahulu.");
      return;
    }

    const minNum = minStr === "" ? null : Number(minStr);
    const maxNum = maxStr === "" ? null : Number(maxStr);
    if (
      (minNum !== null && (Number.isNaN(minNum) || minNum < 0)) ||
      (maxNum !== null && (Number.isNaN(maxNum) || maxNum < 0))
    ) {
      setCustomPriceError("Masukkan nominal angka minimal Rp 0.");
      return;
    }
    if (minNum !== null && maxNum !== null && minNum > maxNum) {
      setCustomPriceError("Tarif minimal tidak boleh melebihi maksimal.");
      return;
    }

    setIsLoading(true);
    setCustomMinPrice(minStr);
    setCustomMaxPrice(maxStr);
    setPriceFilter("custom");
    setCustomPriceError(null);
    setOpenMenu(null);
    setPage(1);
  }

  function updateForm<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function switchTargetMode(mode: "all" | "custom") {
    setTargetMode(mode);
    if (mode === "all") {
      setTargetFakultas([...TARGET_FAKULTAS_OPTIONS]);
    } else if (targetFakultas.length === TARGET_FAKULTAS_OPTIONS.length) {
      setTargetFakultas([]);
    }
  }

  function toggleFakultas(name: string) {
    setTargetFakultas((prev) =>
      prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name]
    );
  }

  function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPhotoError(null);

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      setPhotoError(`Maksimal ${MAX_PHOTOS} foto per layanan.`);
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

  function clearPhotos() {
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
  }

  async function handleToggleFavorite(item: ApiServiceItem) {
    if (!getToken()) {
      setFeedbackNotice({
        tone: "info",
        text: "Masuk dengan akun mahasiswa UPN untuk menyimpan layanan ke daftar favorit.",
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
      const favorited = await toggleFavorite("service", item.id);
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
      setSubmitError("Pilih kategori layanan yang tersedia terlebih dahulu.");
      return;
    }
    const priceMin = Number(formData.price_min);
    if (formData.price_min.trim() === "" || Number.isNaN(priceMin) || priceMin < 0) {
      setSubmitError("Masukkan nominal tarif yang valid (minimal Rp 0).");
      return;
    }
    const priceMaxRaw = formData.price_max.trim();
    const priceMax = pricingType === "fixed" || priceMaxRaw === "" ? null : Number(priceMaxRaw);
    if (priceMax !== null && (Number.isNaN(priceMax) || priceMax < priceMin)) {
      setSubmitError("Tarif maksimal tidak boleh lebih kecil dari tarif minimal.");
      return;
    }
    if (targetMode === "custom" && targetFakultas.length === 0) {
      setSubmitError("Pilih minimal satu target fakultas atau aktifkan Semua Fakultas.");
      return;
    }

    const rawWa = formData.whatsapp_number.trim();
    const waDigits = rawWa.replace(/\D/g, "");
    const normalizedWa =
      rawWa === ""
        ? null
        : waDigits.startsWith("8") && waDigits.length >= 9
          ? `0${waDigits}`
          : rawWa;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const uploaded =
        photos.length > 0
          ? await Promise.all(photos.map((p) => uploadMedia(p.file, "services")))
          : [];
      const created = await apiFetch<ServiceCreateResponse>("/v1/services", {
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
          whatsapp_number: normalizedWa,
          target_faculties:
            targetMode === "all" ? [...TARGET_FAKULTAS_OPTIONS] : targetFakultas,
          description: formData.description.trim(),
          image_paths: uploaded.map((u) => u.path),
        }),
      });
      setIsModalManuallyOpen(false);
      setOpenMenu(null);
      setFormData(EMPTY_FORM);
      setPricingType("starting_from");
      setPaymentMethod("flexible");
      setTargetMode("all");
      setTargetFakultas([...TARGET_FAKULTAS_OPTIONS]);
      setPhotoError(null);
      clearPhotos();
      clearCreateParam();
      setIsLoading(true);
      setPage(1);
      setReloadNonce((n) => n + 1);
      setFeedbackNotice({
        tone: "success",
        text: `Layanan "${created.data.title}" berhasil diterbitkan.`,
        href: `/services/${created.data.id}`,
        hrefLabel: "Buka halaman jasa",
      });
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
  const activePricingLabel =
    pricingFilter !== "any" ? (PRICING_META[pricingFilter]?.label ?? pricingFilter) : null;
  const activeSortLabel = SORT_OPTIONS.find((s) => s.value === sortBy)?.label ?? "Terbaru";

  const hasActiveFilter =
    activeCategoryId !== null ||
    priceFilter !== "any" ||
    pricingFilter !== "any" ||
    urlQuery !== "";

  function clearFilters() {
    setIsLoading(true);
    setOpenMenu(null);
    setActiveCategoryId(null);
    setPriceFilter("any");
    setCustomMinPrice("");
    setCustomMaxPrice("");
    setDraftMinPrice("");
    setDraftMaxPrice("");
    setCustomPriceError(null);
    setPricingFilter("any");
    setSortBy("latest");
    setSearchDraft({ base: "", value: "" });
    setPage(1);
    if (urlQuery !== "") {
      router.replace("/services", { scroll: false });
    }
  }

  const fakultasSummary =
    targetMode === "all" || targetFakultas.length === TARGET_FAKULTAS_OPTIONS.length
      ? "Semua Fakultas"
      : targetFakultas.length === 0
        ? "Belum ada target dipilih"
        : targetFakultas.length <= 2
          ? targetFakultas.join(", ")
          : `${targetFakultas.slice(0, 2).join(", ")} +${targetFakultas.length - 2}`;

  const previewCategory =
    categoryOptions.find((c) => String(c.id) === formData.category_id)?.name ?? "Kategori";
  const parsedPreviewMin = Number(formData.price_min);
  const hasValidPreviewPrice =
    formData.price_min.trim() !== "" &&
    !Number.isNaN(parsedPreviewMin) &&
    parsedPreviewMin >= 0;
  const parsedPreviewMax = Number(formData.price_max);
  const previewHasRange =
    pricingType !== "fixed" &&
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
    <div className="auth-shell-enter mx-auto max-w-[1200px] space-y-6">
      {/* Header Band */}
      <section className="flex flex-col justify-between gap-5 border-b border-[#E5E0DA] pb-6 lg:flex-row lg:items-end">
        <div className="min-w-0 space-y-2">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-[#6E6A66]"
          >
            <Link
              href="/dashboard"
              className="rounded transition-colors hover:text-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
            >
              Portal Mahasiswa
            </Link>
            <span aria-hidden="true" className="text-[#CFC8BF]">
              /
            </span>
            <span className="text-[#141416]">Layanan &amp; Jasa</span>
            <span aria-hidden="true" className="text-[#CFC8BF]">
              ·
            </span>
            <span>{isLoading ? "Memuat layanan..." : `${total} jasa aktif`}</span>
          </nav>

          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[#141416] sm:text-[32px] sm:leading-[1.18]">
            Jasa &amp; Layanan Mahasiswa.{" "}
            <span className="font-normal text-[#6E6A66]">
              Temukan les privat, desain grafis, fotografi, dan servis teknis dari mahasiswa UPN.
            </span>
          </h1>
        </div>

        <button
          ref={createTriggerRef}
          type="button"
          onClick={(e) => openModal(e.currentTarget)}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          Tawarkan jasa
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
                className="rounded underline underline-offset-4 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
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

      {/* Custom Search, Filter & Editorial Category Bar */}
      <section
        ref={filterBarRef}
        aria-label="Pencarian dan filter katalog jasa"
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
            <label htmlFor="services-search" className="block text-[13px] font-medium text-[#57534E]">
              Cari jasa atau keahlian
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
                id="services-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchDraft({ base: urlQuery, value: e.target.value })}
                placeholder="Cari judul layanan atau keahlian"
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

          {/* Custom Price Range Popover (Presets + Custom Min/Max) */}
          <div>
            <label htmlFor="service-price-range" className="block text-[13px] font-medium text-[#57534E]">
              Rentang tarif
            </label>
            <div className="relative mt-1.5">
              <button
                id="service-price-range"
                type="button"
                aria-haspopup="dialog"
                aria-expanded={openMenu === "price"}
                onClick={() => toggleMenu("price")}
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
                  aria-label="Pilih atau atur rentang tarif"
                  className="absolute left-0 top-[calc(100%+8px)] z-30 w-full min-w-[280px] rounded-2xl border border-[#E5E0DA] bg-white p-2.5 shadow-[0_18px_36px_-18px_rgba(20,20,22,0.18)] sm:w-[320px]"
                >
                  <div className="space-y-1" role="listbox" aria-label="Pilihan rentang tarif cepat">
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
                      Rentang tarif khusus
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
                        <label htmlFor="service-custom-min-price" className="sr-only">
                          Tarif minimal (Rp)
                        </label>
                        <div className="flex h-11 items-center gap-1.5 rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-2.5 transition-all focus-within:border-[#141416] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(20,20,22,0.06)]">
                          <span className="text-[13px] font-semibold text-[#57534E]">Rp</span>
                          <input
                            id="service-custom-min-price"
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
                        <label htmlFor="service-custom-max-price" className="sr-only">
                          Tarif maksimal (Rp)
                        </label>
                        <div className="flex h-11 items-center gap-1.5 rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-2.5 transition-all focus-within:border-[#141416] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(20,20,22,0.06)]">
                          <span className="text-[13px] font-semibold text-[#57534E]">Rp</span>
                          <input
                            id="service-custom-max-price"
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

          {/* Custom Pricing Type Dropdown */}
          <FilterDropdown
            id="service-pricing-type"
            label="Model tarif"
            value={pricingFilter}
            displayLabel={activePricingLabel ?? "Semua model"}
            isOpen={openMenu === "pricing-type"}
            onToggle={() => toggleMenu("pricing-type")}
            onSelect={(nextVal) => {
              setIsLoading(true);
              setPricingFilter(nextVal);
              setOpenMenu(null);
              setPage(1);
            }}
            options={[
              { value: "any", label: "Semua model" },
              { value: "starting_from", label: "Mulai dari" },
              { value: "fixed", label: "Tarif tetap" },
              { value: "per_hour", label: "Per jam" },
              { value: "negotiable", label: "Negosiasi" },
            ]}
          />

          {/* Custom Sort Dropdown */}
          <FilterDropdown
            id="service-sort"
            label="Urutkan"
            value={sortBy}
            displayLabel={activeSortLabel}
            isOpen={openMenu === "sort"}
            onToggle={() => toggleMenu("sort")}
            onSelect={(nextVal) => {
              setIsLoading(true);
              setSortBy(nextVal as SortOption);
              setOpenMenu(null);
              setPage(1);
            }}
            options={SORT_OPTIONS}
          />

          {/* Mobile / Tablet Custom Category Dropdown */}
          <FilterDropdown
            id="service-category-mobile"
            label="Kategori layanan"
            className="lg:hidden"
            value={activeCategoryId === null ? "" : String(activeCategoryId)}
            displayLabel={activeCategoryName ?? "Semua kategori"}
            isOpen={openMenu === "category-mobile"}
            onToggle={() => toggleMenu("category-mobile")}
            onSelect={(nextVal) => {
              setIsLoading(true);
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
                setIsLoading(true);
                setActiveCategoryId(null);
                setOpenMenu(null);
                setPage(1);
              }}
              aria-pressed={activeCategoryId === null}
              className={`-mb-px inline-flex min-h-[44px] items-center whitespace-nowrap rounded-t border-b-2 px-0.5 text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 ${
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
                    setIsLoading(true);
                    setActiveCategoryId(cat.id);
                    setOpenMenu(null);
                    setPage(1);
                  }}
                  aria-pressed={isActive}
                  className={`-mb-px inline-flex min-h-[44px] items-center whitespace-nowrap rounded-t border-b-2 px-0.5 text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 ${
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
                  onClick={() => toggleMenu("category-overflow")}
                  aria-expanded={openMenu === "category-overflow"}
                  aria-haspopup="menu"
                  className={`inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-t border-b-2 px-0.5 text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 ${
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
                    aria-label="Kategori jasa lainnya"
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
                              setIsLoading(true);
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

      {/* Catalog Summary, Active Filter Chips & Grid */}
      <section
        ref={catalogSectionRef}
        aria-label="Daftar jasa dan layanan mahasiswa"
        className="space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] text-[#57534E]" aria-live="polite" role="status">
            {isLoading ? (
              "Memuat katalog jasa..."
            ) : total === 0 ? (
              "0 jasa ditemukan"
            ) : rangeStart !== null && rangeEnd !== null ? (
              <>
                Menampilkan{" "}
                <strong className="font-semibold text-[#141416]">
                  {rangeStart}-{rangeEnd}
                </strong>{" "}
                dari <strong className="font-semibold text-[#141416]">{total}</strong> jasa
              </>
            ) : (
              <>
                <strong className="font-semibold text-[#141416]">{total}</strong> jasa aktif
              </>
            )}
          </p>

          {hasActiveFilter && (
            <div className="flex flex-wrap items-center gap-2">
              {urlQuery !== "" && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchDraft({ base: "", value: "" });
                    applySearchToUrl("");
                  }}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D9D2C9] bg-white px-3.5 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                >
                  <span>Cari: &ldquo;{urlQuery}&rdquo;</span>
                  <span aria-hidden="true">×</span>
                </button>
              )}
              {activeCategoryName && (
                <button
                  type="button"
                  onClick={() => {
                    setIsLoading(true);
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
                  <span>Tarif: {activePriceLabel}</span>
                  <span aria-hidden="true">×</span>
                </button>
              )}
              {activePricingLabel && (
                <button
                  type="button"
                  onClick={() => {
                    setIsLoading(true);
                    setPricingFilter("any");
                    setPage(1);
                  }}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D9D2C9] bg-white px-3.5 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                >
                  <span>Model: {activePricingLabel}</span>
                  <span aria-hidden="true">×</span>
                </button>
              )}
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full px-3 text-[13px] font-semibold text-[#57534E] underline underline-offset-4 transition-colors hover:text-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
              >
                Atur ulang semua
              </button>
            </div>
          )}
        </div>

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
            <span className="sr-only">Memuat data jasa...</span>
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
          <div
            role="status"
            className="rounded-[20px] border border-[#E5E0DA] bg-white px-6 py-14 text-center"
          >
            <h2 className="font-display text-lg font-semibold text-[#141416]">
              {hasActiveFilter ? "Tidak ada jasa sesuai filter" : "Belum ada jasa dipublikasikan"}
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-[14px] text-[#6E6A66]">
              {hasActiveFilter
                ? "Ubah kategori, tarif, model harga, atau kata kunci untuk melihat layanan lain."
                : "Tawarkan jasa pertama Anda untuk membantu mahasiswa UPN dalam belajar, desain, atau servis."}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-6 text-[14px] font-medium text-[#141416] transition-all duration-150 hover:-translate-y-[1px] hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                >
                  Atur ulang filter
                </button>
              )}
              <button
                type="button"
                onClick={(e) => openModal(e.currentTarget)}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
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
              const pricingInfo = item.pricing_type
                ? (PRICING_META[item.pricing_type] ?? {
                    label: item.pricing_type,
                    badgeClass: "bg-[#F4F1EE] text-[#57534E]",
                  })
                : null;
              const priceText =
                item.pricing_type === "per_hour"
                  ? `${formatPriceRange(item.price_min, item.price_max)} / jam`
                  : formatPriceRange(item.price_min, item.price_max);
              const footerMeta = item.estimated_time?.trim() || formatTimeAgo(item.created_at);
              const isFavorited = favoriteIds.has(item.id);
              const isTogglingFavorite = togglingFavoriteIds.has(item.id);
              const photoCount = item.images?.length ?? 0;

              return (
                <article
                  key={item.id}
                  className="group relative flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white transition-all duration-180 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[2px] hover:border-[#CFC8BF] hover:shadow-[0_14px_28px_-14px_rgba(20,20,22,0.10)] focus-within:ring-2 focus-within:ring-[#141416]"
                >
                  {/* Media Frame */}
                  <div className="relative overflow-hidden bg-[#EFECE8]">
                    <ListingImage
                      module="service"
                      seed={item.id}
                      eager={idx < 3}
                      width={800}
                      height={600}
                      hint={`${categoryName} ${item.title}`}
                      images={item.images}
                      alt={`Foto layanan ${item.title}`}
                      className="aspect-[4/3] w-full object-cover transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:scale-[1.03]"
                    />

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
                  <div className="flex min-w-0 flex-1 flex-col p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-md bg-[#F4F1EE] px-2.5 py-1 text-[13px] font-medium text-[#57534E]">
                        {categoryName}
                      </span>
                      {pricingInfo && (
                        <span
                          className={`rounded-md px-2.5 py-1 text-[13px] font-medium ${pricingInfo.badgeClass}`}
                        >
                          {pricingInfo.label}
                        </span>
                      )}
                    </div>

                    <h2 className="mt-3 line-clamp-2 break-words font-display text-[16px] font-semibold leading-snug text-[#141416]">
                      <Link
                        href={`/services/${item.id}`}
                        className="after:absolute after:inset-0 hover:underline focus:outline-none"
                      >
                        {item.title}
                      </Link>
                    </h2>

                    <p className="mt-1.5 font-display text-[20px] font-bold tracking-tight text-[#141416]">
                      {priceText}
                    </p>

                    <p className="mt-2 line-clamp-2 flex-1 break-words text-[14px] leading-relaxed text-[#57534E]">
                      {item.description ?? "Tidak ada deskripsi tambahan."}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#F1EDE8] pt-4">
                      <span className="flex min-w-0 items-center gap-2">
                        <ProviderAvatar name={providerName} />
                        <span className="truncate text-[13px] font-medium text-[#141416]">
                          {providerName}
                        </span>
                        {item.user?.is_official_account && (
                          <VerifiedBadge size="xs" title="Akun resmi terverifikasi UPN" />
                        )}
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

        {/* Pagination */}
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

      {/* Matte Warm-Alabaster Modal Tawarkan Jasa.
          Rendered in a portal on document.body because the page wrapper carries
          auth-shell-enter transform, which would trap a fixed overlay under the
          sticky topbar instead of anchoring to the viewport. */}
      {isModalOpen &&
        isMounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[#141416]/50 p-4 sm:p-8"
            onClick={closeModal}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="pasang-jasa-title"
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[960px] flex-col overflow-hidden rounded-[24px] border border-[#E5E0DA] bg-[#F4F1EE] shadow-[0_20px_48px_-20px_rgba(20,20,22,0.20)] sm:max-h-[calc(100dvh-4rem)] sm:rounded-[28px]"
            >
              <div className="shrink-0 border-b border-[#E5E0DA] px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isSubmitting}
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-[#E5E0DA] bg-white px-4 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="M10 3.5L5.5 8L10 12.5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Kembali</span>
                  </button>
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

              <form
                onSubmit={handleSubmit}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-5 sm:px-7 sm:pb-7"
              >
                <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.45fr_0.85fr]">
                  {/* Form Card */}
                  <div className="min-w-0 space-y-6 rounded-[20px] border border-[#E5E0DA] bg-white p-5 sm:p-6">
                    {/* Informasi Layanan */}
                    <section aria-labelledby="jasa-info-heading" className="space-y-4">
                      <h3 id="jasa-info-heading" className="font-display text-[16px] font-semibold text-[#141416]">
                        Informasi layanan
                      </h3>

                      <div>
                        <div className="flex items-baseline justify-between gap-2">
                          <label htmlFor="jasa-title" className="block text-[14px] font-medium text-[#141416]">
                            Judul jasa atau layanan <span className="text-[#B83232]">*</span>
                          </label>
                          <span className="text-[13px] text-[#6E6A66]">
                            {formData.title.length}/255
                          </span>
                        </div>
                        <input
                          ref={titleInputRef}
                          id="jasa-title"
                          type="text"
                          required
                          maxLength={255}
                          value={formData.title}
                          onChange={(e) => updateForm("title", e.target.value)}
                          placeholder="Judul layanan yang ditawarkan"
                          className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 text-[14px] text-[#141416] placeholder:text-[#66625E] transition-all focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none"
                        />
                        <p className="mt-1.5 text-[13px] text-[#6E6A66]">
                          Gunakan judul spesifik dan jelas agar mudah ditemukan di pencarian.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div ref={modalCategoryRef}>
                          <FilterDropdown
                            id="jasa-category"
                            label="Kategori layanan"
                            requiredMarker
                            value={formData.category_id}
                            displayLabel={
                              formData.category_id === ""
                                ? "Pilih kategori"
                                : (categoryOptions.find((c) => String(c.id) === formData.category_id)
                                    ?.name ?? "Pilih kategori")
                            }
                            isOpen={openMenu === "modal-category"}
                            disabled={categoryOptions.length === 0}
                            onToggle={() => toggleMenu("modal-category")}
                            onSelect={(nextVal) => {
                              updateForm("category_id", nextVal);
                              setOpenMenu(null);
                            }}
                            options={categoryOptions.map((cat) => ({
                              value: String(cat.id),
                              label: cat.name,
                            }))}
                          />
                          {categoryOptions.length === 0 && (
                            <p className="mt-1.5 text-[13px] text-[#6E6A66]">
                              Kategori belum tersedia. Tunggu data jasa dimuat.
                            </p>
                          )}
                        </div>

                        <div ref={modalEstimasiRef}>
                          <FilterDropdown
                            id="jasa-estimasi"
                            label="Estimasi pengerjaan"
                            value={formData.estimated_time}
                            displayLabel={formData.estimated_time}
                            isOpen={openMenu === "modal-estimasi"}
                            onToggle={() => toggleMenu("modal-estimasi")}
                            onSelect={(nextVal) => {
                              updateForm("estimated_time", nextVal);
                              setOpenMenu(null);
                            }}
                            options={ESTIMASI_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                          />
                        </div>
                      </div>

                      <fieldset>
                        <legend className="text-[14px] font-medium text-[#141416]">
                          Target fakultas atau jurusan
                        </legend>
                        <div
                          className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"
                          role="radiogroup"
                          aria-label="Jangkauan target fakultas"
                        >
                          <button
                            type="button"
                            role="radio"
                            aria-checked={targetMode === "all"}
                            onClick={() => switchTargetMode("all")}
                            className={`flex min-h-[44px] items-center justify-center rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] ${
                              targetMode === "all"
                                ? "border-[#141416] bg-[#141416] text-white"
                                : "border-[#E5E0DA] bg-[#F6F4F1] text-[#57534E] hover:border-[#CFC8BF] hover:text-[#141416]"
                            }`}
                          >
                            Semua Fakultas (8)
                          </button>
                          <button
                            type="button"
                            role="radio"
                            aria-checked={targetMode === "custom"}
                            onClick={() => switchTargetMode("custom")}
                            className={`flex min-h-[44px] items-center justify-center rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] ${
                              targetMode === "custom"
                                ? "border-[#141416] bg-[#141416] text-white"
                                : "border-[#E5E0DA] bg-[#F6F4F1] text-[#57534E] hover:border-[#CFC8BF] hover:text-[#141416]"
                            }`}
                          >
                            Pilih fakultas tertentu ({targetFakultas.length})
                          </button>
                        </div>

                        {targetMode === "custom" && (
                          <div
                            className="mt-2.5 grid grid-cols-1 gap-2 rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] p-2.5 sm:grid-cols-2"
                            role="group"
                            aria-label="Pilih target fakultas"
                          >
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
                        )}
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
                                className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-center text-[13px] font-medium transition-all focus-within:ring-2 focus-within:ring-[#141416] focus-within:ring-offset-1 ${
                                  checked
                                    ? "border-[#141416] bg-[#141416] text-white"
                                    : "border-[#E5E0DA] bg-[#F6F4F1] text-[#57534E] hover:border-[#CFC8BF] hover:text-[#141416]"
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

                      <div
                        className={`grid grid-cols-1 gap-4 ${
                          pricingType === "fixed" ? "" : "sm:grid-cols-2"
                        }`}
                      >
                        <div>
                          <label
                            htmlFor="jasa-price-min"
                            className="block text-[14px] font-medium text-[#141416]"
                          >
                            {pricingType === "fixed"
                              ? "Tarif tetap (Rp)"
                              : pricingType === "per_hour"
                                ? "Tarif per jam (Rp)"
                                : "Tarif minimal (Rp)"}{" "}
                            <span className="text-[#B83232]">*</span>
                          </label>
                          <div className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 transition-all focus-within:border-[#141416] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(20,20,22,0.06)]">
                            <span className="text-[14px] font-semibold text-[#57534E]">Rp</span>
                            <input
                              id="jasa-price-min"
                              type="number"
                              required
                              min={0}
                              step="any"
                              value={formData.price_min}
                              onChange={(e) => updateForm("price_min", e.target.value)}
                              placeholder="Masukkan nominal tarif"
                              className="w-full bg-transparent text-[14px] font-semibold text-[#141416] placeholder:font-normal placeholder:text-[#66625E] focus:outline-none"
                            />
                          </div>
                          {hasValidPreviewPrice && (
                            <p className="mt-1.5 text-[13px] text-[#6E6A66]">
                              Tampilan tarif: {previewPriceLine}
                            </p>
                          )}
                        </div>

                        {pricingType !== "fixed" && (
                          <div>
                            <label
                              htmlFor="jasa-price-max"
                              className="block text-[14px] font-medium text-[#141416]"
                            >
                              Tarif maksimal (Rp){" "}
                              <span className="font-normal text-[#6E6A66]">(opsional)</span>
                            </label>
                            <div className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 transition-all focus-within:border-[#141416] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(20,20,22,0.06)]">
                              <span className="text-[14px] font-semibold text-[#57534E]">Rp</span>
                              <input
                                id="jasa-price-max"
                                type="number"
                                min={0}
                                step="any"
                                value={formData.price_max}
                                onChange={(e) => updateForm("price_max", e.target.value)}
                                placeholder="Batas atas jika bertingkat"
                                className="w-full bg-transparent text-[14px] font-semibold text-[#141416] placeholder:font-normal placeholder:text-[#66625E] focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
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
                                className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-center text-[13px] font-medium transition-all focus-within:ring-2 focus-within:ring-[#141416] focus-within:ring-offset-1 ${
                                  checked
                                    ? "border-[#141416] bg-[#141416] text-white"
                                    : "border-[#E5E0DA] bg-[#F6F4F1] text-[#57534E] hover:border-[#CFC8BF] hover:text-[#141416]"
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
                          className="mt-1.5 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] p-3.5 text-[14px] leading-relaxed text-[#141416] placeholder:text-[#66625E] transition-all focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            id="jasa-photos-label"
                            className="block text-[14px] font-medium text-[#141416]"
                          >
                            Foto sampul atau portofolio ({photos.length}/{MAX_PHOTOS})
                          </span>
                          <span className="text-[13px] text-[#6E6A66]">
                            Foto pertama menjadi sampul
                          </span>
                        </div>
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
                              {i === 0 && (
                                <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-[#141416]/85 px-1.5 py-0.5 text-[11px] font-medium text-white">
                                  Utama
                                </span>
                              )}
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
                          {photos.length < MAX_PHOTOS && (
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
                          )}
                        </div>
                        {photoError && (
                          <p role="alert" className="mt-2 text-[13px] font-medium text-[#B83232]">
                            {photoError}
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="jasa-wa" className="block text-[14px] font-medium text-[#141416]">
                          Nomor WhatsApp{" "}
                          <span className="font-normal text-[#6E6A66]">(opsional)</span>
                        </label>
                        <div className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 transition-all focus-within:border-[#141416] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(20,20,22,0.06)]">
                          <span className="shrink-0 rounded-md bg-[#EFECE8] px-2 py-0.5 text-[13px] font-semibold text-[#5F5B57]">
                            +62
                          </span>
                          <input
                            id="jasa-wa"
                            type="tel"
                            maxLength={20}
                            value={formData.whatsapp_number}
                            onChange={(e) => updateForm("whatsapp_number", e.target.value)}
                            placeholder="Masukkan nomor WhatsApp aktif (opsional)"
                            className="w-full bg-transparent text-[14px] text-[#141416] placeholder:text-[#66625E] focus:outline-none"
                          />
                        </div>
                        <p className="mt-1.5 text-[13px] text-[#6E6A66]">
                          Opsional. Kosongkan jika ingin dihubungi lewat Chat 1-on-1 dalam aplikasi saja.
                        </p>
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
                        className="inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-60"
                      >
                        {isSubmitting ? "Menyimpan layanan..." : "Terbitkan layanan"}
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
                      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#EFECE8] text-[#5F5B57]">
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
                        {photos.length > 1 && (
                          <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-[#141416]/85 px-2 py-0.5 text-[13px] font-medium text-white">
                            {photos.length} foto
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded-md bg-[#F4F1EE] px-2.5 py-0.5 text-[13px] font-medium text-[#57534E]">
                            {previewCategory}
                          </span>
                          <span
                            className={`rounded-md px-2.5 py-0.5 text-[13px] font-medium ${
                              PRICING_META[pricingType]?.badgeClass ?? "bg-[#F4F1EE] text-[#57534E]"
                            }`}
                          >
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
          </div>,
          document.body
        )}
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={<p className="text-[14px] text-[#6E6A66]">Memuat jasa...</p>}>
      <ServicesContent />
    </Suspense>
  );
}
