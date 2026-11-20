"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, fetchPublicCategories, type PublicCategory } from "@/lib/api";
import { getToken, getUser } from "@/lib/auth";
import { fetchFavorites, toggleFavorite } from "@/lib/interactions";
import { formatRupiah } from "@/lib/formatters";
import CategoryTabs from "@/components/CategoryTabs";
import FilterDropdown from "@/components/FilterDropdown";
import PaginationBar from "@/components/PaginationBar";
import PriceRangeDropdown from "@/components/PriceRangeDropdown";
import { CreateServiceModal, type CreatedServiceSummary } from "./_components/CreateServiceModal";
import {
  PRICING_META,
  ServiceCard,
  ServiceCardSkeleton,
  type ApiServiceItem,
} from "./_components/ServiceCard";

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

type SortOption = "latest" | "price_asc" | "price_desc";
type FilterMenuKey =
  | "price"
  | "pricing-type"
  | "sort"
  | "category-mobile"
  | "category-overflow";

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
  const [backendCategories, setBackendCategories] = useState<PublicCategory[]>([]);
  const [currentUser] = useState(() => getUser());

  const filterBarRef = useRef<HTMLElement | null>(null);
  const catalogSectionRef = useRef<HTMLElement | null>(null);
  const createTriggerRef = useRef<HTMLButtonElement | null>(null);
  const wasModalOpenRef = useRef(false);

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
    setOpenMenu(null);
    setIsModalManuallyOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalManuallyOpen(false);
    setOpenMenu(null);
    clearCreateParam();
  }, [clearCreateParam]);

  useEffect(() => {
    if (isModalOpen) {
      wasModalOpenRef.current = true;
      return;
    }
    if (wasModalOpenRef.current) {
      wasModalOpenRef.current = false;
      createTriggerRef.current?.focus({ preventScroll: true });
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (!openMenu) return;

    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (filterBarRef.current && !filterBarRef.current.contains(target)) {
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

  function handleCreated(created: CreatedServiceSummary) {
    setIsModalManuallyOpen(false);
    setOpenMenu(null);
    clearCreateParam();
    setIsLoading(true);
    setPage(1);
    setReloadNonce((n) => n + 1);
    setFeedbackNotice({
      tone: "success",
      text: `Layanan "${created.title}" berhasil diterbitkan.`,
      href: `/services/${created.id}`,
      hrefLabel: "Buka halaman jasa",
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
          <PriceRangeDropdown
            id="service-price-range"
            label="Rentang tarif"
            dialogAriaLabel="Pilih atau atur rentang tarif"
            presetsAriaLabel="Pilihan rentang tarif cepat"
            customHeading="Rentang tarif khusus"
            minInputId="service-custom-min-price"
            maxInputId="service-custom-max-price"
            minInputAriaLabel="Tarif minimal (Rp)"
            maxInputAriaLabel="Tarif maksimal (Rp)"
            displayLabel={formatPriceFilterLabel(priceFilter, customMinPrice, customMaxPrice)}
            value={priceFilter}
            options={PRICE_RANGE_OPTIONS}
            isOpen={openMenu === "price"}
            draftMin={draftMinPrice}
            draftMax={draftMaxPrice}
            error={customPriceError}
            onToggle={() => toggleMenu("price")}
            onSelectPreset={applyPresetPriceRange}
            onDraftMinChange={(nextVal) => {
              setDraftMinPrice(nextVal);
              setCustomPriceError(null);
            }}
            onDraftMaxChange={(nextVal) => {
              setDraftMaxPrice(nextVal);
              setCustomPriceError(null);
            }}
            onApplyCustom={applyCustomPriceRange}
          />

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
        <CategoryTabs
          ariaLabel="Filter berdasarkan kategori"
          overflowMenuLabel="Kategori jasa lainnya"
          primaryCategories={primaryCategories}
          overflowCategories={overflowCategories}
          activeCategoryId={activeCategoryId}
          isOverflowOpen={openMenu === "category-overflow"}
          onSelectCategory={(categoryId) => {
            setIsLoading(true);
            setActiveCategoryId(categoryId);
            setOpenMenu(null);
            setPage(1);
          }}
          onToggleOverflow={() => toggleMenu("category-overflow")}
        />
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
            {items.map((item, idx) => (
              <ServiceCard
                key={item.id}
                item={item}
                eager={idx < 3}
                isFavorited={favoriteIds.has(item.id)}
                isTogglingFavorite={togglingFavoriteIds.has(item.id)}
                onToggleFavorite={(target) => void handleToggleFavorite(target)}
              />
            ))}
          </div>
        )}

        {!isLoading && !error && (
          <PaginationBar
            ariaLabel="Navigasi halaman jasa"
            page={page}
            lastPage={lastPage}
            total={total}
            unitLabel="layanan"
            onPageChange={handlePageChange}
          />
        )}
      </section>

      {isModalOpen && (
        <CreateServiceModal
          categoryOptions={categoryOptions}
          currentUser={currentUser}
          onClose={closeModal}
          onCreated={handleCreated}
        />
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
