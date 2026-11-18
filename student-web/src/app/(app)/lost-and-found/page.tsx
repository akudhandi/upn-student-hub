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
import { getUser, USER_UPDATED_EVENT, type AuthUser } from "@/lib/auth";
import type { ApiImage } from "@/lib/images";

// API types: shape of GET /api/v1/lost-found (Laravel paginator wrapped in
// a standard { message, data } JSON envelope).
type ApiLostFoundItem = {
  id: number;
  type: "lost" | "found";
  title: string;
  location: string;
  date_event: string | null;
  description: string | null;
  contact_info: string | null;
  reward: string | null;
  status: string;
  created_at: string;
  user?: { id: number; name: string } | null;
  images?: ApiImage[] | null;
  category?: { id: number; name: string; slug: string } | null;
};

type LostFoundListResponse = {
  message: string;
  data: {
    current_page: number;
    last_page: number;
    total: number;
    data: ApiLostFoundItem[];
  };
};

type LostFoundCreateResponse = {
  message: string;
  data: ApiLostFoundItem;
};

type ReportType = "lost" | "found";

const EMPTY_FORM = {
  title: "",
  category_id: "",
  location: "",
  date_event: "",
  reward: "",
  description: "",
  contact_info: "",
};

type TypeFilter = "all" | "lost" | "found";

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "lost", label: "Barang Hilang" },
  { value: "found", label: "Barang Ditemukan" },
];

function formatEventDate(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(isoDate)
    ? `${isoDate}T00:00:00`
    : isoDate;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "UP"
  );
}

function StatusBadge({ type, status }: { type: "lost" | "found"; status: string }) {
  if (status === "resolved" || status === "closed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#EFECE8] px-2.5 py-1 text-[13px] font-medium text-[#3F3C39]">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M3 8.5L6.5 12L13 4.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {status === "closed" ? "Ditutup" : "Selesai"}
      </span>
    );
  }
  if (type === "lost") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#FCEAE9] px-2.5 py-1 text-[13px] font-medium text-[#9A3434]">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M8 2L14.5 13H1.5L8 2Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M8 6.5V9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="8" cy="11.3" r="0.8" fill="currentColor" />
        </svg>
        Hilang
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-[#E4F2EA] px-2.5 py-1 text-[13px] font-medium text-[#1E603E]">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M5.5 8.2L7.4 10L10.6 6.4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Ditemukan
    </span>
  );
}

function ReportCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white">
      <div className="aspect-[4/3] animate-pulse bg-[#EFECE8]" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="h-6 w-24 animate-pulse rounded-md bg-[#F4F1EE]" />
          <div className="h-6 w-20 animate-pulse rounded-md bg-[#F4F1EE]" />
        </div>
        <div className="h-5 w-4/5 animate-pulse rounded-lg bg-[#F4F1EE]" />
        <div className="h-4 w-3/5 animate-pulse rounded-lg bg-[#EFECE8]" />
        <div className="h-4 w-full animate-pulse rounded-lg bg-[#F4F1EE]" />
        <div className="mt-auto flex items-center justify-between border-t border-[#F1EDE8] pt-4">
          <div className="h-7 w-28 animate-pulse rounded-full bg-[#F4F1EE]" />
          <div className="h-9 w-20 animate-pulse rounded-full bg-[#F4F1EE]" />
        </div>
      </div>
    </div>
  );
}

export function LostAndFoundContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createRequested = searchParams.get("action") === "create";
  const urlQuery = (searchParams.get("q") ?? "").trim();

  const [items, setItems] = useState<ApiLostFoundItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [query, setQuery] = useState(urlQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(urlQuery);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("lost");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState<{ id: number; url: string; file: File }[]>([]);
  const [backendCategories, setBackendCategories] = useState<PublicCategory[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const photoIdRef = useRef(0);
  const prevUrlQueryRef = useRef(urlQuery);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate user from localStorage on mount
    setCurrentUser(getUser());
    function syncUser() {
      setCurrentUser(getUser());
    }
    window.addEventListener(USER_UPDATED_EVENT, syncUser);
    return () => window.removeEventListener(USER_UPDATED_EVENT, syncUser);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    const t = window.setTimeout(() => {
      setDebouncedQuery((prev) => {
        if (prev !== trimmed) {
          setPage(1);
        }
        return trimmed;
      });
    }, 350);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (urlQuery !== prevUrlQueryRef.current) {
      prevUrlQueryRef.current = urlQuery;
      setQuery(urlQuery);
      setDebouncedQuery(urlQuery);
      setPage(1);
    }
  }, [urlQuery]);

  const loadReports = useCallback(
    async (
      type: TypeFilter,
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
        if (type !== "all") params.set("type", type);
        if (categoryId !== null) params.set("category_id", String(categoryId));
        if (searchQuery !== "") params.set("q", searchQuery);
        const res = await apiFetch<LostFoundListResponse>(`/v1/lost-found?${params.toString()}`);
        if (signal?.aborted) return;
        setItems(res.data.data);
        setPage(res.data.current_page);
        setLastPage(res.data.last_page);
        setTotal(res.data.total);
      } catch {
        if (signal?.aborted) return;
        setItems([]);
        setError("Gagal memuat data laporan. Periksa koneksi ke backend lalu coba lagi.");
      } finally {
        if (signal?.aborted) return;
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchPublicCategories("lost_found")
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
    void loadReports(typeFilter, page, activeCategoryId, debouncedQuery, controller.signal);
    return () => {
      controller.abort();
    };
  }, [typeFilter, page, activeCategoryId, debouncedQuery, loadReports]);

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

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const next = Array.from(files).map((file) => {
      photoIdRef.current += 1;
      return { id: photoIdRef.current, url: URL.createObjectURL(file), file };
    });
    setPhotos((prev) => [...prev, ...next].slice(0, 3));
  }

  function removePhoto(id: number) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  }

  const clearCreateParam = useCallback(() => {
    if (searchParams.get("action") === "create") {
      const next = urlQuery
        ? `/lost-found?q=${encodeURIComponent(urlQuery)}`
        : "/lost-found";
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

  function openModal(type: ReportType) {
    setReportType(type);
    setSubmitError(null);
    setIsModalOpen(true);
  }

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
    const rewardRaw = formData.reward.trim();
    const rewardNumeric = Number(rewardRaw);
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const uploaded =
        photos.length > 0
          ? await Promise.all(photos.map((p) => uploadMedia(p.file, "lost-found")))
          : [];
      const rawContact = formData.contact_info.trim();
      const contactDigits = rawContact.replace(/\D/g, "");
      const normalizedContact =
        contactDigits.startsWith("8") && contactDigits.length >= 9
          ? `0${contactDigits}`
          : rawContact;
      await apiFetch<LostFoundCreateResponse>("/v1/lost-found", {
        method: "POST",
        body: JSON.stringify({
          type: reportType,
          title: formData.title.trim(),
          category_id: formData.category_id === "" ? null : Number(formData.category_id),
          location: formData.location.trim(),
          date_event: formData.date_event === "" ? null : formData.date_event,
          reward:
            rewardRaw === "" || Number.isNaN(rewardNumeric)
              ? null
              : `Rp ${rewardNumeric.toLocaleString("id-ID")}`,
          description: formData.description.trim(),
          contact_info: normalizedContact,
          image_paths: uploaded.map((u) => u.path),
        }),
      });
      const createdType = reportType;
      setIsModalOpen(false);
      setFormData(EMPTY_FORM);
      setPhotos((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.url));
        return [];
      });
      clearCreateParam();
      // Switch the list filter to the new report's type so it appears immediately.
      setTypeFilter(createdType);
      setActiveCategoryId(null);
      setPage(1);
      await loadReports(createdType, 1, null, debouncedQuery);
    } catch (err) {
      const apiError = err as ApiError;
      const fieldErrors = apiError.errors
        ? Object.values(apiError.errors).flat().join(" ")
        : null;
      setSubmitError(fieldErrors || apiError.message || "Gagal mempublikasikan laporan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const previewCategory =
    categoryOptions.find((c) => String(c.id) === formData.category_id)?.name ?? "Kategori barang";
  const previewDate = formData.date_event
    ? formatEventDate(formData.date_event) ?? "Tanggal belum dipilih"
    : "Tanggal belum dipilih";
  const previewReporterName = currentUser?.profile?.name || currentUser?.name || "Mahasiswa UPN";
  const parsedPreviewReward = Number(formData.reward);
  const hasValidPreviewReward =
    reportType === "lost" &&
    formData.reward.trim() !== "" &&
    !Number.isNaN(parsedPreviewReward) &&
    parsedPreviewReward >= 0;

  const filtered = items;
  const activeCategoryName =
    filterCategories.find((c) => c.id === activeCategoryId)?.name ?? null;
  const hasActiveFilter =
    typeFilter !== "all" ||
    activeCategoryId !== null ||
    query.trim() !== "" ||
    debouncedQuery !== "" ||
    urlQuery !== "";

  function clearFilters() {
    setTypeFilter("all");
    setActiveCategoryId(null);
    setQuery("");
    setDebouncedQuery("");
    setPage(1);
    if (urlQuery !== "") {
      prevUrlQueryRef.current = "";
      router.replace("/lost-found");
    }
  }

  return (
    <div className="auth-shell-enter mx-auto max-w-[1200px] space-y-7">
      {/* Header Band */}
      <section className="flex flex-col justify-between gap-5 border-b border-[#E5E0DA] pb-6 lg:flex-row lg:items-end">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] font-medium text-[#6E6A66]">
            <span>Portal Mahasiswa / Lost &amp; Found</span>
            <span aria-hidden="true" className="text-[#CFC8BF]">
              ·
            </span>
            <span>{isLoading ? "Memuat laporan..." : `${total} laporan tercatat`}</span>
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
            Barang Hilang &amp; Temuan
          </h1>
          <p className="max-w-2xl text-[14px] leading-relaxed text-[#57534E]">
            Laporkan barang yang tertinggal atau bantu kembalikan barang temuan di area kampus UPN.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => openModal("lost")}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-5 text-[14px] font-medium text-[#141416] transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:border-[#141416] hover:bg-[#FAF8F6] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
          >
            Lapor hilang
          </button>
          <button
            type="button"
            onClick={() => openModal("found")}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            Lapor temuan
          </button>
        </div>
      </section>

      {/* Unified Type, Search & Category Filters */}
      <section
        aria-label="Filter laporan barang hilang dan temuan"
        className="rounded-[20px] border border-[#E5E0DA] bg-white p-5 sm:p-6"
      >
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter jenis laporan"
        >
          {TYPE_FILTERS.map((opt) => {
            const isActive = typeFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setTypeFilter(opt.value);
                  setPage(1);
                }}
                aria-pressed={isActive}
                className={`min-h-[44px] rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] motion-reduce:transition-none ${
                  isActive
                    ? "bg-[#141416] text-white"
                    : "bg-[#F4F1EE] text-[#57534E] hover:bg-[#EAE6E2] hover:text-[#141416]"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-[#F1EDE8] pt-5 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_auto] lg:items-end">
          <div className="min-w-0">
            <label htmlFor="lost-found-search" className="block text-[13px] font-medium text-[#57534E]">
              Cari judul atau lokasi kampus
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E6A66]">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </span>
              <input
                id="lost-found-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama barang, lokasi kampus, atau ciri khusus"
                className="h-11 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] pl-10 pr-3.5 text-[14px] text-[#141416] placeholder:text-[#66625E] transition-all duration-150 hover:border-[#CFC8BF] focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none"
              />
            </div>
          </div>

          <div className="min-w-0">
            <label htmlFor="lost-found-category" className="block text-[13px] font-medium text-[#57534E]">
              Kategori barang
            </label>
            <div className="relative mt-1.5">
              <select
                id="lost-found-category"
                value={activeCategoryId === null ? "" : String(activeCategoryId)}
                onChange={(e) => {
                  const val = e.target.value;
                  setActiveCategoryId(val === "" ? null : Number(val));
                  setPage(1);
                }}
                className="h-11 w-full appearance-none rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] pl-3.5 pr-9 text-[14px] text-[#141416] transition-all duration-150 hover:border-[#CFC8BF] focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none"
              >
                <option value="">Semua kategori</option>
                {filterCategories.map((cat) => (
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
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-5 text-[14px] font-medium text-[#141416] transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:border-[#141416] hover:bg-[#FAF8F6] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] motion-reduce:transform-none motion-reduce:transition-none"
            >
              Atur ulang filter
            </button>
          )}
        </div>
      </section>

      {/* Catalog Grid */}
      <section aria-label="Daftar laporan barang hilang dan temuan">
        {isLoading ? (
          <div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            role="status"
            aria-busy="true"
            aria-label="Memuat laporan barang hilang dan temuan"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <ReportCardSkeleton key={i} />
            ))}
            <span className="sr-only">Memuat data laporan...</span>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-[20px] border border-[#E5E0DA] bg-white px-6 py-14 text-center"
          >
            <h2 className="font-display text-lg font-semibold text-[#141416]">
              Gagal memuat data laporan
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-[14px] text-[#6E6A66]">{error}</p>
            <button
              type="button"
              onClick={() => void loadReports(typeFilter, page, activeCategoryId, debouncedQuery)}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] motion-reduce:transform-none motion-reduce:transition-none"
            >
              Muat ulang daftar
            </button>
          </div>
        ) : (
          <>
            <p className="mb-4 text-[13px] font-medium text-[#57534E]" aria-live="polite" role="status">
              Menampilkan {filtered.length} dari {total} laporan
              {activeCategoryName ? ` pada kategori ${activeCategoryName}` : ""}
            </p>

            {filtered.length === 0 ? (
              <div className="rounded-[20px] border border-[#E5E0DA] bg-white px-6 py-14 text-center">
                <h2 className="font-display text-lg font-semibold text-[#141416]">
                  {hasActiveFilter ? "Tidak ada laporan sesuai filter" : "Belum ada laporan tercatat"}
                </h2>
                <p className="mx-auto mt-1.5 max-w-md text-[14px] text-[#6E6A66]">
                  {hasActiveFilter
                    ? "Ubah jenis laporan, kategori, atau kata kunci pencarian untuk melihat laporan lain."
                    : "Buat laporan pertama jika Anda kehilangan atau menemukan barang di lingkungan kampus UPN."}
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  {hasActiveFilter ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-6 text-[14px] font-medium text-[#141416] transition-all duration-150 hover:-translate-y-[1px] hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] motion-reduce:transform-none motion-reduce:transition-none"
                    >
                      Atur ulang filter
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openModal("lost")}
                      className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-6 text-[14px] font-medium text-[#141416] transition-all duration-150 hover:-translate-y-[1px] hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] motion-reduce:transform-none motion-reduce:transition-none"
                    >
                      Lapor hilang
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openModal("found")}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] motion-reduce:transform-none motion-reduce:transition-none"
                  >
                    Lapor temuan
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="sr-only">Daftar laporan barang hilang dan temuan</h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((item, idx) => {
                  const categoryName = item.category?.name ?? "Lainnya";
                  const reporterName = item.user?.name ?? "Mahasiswa UPN";
                  const eventDateText =
                    formatEventDate(item.date_event) ?? formatTimeAgo(item.created_at);
                  return (
                    <article
                      key={item.id}
                      className="group flex flex-col overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white transition-all duration-180 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[2px] hover:border-[#CFC8BF] hover:shadow-[0_14px_28px_-14px_rgba(20,20,22,0.10)] focus-within:ring-2 focus-within:ring-[#141416] motion-reduce:transform-none motion-reduce:transition-none"
                    >
                      <Link
                        href={`/lost-found/${item.id}`}
                        aria-label={`Lihat detail ${item.title}`}
                        className="block overflow-hidden bg-[#EFECE8] focus:outline-none"
                      >
                        <ListingImage
                          module="lostfound"
                          seed={item.id}
                          eager={idx < 3}
                          width={800}
                          height={600}
                          hint={`${categoryName} ${item.title}`}
                          images={item.images}
                          alt={`Foto ${item.title}`}
                          className="aspect-[4/3] w-full object-cover transition-transform duration-600 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
                        />
                      </Link>

                      <div className="flex min-w-0 flex-1 flex-col p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded-md bg-[#F4F1EE] px-2.5 py-1 text-[13px] font-medium text-[#57534E]">
                            {categoryName}
                          </span>
                          <StatusBadge type={item.type} status={item.status} />
                        </div>

                        <h3 className="mt-3 line-clamp-2 break-words font-display text-[17px] font-semibold leading-snug text-[#141416]">
                          <Link
                            href={`/lost-found/${item.id}`}
                            className="hover:underline focus:outline-none"
                          >
                            {item.title}
                          </Link>
                        </h3>

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#57534E]">
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 16 16"
                              fill="none"
                              aria-hidden="true"
                              className="shrink-0 text-[#6E6A66]"
                            >
                              <path
                                d="M8 14C8 14 3.5 9.3 3.5 6C3.5 3.5 5.5 1.5 8 1.5C10.5 1.5 12.5 3.5 12.5 6C12.5 9.3 8 14 8 14Z"
                                stroke="currentColor"
                                strokeWidth="1.3"
                                strokeLinejoin="round"
                              />
                              <circle cx="8" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.3" />
                            </svg>
                            <span className="truncate">{item.location}</span>
                          </span>
                          {eventDateText && (
                            <span className="shrink-0 text-[#6E6A66]">{eventDateText}</span>
                          )}
                        </div>

                        {item.reward && (
                          <p className="mt-2.5 w-fit rounded-md bg-[#FAF4E8] px-2.5 py-1 text-[13px] font-semibold text-[#78440E]">
                            Imbalan: {item.reward}
                          </p>
                        )}

                        <p className="mt-2.5 line-clamp-2 flex-1 break-words text-[14px] leading-relaxed text-[#57534E]">
                          {item.description ?? "Tidak ada deskripsi tambahan."}
                        </p>

                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#F1EDE8] pt-4">
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#141416] text-[13px] font-semibold text-white"
                              aria-hidden="true"
                            >
                              {initialsOf(reporterName)}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-medium text-[#141416]">
                                {reporterName}
                              </span>
                              {item.contact_info && (
                                <span className="block truncate text-[13px] text-[#6E6A66]">
                                  {item.contact_info}
                                </span>
                              )}
                            </span>
                          </span>

                          <Link
                            href={`/lost-found/${item.id}`}
                            aria-label={`Lihat detail ${item.title}`}
                            className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full border border-[#E5E0DA] bg-[#FAF8F6] px-4 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#141416] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                          >
                            Lihat detail
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
                </div>
              </>
            )}

            {lastPage > 1 && (
              <nav
                aria-label="Navigasi halaman lost and found"
                className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#E5E0DA] bg-white px-5 py-4 text-[14px] text-[#57534E]"
              >
                <span>
                  Halaman <strong className="font-semibold text-[#141416]">{page}</strong> dari{" "}
                  <strong className="font-semibold text-[#141416]">{lastPage}</strong> ({total} laporan)
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Halaman sebelumnya"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#E5E0DA] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-40"
                  >
                    Sebelumnya
                  </button>
                  <button
                    type="button"
                    disabled={page >= lastPage}
                    onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                    aria-label="Halaman berikutnya"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#E5E0DA] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-40"
                  >
                    Berikutnya
                  </button>
                </div>
              </nav>
            )}
          </>
        )}
      </section>

      {/* Matte Warm-Alabaster Modal Buat Laporan */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#141416]/50 p-4"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lapor-barang-title"
            onClick={(e) => e.stopPropagation()}
            className="auth-shell-enter max-h-[92vh] w-full max-w-[940px] overflow-y-auto rounded-[28px] border border-[#E5E0DA] bg-[#F4F1EE] p-5 shadow-[0_20px_48px_-20px_rgba(20,20,22,0.20)] sm:p-7"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E5E0DA] pb-4">
              <div>
                <p className="text-[13px] font-medium text-[#6E6A66]">
                  Portal Mahasiswa · Buat Laporan Barang
                </p>
                <h2
                  id="lapor-barang-title"
                  className="mt-1 font-display text-2xl font-semibold tracking-tight text-[#141416]"
                >
                  {reportType === "lost" ? "Lapor barang hilang." : "Lapor barang temuan."}{" "}
                  <span className="font-normal text-[#6E6A66]">
                    {reportType === "lost"
                      ? "Bantu rekan kampus mengenali barang Anda."
                      : "Bantu pemilik menemukan kembali barangnya."}
                  </span>
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                aria-label="Tutup form laporan barang"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5E0DA] bg-white text-lg text-[#57534E] transition-colors hover:border-[#141416] hover:text-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5">
              <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.45fr_0.85fr]">
                {/* Form Card */}
                <div className="min-w-0 space-y-5 rounded-[20px] border border-[#E5E0DA] bg-white p-5 sm:p-6">
                  <fieldset>
                    <legend className="text-[14px] font-medium text-[#141416]">
                      Jenis pelaporan <span className="text-[#B83232]">*</span>
                    </legend>
                    <div
                      className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"
                      role="radiogroup"
                      aria-label="Jenis pelaporan"
                    >
                      {(
                        [
                          { value: "lost", label: "Barang Hilang" },
                          { value: "found", label: "Barang Ditemukan" },
                        ] as const
                      ).map((opt) => {
                        const checked = reportType === opt.value;
                        return (
                          <label
                            key={opt.value}
                            className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-full border px-4 py-2 text-center text-[13px] font-medium transition-all focus-within:ring-2 focus-within:ring-[#141416] focus-within:ring-offset-1 ${
                              checked
                                ? "border-[#141416] bg-[#141416] text-white"
                                : "border-[#E5E0DA] bg-[#F6F4F1] text-[#57534E] hover:border-[#CFC8BF] hover:text-[#141416]"
                            }`}
                          >
                            <input
                              type="radio"
                              name="laporan-jenis"
                              value={opt.value}
                              checked={checked}
                              onChange={() => setReportType(opt.value)}
                              className="sr-only"
                            />
                            <span>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <section aria-labelledby="laporan-info-heading" className="space-y-4 border-t border-[#F1EDE8] pt-5">
                    <h3 id="laporan-info-heading" className="font-display text-[16px] font-semibold text-[#141416]">
                      Informasi barang
                    </h3>

                    <div>
                      <label htmlFor="laporan-title" className="block text-[14px] font-medium text-[#141416]">
                        Nama barang <span className="text-[#B83232]">*</span>
                      </label>
                      <input
                        id="laporan-title"
                        type="text"
                        required
                        maxLength={255}
                        value={formData.title}
                        onChange={(e) => updateForm("title", e.target.value)}
                        placeholder="Masukkan nama atau jenis barang"
                        className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 text-[14px] text-[#141416] placeholder:text-[#66625E] transition-all focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="laporan-category" className="block text-[14px] font-medium text-[#141416]">
                        Kategori{" "}
                        {categoryOptions.length > 0 && <span className="text-[#B83232]">*</span>}
                      </label>
                      <div className="relative mt-1.5">
                        <select
                          id="laporan-category"
                          required={categoryOptions.length > 0}
                          value={formData.category_id}
                          onChange={(e) => updateForm("category_id", e.target.value)}
                          disabled={categoryOptions.length === 0}
                          className="h-11 w-full appearance-none rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] pl-3.5 pr-9 text-[14px] text-[#141416] transition-all focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none disabled:opacity-60"
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
                          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      {categoryOptions.length === 0 && (
                        <p className="mt-1.5 text-[13px] text-[#6E6A66]">
                          Kategori belum tersedia. Tunggu data laporan dimuat atau lanjutkan tanpa kategori.
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <label htmlFor="laporan-description" className="block text-[14px] font-medium text-[#141416]">
                          Deskripsi dan ciri khusus <span className="text-[#B83232]">*</span>
                        </label>
                        <span className="text-[13px] text-[#6E6A66]">
                          {formData.description.length} / 2000
                        </span>
                      </div>
                      <textarea
                        id="laporan-description"
                        required
                        rows={4}
                        maxLength={2000}
                        value={formData.description}
                        onChange={(e) => updateForm("description", e.target.value)}
                        placeholder="Jelaskan warna, ciri khusus, kondisi, atau kronologi singkat"
                        className="mt-1.5 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] p-3.5 text-[14px] leading-relaxed text-[#141416] placeholder:text-[#66625E] transition-all focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none"
                      />
                    </div>

                    <div>
                      <span id="laporan-photos-label" className="block text-[14px] font-medium text-[#141416]">
                        {reportType === "lost" ? "Foto referensi barang" : "Dokumentasi foto"} (maksimal 3)
                      </span>
                      <div className="mt-2 flex flex-wrap gap-3" role="group" aria-labelledby="laporan-photos-label">
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
                        {photos.length < 3 && (
                          <label className="flex h-20 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#CFC8BF] bg-[#F6F4F1] text-[#57534E] transition-colors hover:border-[#141416] hover:bg-white focus-within:ring-2 focus-within:ring-[#141416]">
                            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            <span className="text-[13px] font-medium">Tambah</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              aria-label="Unggah foto barang"
                              className="sr-only"
                              onChange={(e) => {
                                addPhotos(e.target.files);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </section>

                  <section aria-labelledby="laporan-lokasi-heading" className="space-y-4 border-t border-[#F1EDE8] pt-5">
                    <h3 id="laporan-lokasi-heading" className="font-display text-[16px] font-semibold text-[#141416]">
                      Lokasi dan waktu
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="laporan-location" className="block text-[14px] font-medium text-[#141416]">
                          Titik kampus <span className="text-[#B83232]">*</span>
                        </label>
                        <input
                          id="laporan-location"
                          type="text"
                          required
                          maxLength={255}
                          value={formData.location}
                          onChange={(e) => updateForm("location", e.target.value)}
                          placeholder="Sebutkan gedung, ruangan, atau area kampus"
                          className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 text-[14px] text-[#141416] placeholder:text-[#66625E] transition-all focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label htmlFor="laporan-date" className="block text-[14px] font-medium text-[#141416]">
                          Tanggal kejadian <span className="text-[#B83232]">*</span>
                        </label>
                        <input
                          id="laporan-date"
                          type="date"
                          required
                          value={formData.date_event}
                          onChange={(e) => updateForm("date_event", e.target.value)}
                          className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 text-[14px] text-[#141416] transition-all focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none"
                        />
                      </div>
                    </div>
                  </section>

                  {reportType === "lost" && (
                    <section
                      aria-labelledby="laporan-imbalan-heading"
                      className="rounded-[20px] border border-[#E8D8BE] bg-[#FAF4E8] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 id="laporan-imbalan-heading" className="text-[14px] font-semibold text-[#141416]">
                          Opsi imbalan <span className="font-normal text-[#57534E]">(Opsional)</span>
                        </h3>
                        <span className="rounded-md bg-[#F3E6CE] px-2.5 py-0.5 text-[13px] font-semibold text-[#78440E]">
                          Khusus barang hilang
                        </span>
                      </div>
                      <div className="mt-3">
                        <label htmlFor="laporan-reward" className="block text-[13px] font-medium text-[#141416]">
                          Nominal imbalan (Rp)
                        </label>
                        <div className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-[#E5E0DA] bg-white px-3.5 transition-all focus-within:border-[#141416] focus-within:shadow-[0_0_0_3px_rgba(20,20,22,0.06)]">
                          <span className="text-[14px] font-semibold text-[#57534E]">Rp</span>
                          <input
                            id="laporan-reward"
                            type="number"
                            min={0}
                            step="any"
                            value={formData.reward}
                            onChange={(e) => updateForm("reward", e.target.value)}
                            placeholder="Masukkan nominal imbalan (opsional)"
                            className="w-full bg-transparent text-[14px] font-semibold text-[#141416] placeholder:font-normal placeholder:text-[#66625E] focus:outline-none"
                          />
                        </div>
                        <p className="mt-1.5 text-[13px] text-[#57534E]">
                          Bersifat sukarela. Nominal dapat disepakati saat serah terima barang.
                        </p>
                      </div>
                    </section>
                  )}

                  <section aria-labelledby="laporan-kontak-heading" className="space-y-3 border-t border-[#F1EDE8] pt-5">
                    <h3 id="laporan-kontak-heading" className="font-display text-[16px] font-semibold text-[#141416]">
                      Kontak pelapor
                    </h3>
                    <div>
                      <label htmlFor="laporan-contact" className="block text-[14px] font-medium text-[#141416]">
                        Nomor WhatsApp <span className="text-[#B83232]">*</span>
                      </label>
                      <div className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 transition-all focus-within:border-[#141416] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(20,20,22,0.06)]">
                        <span className="shrink-0 rounded-md bg-[#EFECE8] px-2 py-0.5 text-[13px] font-semibold text-[#5F5B57]">
                          +62
                        </span>
                        <input
                          id="laporan-contact"
                          type="tel"
                          required
                          maxLength={50}
                          value={formData.contact_info}
                          onChange={(e) => updateForm("contact_info", e.target.value)}
                          placeholder="Masukkan nomor WhatsApp aktif"
                          className="w-full bg-transparent text-[14px] text-[#141416] placeholder:text-[#66625E] focus:outline-none"
                        />
                      </div>
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
                      className="inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-60 motion-reduce:transform-none motion-reduce:transition-none"
                    >
                      {isSubmitting ? "Menyimpan laporan..." : "Publikasikan laporan"}
                    </button>
                  </div>
                </div>

                {/* Live Preview Card + Safety Guide */}
                <div className="min-w-0 space-y-4 lg:sticky lg:top-0">
                  <aside
                    aria-label="Pratinjau kartu laporan"
                    className="rounded-[20px] border border-[#E5E0DA] bg-white p-5"
                  >
                    <p className="text-[13px] font-semibold text-[#141416]">
                      Pratinjau tampilan laporan
                    </p>
                    <div className="mt-3 overflow-hidden rounded-2xl border border-[#EAE5DF] bg-white">
                      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#EFECE8] text-[#5F5B57]">
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
                          <StatusBadge type={reportType} status="open" />
                        </div>
                        <p className="mt-2.5 line-clamp-2 font-display text-[15px] font-semibold text-[#141416]">
                          {formData.title.trim() || "Judul laporan belum diisi"}
                        </p>
                        <p className="mt-1.5 truncate text-[13px] text-[#57534E]">
                          {formData.location.trim() || "Lokasi kejadian belum diisi"}
                        </p>
                        <p className="mt-1 text-[13px] text-[#6E6A66]">
                          {previewDate}
                        </p>
                        {hasValidPreviewReward && (
                          <p className="mt-2 w-fit rounded-md bg-[#FAF4E8] px-2.5 py-0.5 text-[13px] font-semibold text-[#78440E]">
                            Imbalan: Rp {parsedPreviewReward.toLocaleString("id-ID")}
                          </p>
                        )}
                        <div className="mt-3 flex items-center gap-2 border-t border-[#F1EDE8] pt-3">
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#141416] text-[13px] font-semibold text-white"
                            aria-hidden="true"
                          >
                            {initialsOf(previewReporterName)}
                          </span>
                          <span className="truncate text-[13px] font-medium text-[#141416]">
                            {previewReporterName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </aside>

                  <aside
                    aria-label="Panduan pelaporan dan keamanan"
                    className="rounded-[20px] border border-[#E5E0DA] bg-white p-5"
                  >
                    <p className="font-display text-[15px] font-semibold text-[#141416]">
                      {reportType === "lost" ? "Panduan pelaporan" : "Panduan keamanan"}
                    </p>
                    <ul className="mt-2.5 space-y-2 text-[13px] leading-relaxed text-[#57534E]">
                      {reportType === "lost" ? (
                        <>
                          <li>
                            <strong className="text-[#141416]">Lapor ke pos satpam:</strong> segera lapor ke pos terdekat jika barang berharga.
                          </li>
                          <li>
                            <strong className="text-[#141416]">Periksa ruangan:</strong> cek kembali ruangan kelas terakhir sebelum jam kuliah selesai.
                          </li>
                          <li>
                            <strong className="text-[#141416]">Koordinasi aman:</strong> gunakan chat untuk koordinasi awal tanpa membagikan data sensitif.
                          </li>
                        </>
                      ) : (
                        <>
                          <li>
                            <strong className="text-[#141416]">Cek bukti kepemilikan:</strong> minta ciri khusus atau dokumen pendukung sebelum serah terima.
                          </li>
                          <li>
                            <strong className="text-[#141416]">Verifikasi KTM:</strong> cocokkan identitas pengambil dengan KTM aktif.
                          </li>
                          <li>
                            <strong className="text-[#141416]">Titik publik:</strong> lakukan serah terima di area ramai atau titipkan di pos satpam.
                          </li>
                        </>
                      )}
                    </ul>
                  </aside>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LostAndFoundPage() {
  return (
    <Suspense fallback={<p className="text-[14px] text-[#6E6A66]">Memuat lost &amp; found...</p>}>
      <LostAndFoundContent />
    </Suspense>
  );
}
