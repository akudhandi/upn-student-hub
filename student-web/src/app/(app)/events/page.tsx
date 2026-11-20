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
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, fetchPublicCategories, type PublicCategory } from "@/lib/api";
import { getToken, getUser, isOfficialAccount, USER_UPDATED_EVENT } from "@/lib/auth";
import { fetchFavorites, toggleFavorite } from "@/lib/interactions";
import FilterDropdown from "@/components/FilterDropdown";
import CategoryTabs from "@/components/CategoryTabs";
import PaginationBar from "@/components/PaginationBar";
import {
  EventCardSkeleton,
  EventGridCard,
  FeaturedEventCard,
  type ApiEventItem,
} from "./_components/EventCards";

// API response shape for GET /api/v1/events (Laravel paginator in { message, data } envelope).

type EventListResponse = {
  message: string;
  data: {
    current_page: number;
    last_page: number;
    total: number;
    from?: number | null;
    to?: number | null;
    data: ApiEventItem[];
  };
};

type ScheduleFilter = "all" | "upcoming" | "past";
type OrganizerFilter = "all" | "verified";
type SortOption = "soonest" | "latest" | "event_desc";
type OpenMenuKey =
  | null
  | "schedule"
  | "organizer"
  | "sort"
  | "category-mobile"
  | "category-overflow";

type FeedbackNotice = {
  tone: "info" | "success" | "error";
  text: string;
  href?: string;
  hrefLabel?: string;
};

const SCHEDULE_OPTIONS: { value: ScheduleFilter; label: string }[] = [
  { value: "all", label: "Semua jadwal" },
  { value: "upcoming", label: "Akan datang" },
  { value: "past", label: "Telah berlangsung" },
];

const ORGANIZER_OPTIONS: { value: OrganizerFilter; label: string }[] = [
  { value: "all", label: "Semua penyelenggara" },
  { value: "verified", label: "Resmi terverifikasi" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "soonest", label: "Jadwal terdekat" },
  { value: "latest", label: "Terbaru dipublikasikan" },
  { value: "event_desc", label: "Jadwal terjauh" },
];

const PRIMARY_CATEGORY_LIMIT = 5;

function subscribeUserStore(onStoreChange: () => void) {
  window.addEventListener(USER_UPDATED_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(USER_UPDATED_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getOfficialAccountSnapshot(): boolean {
  return isOfficialAccount(getUser());
}

function EventsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = (searchParams.get("q") ?? "").trim();

  const [items, setItems] = useState<ApiEventItem[]>([]);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [rangeEnd, setRangeEnd] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("all");
  const [organizerFilter, setOrganizerFilter] = useState<OrganizerFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("soonest");
  const [openMenu, setOpenMenu] = useState<OpenMenuKey>(null);

  const [searchDraft, setSearchDraft] = useState<{ base: string; value: string } | null>(null);
  const searchInput =
    searchDraft && searchDraft.base === urlQuery ? searchDraft.value : urlQuery;

  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(() => new Set());
  const [togglingFavoriteIds, setTogglingFavoriteIds] = useState<Set<number>>(() => new Set());
  const [feedbackNotice, setFeedbackNotice] = useState<FeedbackNotice | null>(null);

  const canSubmitEvent = useSyncExternalStore(
    subscribeUserStore,
    getOfficialAccountSnapshot,
    () => false
  );

  const filterBarRef = useRef<HTMLElement | null>(null);
  const catalogSectionRef = useRef<HTMLElement | null>(null);

  const categoryOptions = useMemo(() => {
    return [...categories].sort((a, b) => {
      const aOther = a.name.toLowerCase() === "lainnya";
      const bOther = b.name.toLowerCase() === "lainnya";
      if (aOther !== bOther) return aOther ? 1 : -1;
      return a.name.localeCompare(b.name, "id");
    });
  }, [categories]);

  const primaryCategories = useMemo(
    () => categoryOptions.slice(0, PRIMARY_CATEGORY_LIMIT),
    [categoryOptions]
  );
  const overflowCategories = useMemo(
    () => categoryOptions.slice(PRIMARY_CATEGORY_LIMIT),
    [categoryOptions]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchPublicCategories("event", controller.signal)
      .then((cats) => {
        if (!controller.signal.aborted) setCategories(cats);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    const controller = new AbortController();
    fetchFavorites(controller.signal)
      .then((entries) => {
        if (controller.signal.aborted) return;
        const ids = new Set<number>();
        for (const entry of entries) {
          if (entry.type === "event" && typeof entry.item?.id === "number") {
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
    if (scheduleFilter !== "all") params.set("schedule", scheduleFilter);
    if (organizerFilter === "verified") params.set("verified", "1");
    if (sortBy !== "soonest") params.set("sort", sortBy);
    if (urlQuery !== "") params.set("q", urlQuery);

    apiFetch<EventListResponse>(`/v1/events?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (controller.signal.aborted) return;
        setItems(res.data.data);
        setTotal(res.data.total);
        setPage(res.data.current_page);
        setLastPage(res.data.last_page);
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
        setError("Gagal memuat data event. Periksa koneksi backend lalu coba lagi.");
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [
    page,
    activeCategoryId,
    scheduleFilter,
    organizerFilter,
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
      const next = trimmed ? `/events?q=${encodeURIComponent(trimmed)}` : "/events";
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

  function toggleMenu(key: Exclude<OpenMenuKey, null>) {
    setOpenMenu((prev) => (prev === key ? null : key));
  }

  async function handleToggleFavorite(item: ApiEventItem) {
    if (!getToken()) {
      setFeedbackNotice({
        tone: "info",
        text: "Masuk dengan akun mahasiswa UPN untuk menyimpan kegiatan ke daftar favorit.",
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
      const favorited = await toggleFavorite("event", item.id);
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

  function clearFilters() {
    setIsLoading(true);
    setOpenMenu(null);
    setActiveCategoryId(null);
    setScheduleFilter("all");
    setOrganizerFilter("all");
    setSortBy("soonest");
    setSearchDraft({ base: "", value: "" });
    setPage(1);
    if (urlQuery !== "") {
      router.replace("/events", { scroll: false });
    }
  }

  function handlePageChange(nextPage: number) {
    if (nextPage < 1 || nextPage > lastPage || nextPage === page) return;
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
  const activeScheduleLabel =
    SCHEDULE_OPTIONS.find((s) => s.value === scheduleFilter)?.label ?? "Semua jadwal";
  const activeOrganizerLabel =
    ORGANIZER_OPTIONS.find((o) => o.value === organizerFilter)?.label ?? "Semua penyelenggara";
  const activeSortLabel =
    SORT_OPTIONS.find((s) => s.value === sortBy)?.label ?? "Jadwal terdekat";

  const hasActiveFilter =
    activeCategoryId !== null ||
    scheduleFilter !== "all" ||
    organizerFilter !== "all" ||
    urlQuery !== "";

  const showFeatured = page === 1 && items.length > 0;
  const featured = showFeatured ? items[0] : null;
  const gridItems = showFeatured ? items.slice(1) : items;

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
            <span aria-current="page" className="text-[#141416]">
              Event &amp; Info Kampus
            </span>
            <span aria-hidden="true" className="text-[#CFC8BF]">
              ·
            </span>
            <span>{isLoading ? "Memuat agenda..." : `${total} kegiatan`}</span>
          </nav>

          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[#141416] sm:text-[32px] sm:leading-[1.18]">
            Agenda Kampus &amp; Info Resmi.{" "}
            <span className="font-normal text-[#6E6A66]">
              Temukan seminar, kompetisi, festival, dan pengumuman mahasiswa UPN Veteran Jatim.
            </span>
          </h1>
        </div>

        {canSubmitEvent && (
          <Link
            href="/events/create"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            Ajukan event
          </Link>
        )}
      </section>

      {/* Inline Feedback Banner */}
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
        aria-label="Pencarian dan filter agenda event kampus"
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
            <label htmlFor="events-search" className="block text-[13px] font-medium text-[#57534E]">
              Cari kegiatan
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
                id="events-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchDraft({ base: urlQuery, value: e.target.value })}
                placeholder="Cari judul event, penyelenggara, atau lokasi"
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

          {/* Custom Schedule Dropdown */}
          <FilterDropdown
            id="event-schedule-filter"
            label="Rentang jadwal"
            value={scheduleFilter}
            displayLabel={activeScheduleLabel}
            isOpen={openMenu === "schedule"}
            onToggle={() => toggleMenu("schedule")}
            onSelect={(nextVal) => {
              setIsLoading(true);
              setScheduleFilter(nextVal as ScheduleFilter);
              setOpenMenu(null);
              setPage(1);
            }}
            options={SCHEDULE_OPTIONS}
          />

          {/* Custom Organizer Dropdown */}
          <FilterDropdown
            id="event-organizer-filter"
            label="Penyelenggara"
            value={organizerFilter}
            displayLabel={activeOrganizerLabel}
            isOpen={openMenu === "organizer"}
            onToggle={() => toggleMenu("organizer")}
            onSelect={(nextVal) => {
              setIsLoading(true);
              setOrganizerFilter(nextVal as OrganizerFilter);
              setOpenMenu(null);
              setPage(1);
            }}
            options={ORGANIZER_OPTIONS}
          />

          {/* Custom Sort Dropdown */}
          <FilterDropdown
            id="event-sort"
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
            id="event-category-mobile"
            label="Kategori kegiatan"
            className="sm:col-span-2 lg:hidden"
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
          ariaLabel="Filter berdasarkan kategori kegiatan"
          overflowMenuLabel="Kategori event lainnya"
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

      {/* Catalog Summary, Active Filter Chips & Agenda */}
      <section
        ref={catalogSectionRef}
        aria-label="Daftar kegiatan dan pengumuman kampus"
        className="space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] text-[#57534E]" aria-live="polite" role="status">
            {isLoading ? (
              "Memuat agenda kampus..."
            ) : total === 0 ? (
              "0 kegiatan ditemukan"
            ) : rangeStart !== null && rangeEnd !== null ? (
              <>
                Menampilkan{" "}
                <strong className="font-semibold text-[#141416]">
                  {rangeStart}-{rangeEnd}
                </strong>{" "}
                dari <strong className="font-semibold text-[#141416]">{total}</strong> kegiatan
              </>
            ) : (
              <>
                <strong className="font-semibold text-[#141416]">{total}</strong> kegiatan aktif
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
              {scheduleFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => {
                    setIsLoading(true);
                    setScheduleFilter("all");
                    setPage(1);
                  }}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D9D2C9] bg-white px-3.5 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                >
                  <span>Jadwal: {activeScheduleLabel}</span>
                  <span aria-hidden="true">×</span>
                </button>
              )}
              {organizerFilter === "verified" && (
                <button
                  type="button"
                  onClick={() => {
                    setIsLoading(true);
                    setOrganizerFilter("all");
                    setPage(1);
                  }}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D9D2C9] bg-white px-3.5 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                >
                  <span>Penyelenggara: {activeOrganizerLabel}</span>
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
            role="status"
            aria-busy="true"
            aria-label="Memuat event dan informasi kampus"
            className="space-y-6"
          >
            <div className="grid grid-cols-1 overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white lg:grid-cols-[1.08fr_1fr]">
              <div className="aspect-[16/10] animate-pulse bg-[#EFECE8] lg:min-h-[300px]" />
              <div className="flex flex-col gap-3 p-5 sm:p-7">
                <div className="flex gap-2">
                  <div className="h-6 w-28 animate-pulse rounded-md bg-[#F4F1EE]" />
                  <div className="h-6 w-24 animate-pulse rounded-md bg-[#F4F1EE]" />
                </div>
                <div className="mt-1 h-7 w-4/5 animate-pulse rounded-lg bg-[#F4F1EE]" />
                <div className="h-4 w-1/2 animate-pulse rounded-lg bg-[#F4F1EE]" />
                <div className="h-4 w-full animate-pulse rounded-lg bg-[#F4F1EE]" />
                <div className="h-4 w-2/3 animate-pulse rounded-lg bg-[#F4F1EE]" />
                <div className="mt-auto h-11 w-40 animate-pulse rounded-full bg-[#EFECE8]" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
            <span className="sr-only">Memuat data event...</span>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-[20px] border border-[#E5E0DA] bg-white px-6 py-14 text-center"
          >
            <h2 className="font-display text-lg font-semibold text-[#141416]">
              Gagal memuat data event
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-[14px] text-[#6E6A66]">{error}</p>
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                setError(null);
                setReloadNonce((n) => n + 1);
              }}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] motion-reduce:transform-none motion-reduce:transition-none"
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
              {hasActiveFilter ? "Tidak ada kegiatan sesuai filter" : "Belum ada event dipublikasikan"}
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-[14px] leading-relaxed text-[#6E6A66]">
              {hasActiveFilter
                ? "Ubah kategori, rentang jadwal, status penyelenggara, atau kata kunci untuk melihat agenda lainnya."
                : canSubmitEvent
                  ? "Ajukan kegiatan seminar, lomba, atau pengumuman resmi pertama untuk mahasiswa UPN."
                  : "Kegiatan dan pengumuman resmi dari HIMA, Ormawa, atau Fakultas akan tampil di sini setelah dipublikasikan."}
            </p>
            {(hasActiveFilter || canSubmitEvent) && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-6 text-[14px] font-medium text-[#141416] transition-all duration-150 hover:-translate-y-[1px] hover:border-[#141416] hover:bg-[#FAF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] motion-reduce:transform-none motion-reduce:transition-none"
                  >
                    Atur ulang filter
                  </button>
                )}
                {canSubmitEvent && (
                  <Link
                    href="/events/create"
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:transform-none motion-reduce:transition-none"
                  >
                    Ajukan event
                  </Link>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {featured && (
              <FeaturedEventCard
                item={featured}
                isFavorited={favoriteIds.has(featured.id)}
                isTogglingFavorite={togglingFavoriteIds.has(featured.id)}
                onToggleFavorite={(ev) => void handleToggleFavorite(ev)}
              />
            )}

            {gridItems.length > 0 && (
              <div className={featured ? "pt-3" : ""}>
                {featured && (
                  <h2 className="mb-4 font-display text-[18px] font-semibold tracking-tight text-[#141416]">
                    Daftar kegiatan lainnya
                  </h2>
                )}

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {gridItems.map((item, idx) => (
                    <EventGridCard
                      key={item.id}
                      item={item}
                      eager={idx < 3}
                      isFavorited={favoriteIds.has(item.id)}
                      isTogglingFavorite={togglingFavoriteIds.has(item.id)}
                      onToggleFavorite={(ev) => void handleToggleFavorite(ev)}
                    />
                  ))}
                </div>
              </div>
            )}

            <PaginationBar
              ariaLabel="Navigasi halaman event"
              page={page}
              lastPage={lastPage}
              total={total}
              unitLabel="kegiatan"
              onPageChange={handlePageChange}
            />
          </>
        )}
      </section>
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<p className="text-[14px] text-[#6E6A66]">Memuat agenda kampus...</p>}>
      <EventsContent />
    </Suspense>
  );
}
