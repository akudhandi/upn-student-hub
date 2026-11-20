"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  apiFetch,
  fetchPublicCategories,
  type PublicCategory,
} from "@/lib/api";
import { getToken, getUser } from "@/lib/auth";
import { fetchFavorites, toggleFavorite } from "@/lib/interactions";
import { formatRupiah } from "@/lib/formatters";
import FilterDropdown, { CheckIcon, ChevronDownIcon } from "@/components/FilterDropdown";
import CategoryTabs from "@/components/CategoryTabs";
import PaginationBar from "@/components/PaginationBar";
import {
  CONDITION_META,
  ItemCardSkeleton,
  MarketplaceCard,
  type ApiMarketplaceItem,
} from "./_components/MarketplaceCard";
import { CreateListingModal } from "./_components/CreateListingModal";

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
  const [backendCategories, setBackendCategories] = useState<PublicCategory[]>([]);
  const [currentUser] = useState(() => getUser());

  const catalogSectionRef = useRef<HTMLElement | null>(null);
  const filterBarRef = useRef<HTMLElement | null>(null);
  const createTriggerRef = useRef<HTMLButtonElement | null>(null);
  const wasModalOpenRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchPublicCategories("marketplace", controller.signal)
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
          if (entry.type === "marketplace" && typeof entry.item?.id === "number") {
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
    if (conditionFilter !== "any") params.set("condition", conditionFilter);
    const { minPrice, maxPrice } = priceRangeParams(priceFilter, customMinPrice, customMaxPrice);
    if (minPrice) params.set("min_price", minPrice);
    if (maxPrice) params.set("max_price", maxPrice);
    if (sortBy !== "latest") params.set("sort", sortBy);
    if (urlSearchQuery !== "") params.set("q", urlSearchQuery);

    apiFetch<MarketplaceListResponse>(`/v1/marketplace?${params.toString()}`, {
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
        setError("Gagal memuat daftar barang. Periksa koneksi backend lalu muat ulang.");
        setIsLoading(false);
      });

    return () => {
      controller.abort();
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

  const openModal = useCallback((triggerEl?: HTMLButtonElement | null) => {
    if (triggerEl) createTriggerRef.current = triggerEl;
    setOpenMenu(null);
    setIsModalManuallyOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalManuallyOpen(false);
    clearCreateParam();
  }, [clearCreateParam]);

  useEffect(() => {
    if (!isModalOpen) {
      if (wasModalOpenRef.current) {
        wasModalOpenRef.current = false;
        createTriggerRef.current?.focus({ preventScroll: true });
      }
      return;
    }
    wasModalOpenRef.current = true;
  }, [isModalOpen]);

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

  function handleCreated(created: { id: number; title: string }) {
    setIsModalManuallyOpen(false);
    clearCreateParam();
    setIsLoading(true);
    setPage(1);
    setReloadNonce((n) => n + 1);
    setFeedbackNotice({
      tone: "success",
      text: `Iklan "${created.title}" berhasil diterbitkan di Marketplace.`,
      href: `/marketplace/${created.id}`,
      hrefLabel: "Buka halaman iklan",
    });
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
          onClick={(e) => openModal(e.currentTarget)}
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
        <CategoryTabs
          ariaLabel="Filter berdasarkan kategori"
          overflowMenuLabel="Kategori marketplace lainnya"
          primaryCategories={primaryCategories}
          overflowCategories={overflowCategories}
          activeCategoryId={activeCategoryId}
          isOverflowOpen={openMenu === "category-overflow"}
          onSelectCategory={(categoryId) => {
            setActiveCategoryId(categoryId);
            setOpenMenu(null);
            setPage(1);
          }}
          onToggleOverflow={() => toggleFilterMenu("category-overflow")}
        />
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
                onClick={(e) => openModal(e.currentTarget)}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
              >
                Pasang iklan barang
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, idx) => (
              <MarketplaceCard
                key={item.id}
                item={item}
                eager={idx < 3}
                isFavorited={favoriteIds.has(item.id)}
                isTogglingFavorite={togglingFavoriteIds.has(item.id)}
                onToggleFavorite={(entry) => void handleToggleFavorite(entry)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !error && (
          <PaginationBar
            ariaLabel="Navigasi halaman marketplace"
            page={page}
            lastPage={lastPage}
            total={total}
            unitLabel="barang"
            onPageChange={handlePageChange}
          />
        )}
      </section>

      {/* Matte Modal Pasang Iklan */}
      {isModalOpen && (
        <CreateListingModal
          categoryOptions={categoryOptions}
          currentUser={currentUser}
          onClose={closeModal}
          onCreated={handleCreated}
        />
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
