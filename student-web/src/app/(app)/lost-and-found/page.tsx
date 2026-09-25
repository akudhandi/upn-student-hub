"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, type ApiError } from "@/lib/api";

// ---------------------------------------------------------------------------
// API types — shape of GET /api/v1/lost-found (Laravel paginator wrapped in
// a standard { message, data } JSON envelope).
// ---------------------------------------------------------------------------
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

const TYPE_FILTERS: { value: TypeFilter; label: string; dot: string }[] = [
  { value: "all", label: "Semua", dot: "bg-[#002147]" },
  { value: "lost", label: "Barang Hilang", dot: "bg-rose-600" },
  { value: "found", label: "Barang Ditemukan", dot: "bg-emerald-600" },
];

const PHOTO_TONES = ["bg-[#E7EBF0]", "bg-[#EFE8DC]", "bg-[#E8F0E9]", "bg-[#E9EAF3]"];

function formatEventDate(isoDate: string | null): string {
  if (!isoDate) return "-";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function StatusBadge({ type, status }: { type: "lost" | "found"; status: string }) {
  if (status === "resolved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M3 8.5L6.5 12L13 4.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Selesai
      </span>
    );
  }
  if (type === "lost") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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

function ItemPhoto({ id, title, type, status }: { id: number; title: string; type: "lost" | "found"; status: string }) {
  return (
    <div
      className={`relative flex h-40 w-full shrink-0 items-center justify-center sm:h-auto sm:w-44 ${PHOTO_TONES[id % PHOTO_TONES.length]}`}
      role="img"
      aria-label={`Placeholder foto untuk ${title}`}
    >
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="text-slate-400"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M3 16.5L8.5 11.5L13 16L15.5 13.5L21 19"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="absolute left-2 top-2">
        <StatusBadge type={type} status={status} />
      </span>
    </div>
  );
}

function ReportCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col sm:flex-row">
        <div className="h-40 w-full shrink-0 animate-pulse bg-slate-100 sm:h-auto sm:w-44" />
        <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3">
            <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function LostAndFoundContent() {
  const [items, setItems] = useState<ApiLostFoundItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("lost");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState<{ id: number; url: string }[]>([]);
  const photoIdRef = useRef(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const createRequested = searchParams.get("action") === "create";

  const loadReports = useCallback(async (type: TypeFilter, signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);
      // Resolves to http://localhost:8000/api/v1/lost-found by default
      // (or NEXT_PUBLIC_API_URL when configured).
      const path = type === "all" ? "/v1/lost-found" : `/v1/lost-found?type=${type}`;
      const res = await apiFetch<LostFoundListResponse>(path);
      if (signal?.aborted) return;
      setItems(res.data.data);
    } catch {
      if (signal?.aborted) return;
      setItems([]);
      setError("Gagal memuat data laporan. Periksa koneksi ke backend lalu coba lagi.");
    } finally {
      if (signal?.aborted) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch must populate state on mount and when the type filter changes
    void loadReports(typeFilter, controller.signal);
    return () => {
      controller.abort();
    };
  }, [typeFilter, loadReports]);

  const categories = useMemo(() => {
    const names = new Set<string>();
    for (const item of items) {
      if (item.category?.name) names.add(item.category.name);
    }
    return [...names];
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

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const next = Array.from(files).map((file) => {
      photoIdRef.current += 1;
      return { id: photoIdRef.current, url: URL.createObjectURL(file) };
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
      router.replace("/lost-and-found");
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
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await apiFetch<LostFoundCreateResponse>("/v1/lost-found", {
        method: "POST",
        body: JSON.stringify({
          type: reportType,
          title: formData.title.trim(),
          category_id: formData.category_id === "" ? null : Number(formData.category_id),
          location: formData.location.trim(),
          date_event: formData.date_event === "" ? null : formData.date_event,
          reward:
            rewardRaw === ""
              ? null
              : `Rp ${Number(rewardRaw).toLocaleString("id-ID")}`,
          description: formData.description.trim(),
          contact_info: formData.contact_info.trim(),
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
      setActiveCategory(null);
      await loadReports(createdType);
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
    categoryOptions.find((c) => String(c.id) === formData.category_id)?.name ?? "Kategori Barang";
  const previewDate = formData.date_event
    ? new Date(`${formData.date_event}T00:00:00`).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Tanggal kejadian";

  const filtered = items.filter((item) => {
    if (activeCategory && (item.category?.name ?? "") !== activeCategory) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q) ||
      (item.description ?? "").toLowerCase().includes(q)
    );
  });

  function clearFilters() {
    setTypeFilter("all");
    setActiveCategory(null);
    setQuery("");
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      {/* Header: title left, report actions + search right */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">Lost &amp; Found</h1>
          <p className="mt-1 text-sm text-slate-500">
            Laporkan barang hilang atau bantu kembalikan barang milik orang lain.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
          <div className="relative w-full sm:w-[260px]">
            <label htmlFor="lost-found-search" className="sr-only">
              Cari laporan
            </label>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </span>
            <input
              id="lost-found-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari judul, lokasi, deskripsi…"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:outline-none focus:ring-1 focus:ring-[#002147]"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => openModal("lost")}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Lapor Hilang
            </button>
            <button
              type="button"
              onClick={() => openModal("found")}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#002147] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#001a38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M2.5 2.5H8L13.5 8L8 13.5L2.5 8V2.5Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
                <circle cx="6" cy="6" r="1.2" stroke="currentColor" strokeWidth="1.1" />
              </svg>
              Lapor Temuan
            </button>
          </div>
        </div>
      </div>

      {/* Layout: sidebar filters + feed */}
      <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-4" aria-label="Filter barang hilang dan temuan">
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 id="filter-status-heading" className="text-[13px] font-semibold text-slate-900">
              Filter Status
            </h2>
            <div
              className="mt-3 space-y-2"
              role="radiogroup"
              aria-labelledby="filter-status-heading"
            >
              {TYPE_FILTERS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2.5 text-[13px] text-slate-700"
                >
                  <input
                    type="radio"
                    name="lost-found-status"
                    value={opt.value}
                    checked={typeFilter === opt.value}
                    onChange={() => setTypeFilter(opt.value)}
                    className="h-3.5 w-3.5 shrink-0 accent-[#002147]"
                  />
                  <span className={`h-2 w-2 shrink-0 rounded-full ${opt.dot}`} aria-hidden="true" />
                  {opt.label}
                </label>
              ))}
            </div>
          </section>

          {categories.length > 0 && (
            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 id="categories-heading" className="text-[13px] font-semibold text-slate-900">
                Kategori
              </h2>
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-labelledby="categories-heading">
                {categories.map((cat) => {
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(isActive ? null : cat)}
                      aria-pressed={isActive}
                      className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2 ${
                        isActive
                          ? "border-[#002147] bg-[#002147] text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </aside>

        {/* Feed */}
        <div>
          {isLoading ? (
            <div
              className="space-y-4"
              role="status"
              aria-busy="true"
              aria-label="Memuat laporan hilang dan temuan"
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <ReportCardSkeleton key={i} />
              ))}
              <span className="sr-only">Memuat data laporan…</span>
            </div>
          ) : error ? (
            <div
              role="alert"
              className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center"
            >
              <p className="text-sm font-medium text-slate-900">Gagal memuat data laporan</p>
              <p className="mt-1 text-xs text-slate-500">{error}</p>
              <button
                type="button"
                onClick={() => void loadReports(typeFilter)}
                className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
              >
                Coba lagi
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500" aria-live="polite" role="status">
                Menampilkan {filtered.length} dari {items.length} laporan
                {activeCategory ? ` di ${activeCategory}` : ""}
              </p>

              {filtered.length === 0 ? (
                <div className="mt-3 rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
                  <p className="text-sm font-medium text-slate-900">Tidak ada laporan ditemukan</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Coba ubah filter status, kategori, atau kata kunci.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
                  >
                    Hapus filter
                  </button>
                </div>
              ) : (
                <div className="mt-3 space-y-4">
                  {filtered.map((item) => {
                    const reporterName = item.user?.name ?? "Mahasiswa UPN";
                    const accent =
                      item.status === "resolved"
                        ? "border-l-slate-400"
                        : item.type === "lost"
                          ? "border-l-rose-600"
                          : "border-l-emerald-600";
                    return (
                      <article
                        key={item.id}
                        className={`overflow-hidden rounded-lg border border-slate-200 border-l-4 bg-white focus-within:ring-2 focus-within:ring-[#002147] focus-within:ring-offset-2 ${accent}`}
                      >
                        <div className="flex flex-col sm:flex-row">
                          <Link
                            href={`/lost-found/${item.id}`}
                            aria-label={`Lihat detail ${item.title}`}
                            className="shrink-0 focus:outline-none"
                          >
                            <ItemPhoto id={item.id} title={item.title} type={item.type} status={item.status} />
                          </Link>
                          <div className="flex min-w-0 flex-1 flex-col p-4">
                            <div className="flex items-start justify-between gap-3">
                              <h2 className="text-[15px] font-semibold leading-6 text-slate-900">
                                <Link href={`/lost-found/${item.id}`} className="hover:underline focus:outline-none">
                                  {item.title}
                                </Link>
                              </h2>
                              <span className="shrink-0 text-[11px] text-slate-400">
                                {formatEventDate(item.date_event)}
                              </span>
                            </div>
                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                              <svg
                                width="11"
                                height="11"
                                viewBox="0 0 16 16"
                                fill="none"
                                aria-hidden="true"
                                className="shrink-0"
                              >
                                <path
                                  d="M8 14C8 14 3.5 9.3 3.5 6C3.5 3.5 5.5 1.5 8 1.5C10.5 1.5 12.5 3.5 12.5 6C12.5 9.3 8 14 8 14Z"
                                  stroke="currentColor"
                                  strokeWidth="1.2"
                                  strokeLinejoin="round"
                                />
                                <circle cx="8" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.2" />
                              </svg>
                              {item.location}
                            </p>
                            {item.reward && (
                              <p className="mt-1.5 w-fit rounded-md bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800 ring-1 ring-inset ring-amber-200">
                                Imbalan: {item.reward}
                              </p>
                            )}
                            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">
                              {item.description ?? "Tidak ada deskripsi."}
                            </p>
                            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                              <span className="flex min-w-0 items-center gap-2">
                                <span
                                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white"
                                  aria-hidden="true"
                                >
                                  {initialsOf(reporterName)}
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate text-xs font-medium text-slate-700">
                                    {reporterName}
                                  </span>
                                  {item.contact_info && (
                                    <span className="block truncate text-[11px] text-slate-400">
                                      {item.contact_info}
                                    </span>
                                  )}
                                </span>
                              </span>
                              <Link
                                href={`/lost-found/${item.id}`}
                                aria-label={`Lihat detail ${item.title}`}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-[#002147] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
                              >
                                Lihat Detail
                              </Link>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lapor-barang-title"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-[960px] overflow-y-auto rounded-2xl border border-gray-200 bg-[#F4F5F7]"
          >
            <div className="px-5 pt-5 sm:px-7 sm:pt-6">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] text-slate-400">
                  Beranda <span className="mx-1">/</span> Lost &amp; Found <span className="mx-1">/</span>{" "}
                  <span className="font-semibold text-slate-700">Buat Laporan Barang</span>
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
              <h2 id="lapor-barang-title" className="mt-1.5 text-[22px] font-bold tracking-tight text-slate-900">
                {reportType === "lost" ? "Lapor Barang Hilang (Dicari)" : "Lapor Barang Hilang & Temu"}
              </h2>
              <p className="mt-0.5 max-w-[620px] text-[13px] leading-5 text-slate-500">
                {reportType === "lost"
                  ? "Laporkan barang Anda yang tertinggal atau hilang di area kampus UPN agar rekan mahasiswa dan satpam dapat membantu proses pencarian."
                  : "Laporkan barang hilang atau ditemukan di kampus UPN untuk membantu proses serah terima."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-5 pb-6 pt-4 sm:px-7">
              <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_250px]">
                {/* Main form card */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
                  {/* Jenis Pelaporan */}
                  <fieldset>
                    <legend className="text-[12px] font-semibold text-slate-900">
                      Jenis Pelaporan <span className="text-red-500">*</span>
                    </legend>
                    <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-xl bg-[#F1F3F5] p-1" role="radiogroup" aria-label="Jenis pelaporan">
                      {(
                        [
                          { value: "found", label: "Barang Ditemukan" },
                          { value: "lost", label: "Barang Hilang" },
                        ] as const
                      ).map((opt) => {
                        const checked = reportType === opt.value;
                        return (
                          <label
                            key={opt.value}
                            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[12px] transition-colors ${
                              checked
                                ? opt.value === "lost"
                                  ? "bg-white font-bold text-amber-700 shadow-sm ring-1 ring-inset ring-amber-200"
                                  : "bg-white font-bold text-emerald-700 shadow-sm ring-1 ring-inset ring-emerald-200"
                                : "text-slate-500 hover:text-slate-700"
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
                            {opt.label}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  {/* Informasi Barang */}
                  <section aria-labelledby="laporan-info-heading" className="mt-5 border-t border-slate-100 pt-5">
                    <h3 id="laporan-info-heading" className="text-[14px] font-bold text-slate-900">Informasi Barang</h3>
                    <div className="mt-3">
                      <label htmlFor="laporan-title" className="text-[12px] font-semibold text-slate-900">
                        Nama Barang <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="laporan-title"
                        type="text"
                        required
                        maxLength={255}
                        value={formData.title}
                        onChange={(e) => updateForm("title", e.target.value)}
                        placeholder={reportType === "lost" ? "Tumbler Corkcicle Biru Navy 500ml" : "Gantungan Kunci Honda + Lanyard UPN Merah"}
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002147]/15"
                      />
                    </div>
                    <div className="mt-4">
                      <label htmlFor="laporan-category" className="text-[12px] font-semibold text-slate-900">
                        Kategori <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="laporan-category"
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
                          Kategori belum tersedia. Tunggu data laporan dimuat.
                        </p>
                      )}
                    </div>
                    <div className="mt-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <label htmlFor="laporan-description" className="text-[12px] font-semibold text-slate-900">
                          Deskripsi &amp; Ciri Khusus <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[10px] text-slate-400">{formData.description.length} / 2000</span>
                      </div>
                      <textarea
                        id="laporan-description"
                        required
                        rows={4}
                        maxLength={2000}
                        value={formData.description}
                        onChange={(e) => updateForm("description", e.target.value)}
                        placeholder="Warna, ukuran, stiker, lecet, isi, dan ciri lain yang memudahkan identifikasi…"
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 text-[13px] leading-5 text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002147]/15"
                      />
                    </div>
                    <div className="mt-4">
                      <span id="laporan-photos-label" className="text-[12px] font-semibold text-slate-900">
                        {reportType === "lost" ? "Foto Referensi Barang" : "Dokumentasi Foto"}{" "}
                        <span className="font-normal text-slate-400">(Maks. 3 foto)</span>
                      </span>
                      <div className="mt-1.5 flex flex-wrap gap-2" role="group" aria-labelledby="laporan-photos-label">
                        {photos.map((photo, i) => (
                          <span key={photo.id} className="relative h-20 w-20">
                            {/* eslint-disable-next-line @next/next/no-img-element -- local object URLs for instant upload preview only */}
                            <img
                              src={photo.url}
                              alt={`Foto barang ${i + 1}`}
                              className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
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
                        {photos.length < 3 && (
                          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-slate-300 bg-[#F1F3F5] text-slate-500 hover:border-slate-400 hover:bg-slate-100 focus-within:outline-none focus-within:ring-2 focus-within:ring-[#002147] focus-within:ring-offset-2">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                              <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.5 2" />
                              <path d="M8 5.5V10.5M5.5 8H10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                            </svg>
                            <span className="text-[10px] font-medium">+ Foto</span>
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

                  {/* Lokasi & Waktu */}
                  <section aria-labelledby="laporan-lokasi-heading" className="mt-5 border-t border-slate-100 pt-5">
                    <h3 id="laporan-lokasi-heading" className="text-[14px] font-bold text-slate-900">Lokasi &amp; Waktu</h3>
                    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="laporan-location" className="text-[12px] font-semibold text-slate-900">
                          Titik Kampus <span className="text-red-500">*</span>
                        </label>
                        <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 focus-within:border-[#002147] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#002147]/15">
                          <input
                            id="laporan-location"
                            type="text"
                            required
                            maxLength={255}
                            value={formData.location}
                            onChange={(e) => updateForm("location", e.target.value)}
                            placeholder="Lobi Utama FTI (Gedung Pattimura)"
                            className="w-full bg-transparent text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
                          />
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-slate-400">
                            <path d="M8 14C8 14 3.5 9.3 3.5 6C3.5 3.5 5.5 1.5 8 1.5C10.5 1.5 12.5 3.5 12.5 6C12.5 9.3 8 14 8 14Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                            <circle cx="8" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.2" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="laporan-date" className="text-[12px] font-semibold text-slate-900">
                          Tanggal <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="laporan-date"
                          type="date"
                          required
                          value={formData.date_event}
                          onChange={(e) => updateForm("date_event", e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 text-[13px] text-slate-900 focus:border-[#002147] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002147]/15"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Imbalan — highlighted for lost reports */}
                  {reportType === "lost" && (
                    <section aria-labelledby="laporan-imbalan-heading" className="mt-5 rounded-xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-200">
                      <div className="flex items-center justify-between gap-2">
                        <h3 id="laporan-imbalan-heading" className="text-[13px] font-bold text-slate-900">
                          Bantuan &amp; Opsi Imbalan <span className="font-normal text-slate-500">(Opsional)</span>
                        </h3>
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          Khusus Barang Hilang
                        </span>
                      </div>
                      <div className="mt-3">
                        <label htmlFor="laporan-reward" className="text-[12px] font-semibold text-slate-900">
                          Nominal Imbalan (Rp)
                        </label>
                        <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-2.5 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-200">
                          <span className="text-[13px] font-semibold text-slate-500">Rp</span>
                          <input
                            id="laporan-reward"
                            type="number"
                            min={0}
                            step="any"
                            value={formData.reward}
                            onChange={(e) => updateForm("reward", e.target.value)}
                            placeholder="50000"
                            className="w-full bg-transparent text-[13px] font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Sukarela — nominal dapat disepakati saat serah terima barang.
                        </p>
                      </div>
                    </section>
                  )}

                  {/* Kontak */}
                  <section aria-labelledby="laporan-kontak-heading" className="mt-5 border-t border-slate-100 pt-5">
                    <h3 id="laporan-kontak-heading" className="text-[14px] font-bold text-slate-900">Kontak Pelapor</h3>
                    <div className="mt-3">
                      <label htmlFor="laporan-contact" className="text-[12px] font-semibold text-slate-900">
                        Nomor WhatsApp <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 focus-within:border-[#002147] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#002147]/15">
                        <span className="shrink-0 rounded bg-slate-200/70 px-1.5 py-0.5 text-[12px] font-semibold text-slate-600">+62</span>
                        <input
                          id="laporan-contact"
                          type="tel"
                          required
                          maxLength={50}
                          value={formData.contact_info}
                          onChange={(e) => updateForm("contact_info", e.target.value)}
                          placeholder="812-3456-7890"
                          className="w-full bg-transparent text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  </section>

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
                      {isSubmitting ? "Menyimpan…" : "Publikasikan Laporan"}
                    </button>
                  </div>
                </div>

                {/* Live preview + guide */}
                <div className="space-y-4 lg:sticky lg:top-0">
                  <aside aria-label="Pratinjau feed laporan" className="rounded-xl border border-gray-200 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pratinjau Feed</p>
                      <span className="text-[10px] font-medium text-slate-400">Publik</span>
                    </div>
                    <div className="mt-2 overflow-hidden rounded-lg border border-slate-100">
                      <div className="relative flex aspect-[16/9] items-center justify-center bg-[#E9EDF2]">
                        {photos.length > 0 ? (
                          // eslint-disable-next-line @next/next/no-img-element -- local object URLs for instant upload preview only
                          <img src={photos[0].url} alt="Pratinjau foto barang" className="h-full w-full object-cover" />
                        ) : (
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-slate-400">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.3" />
                            <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.3" />
                            <path d="M3 16L8.5 11L13 15.5L16 13L21 18" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
                          </svg>
                        )}
                        <span className={`absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${reportType === "lost" ? "bg-amber-500" : "bg-emerald-600"}`}>
                          {reportType === "lost" ? "HILANG (DICARI)" : "DITEMUKAN"}
                        </span>
                        <span className="absolute right-2 top-2 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                          {previewDate}
                        </span>
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-teal-700">{previewCategory}</p>
                        <p className="mt-0.5 line-clamp-2 text-[12px] font-bold leading-5 text-slate-900">
                          {formData.title || "Judul laporan akan tampil di sini"}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
                            <path d="M8 14C8 14 3.5 9.3 3.5 6C3.5 3.5 5.5 1.5 8 1.5C10.5 1.5 12.5 3.5 12.5 6C12.5 9.3 8 14 8 14Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                            <circle cx="8" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.2" />
                          </svg>
                          <span className="truncate">{formData.location || "Lokasi kejadian"}</span>
                        </p>
                        <p className={`mt-1.5 text-[10px] font-semibold ${reportType === "lost" ? "text-amber-700" : "text-emerald-700"}`}>
                          Status: {reportType === "lost" ? "Sedang Dicari" : "Menunggu Klaim"}
                        </p>
                      </div>
                    </div>
                  </aside>
                  <aside aria-label="Panduan pelaporan" className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-[12px] font-bold text-slate-900">
                      {reportType === "lost" ? "ⓘ Panduan Pelaporan" : "🛡 Panduan Keamanan"}
                    </p>
                    <ul className="mt-2 space-y-2 text-[11px] leading-4 text-slate-500">
                      {reportType === "lost" ? (
                        <>
                          <li><strong className="text-slate-700">Lapor ke Pos Satpam:</strong> segera lapor ke pos terdekat jika barang berharga.</li>
                          <li><strong className="text-slate-700">Periksa ruangan:</strong> periksa kembali ruangan kelas terakhir sebelum jam perkuliahan usai.</li>
                          <li><strong className="text-slate-700">Koordinasi aman:</strong> gunakan chat untuk koordinasi awal tanpa membagikan data pribadi sensitif.</li>
                        </>
                      ) : (
                        <>
                          <li><strong className="text-slate-700">Cek STNK / dokumen:</strong> minta bukti kepemilikan sebelum serah terima.</li>
                          <li><strong className="text-slate-700">Verifikasi KTM:</strong> cocokkan identitas pengambil dengan KTM aktif.</li>
                          <li><strong className="text-slate-700">Titik publik:</strong> janjian serah terima di tempat ramai atau titipkan di pos satpam.</li>
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
    <Suspense fallback={<p className="text-sm text-slate-500">Memuat lost &amp; found…</p>}>
      <LostAndFoundContent />
    </Suspense>
  );
}
