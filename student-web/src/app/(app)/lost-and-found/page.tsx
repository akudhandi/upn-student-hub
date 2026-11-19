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
import { getToken, getUser, USER_UPDATED_EVENT, type AuthUser } from "@/lib/auth";
import type { ApiImage } from "@/lib/images";
import { fetchFavorites, toggleFavorite } from "@/lib/interactions";

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
  user?: {
    id: number;
    name: string;
    is_official_account?: boolean;
  } | null;
  images?: ApiImage[] | null;
  category?: { id: number; name: string; slug: string } | null;
};

type LostFoundListResponse = {
  message: string;
  data: {
    current_page: number;
    last_page: number;
    from?: number | null;
    to?: number | null;
    total: number;
    data: ApiLostFoundItem[];
  };
};

type LostFoundCreateResponse = {
  message: string;
  data: ApiLostFoundItem;
};

type ReportType = "lost" | "found";
type TypeFilter = "all" | "lost" | "found";
type ContactChannel = "chat" | "whatsapp" | "instagram" | "telegram" | "other";
type OpenMenuKey =
  | "type"
  | "category-mobile"
  | "category-overflow"
  | "modal-category"
  | "modal-contact-channel";

const EMPTY_FORM = {
  title: "",
  category_id: "",
  location: "",
  date_event: "",
  reward: "",
  description: "",
  contact_info: "",
};

const CONTACT_CHANNEL_OPTIONS: { value: ContactChannel; label: string }[] = [
  { value: "chat", label: "Chat dalam aplikasi saja (Privasi)" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "telegram", label: "Telegram" },
  { value: "other", label: "Media sosial / kontak lain" },
];

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "Semua laporan" },
  { value: "lost", label: "Barang hilang" },
  { value: "found", label: "Barang ditemukan" },
];

const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function subscribeNoop() {
  return () => {};
}

function formatEventDate(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? `${isoDate}T00:00:00` : isoDate;
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

function CustomSelectField({
  id,
  label,
  requiredMarker,
  value,
  displayLabel,
  isOpen,
  disabled,
  placement = "bottom",
  onToggle,
  onSelect,
  options,
  className,
}: {
  id: string;
  label: string;
  requiredMarker?: boolean;
  value: string;
  displayLabel: string;
  isOpen: boolean;
  disabled?: boolean;
  placement?: "bottom" | "top";
  onToggle: () => void;
  onSelect: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[13px] font-medium text-[#57534E]">
        {label} {requiredMarker && <span className="text-[#B83232]">*</span>}
      </label>
      <div className="relative mt-1.5">
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={onToggle}
          className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-left text-[14px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-60 ${
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
            className={`absolute left-0 z-30 w-full min-w-[210px] rounded-2xl border border-[#E5E0DA] bg-white p-1.5 shadow-[0_18px_36px_-18px_rgba(20,20,22,0.18)] ${
              placement === "top" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]"
            }`}
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
          <div className="h-4 w-16 animate-pulse rounded-lg bg-[#F4F1EE]" />
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
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [rangeEnd, setRangeEnd] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [openMenu, setOpenMenu] = useState<OpenMenuKey | null>(null);
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
  const [reportType, setReportType] = useState<ReportType>("lost");
  const [contactChannel, setContactChannel] = useState<ContactChannel>("chat");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState<{ id: number; url: string; file: File }[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [backendCategories, setBackendCategories] = useState<PublicCategory[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getUser());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const photoIdRef = useRef(0);
  const photosRef = useRef(photos);
  const filterBarRef = useRef<HTMLElement | null>(null);
  const modalCategoryDropdownRef = useRef<HTMLDivElement | null>(null);
  const modalContactChannelDropdownRef = useRef<HTMLDivElement | null>(null);
  const catalogSectionRef = useRef<HTMLElement | null>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
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
    function syncUser() {
      setCurrentUser(getUser());
    }
    window.addEventListener(USER_UPDATED_EVENT, syncUser);
    return () => window.removeEventListener(USER_UPDATED_EVENT, syncUser);
  }, []);

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
    if (!getToken()) return;
    let active = true;
    fetchFavorites()
      .then((entries) => {
        if (!active) return;
        const ids = new Set<number>();
        for (const entry of entries) {
          if (entry.type === "lostfound" && typeof entry.item?.id === "number") {
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
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (activeCategoryId !== null) params.set("category_id", String(activeCategoryId));
    if (urlQuery !== "") params.set("q", urlQuery);

    apiFetch<LostFoundListResponse>(`/v1/lost-found?${params.toString()}`)
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
        setError("Gagal memuat data laporan. Periksa koneksi backend lalu muat ulang.");
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [typeFilter, page, activeCategoryId, urlQuery, reloadNonce]);

  const applySearchToUrl = useCallback(
    (rawValue: string) => {
      const trimmed = rawValue.trim();
      if (trimmed === urlQuery) return;
      setIsLoading(true);
      setPage(1);
      const next = trimmed ? `/lost-found?q=${encodeURIComponent(trimmed)}` : "/lost-found";
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
      const next = urlQuery
        ? `/lost-found?q=${encodeURIComponent(urlQuery)}`
        : "/lost-found";
      router.replace(next, { scroll: false });
    }
  }, [router, searchParams, urlQuery]);

  const openModal = useCallback((triggerEl?: HTMLButtonElement | null) => {
    if (triggerEl) lastTriggerRef.current = triggerEl;
    setReportType("lost");
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
        lastTriggerRef.current?.focus({ preventScroll: true });
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
        if (openMenu === "modal-category" || openMenu === "modal-contact-channel") {
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
        if (modalCategoryDropdownRef.current && !modalCategoryDropdownRef.current.contains(target)) {
          setOpenMenu(null);
        }
        return;
      }
      if (openMenu === "modal-contact-channel") {
        if (
          modalContactChannelDropdownRef.current &&
          !modalContactChannelDropdownRef.current.contains(target)
        ) {
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
        openMenu !== "modal-contact-channel"
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

  function toggleMenu(key: OpenMenuKey) {
    setOpenMenu((prev) => (prev === key ? null : key));
  }

  function updateForm<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPhotoError(null);

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      setPhotoError(`Maksimal ${MAX_PHOTOS} foto per laporan.`);
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

  async function handleToggleFavorite(item: ApiLostFoundItem) {
    if (!getToken()) {
      setFeedbackNotice({
        tone: "info",
        text: "Masuk dengan akun mahasiswa UPN untuk menyimpan laporan ke daftar favorit.",
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
      const favorited = await toggleFavorite("lostfound", item.id);
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
    const rewardRaw = formData.reward.trim();
    const rewardNumeric = Number(rewardRaw);

    let normalizedContact: string | null = null;
    const rawContact = formData.contact_info.trim();
    if (contactChannel === "whatsapp") {
      const contactDigits = rawContact.replace(/\D/g, "");
      if (contactDigits.length < 9) {
        setSubmitError("Masukkan nomor WhatsApp aktif yang valid atau pilih opsi Chat dalam aplikasi.");
        return;
      }
      normalizedContact = contactDigits.startsWith("8") ? `0${contactDigits}` : rawContact;
    } else if (contactChannel === "instagram") {
      const handle = rawContact.replace(/^@+/, "").replace(/\s+/g, "");
      if (!handle) {
        setSubmitError("Masukkan username Instagram atau pilih opsi Chat dalam aplikasi.");
        return;
      }
      normalizedContact = `Instagram: @${handle}`;
    } else if (contactChannel === "telegram") {
      const handle = rawContact.replace(/^@+/, "").replace(/\s+/g, "");
      if (!handle) {
        setSubmitError("Masukkan username Telegram atau pilih opsi Chat dalam aplikasi.");
        return;
      }
      normalizedContact = `Telegram: @${handle}`;
    } else if (contactChannel === "other") {
      if (!rawContact) {
        setSubmitError("Masukkan ID atau kontak yang dapat dihubungi, atau pilih opsi Chat dalam aplikasi.");
        return;
      }
      normalizedContact = rawContact;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const uploaded =
        photos.length > 0
          ? await Promise.all(photos.map((p) => uploadMedia(p.file, "lost-found")))
          : [];
      const created = await apiFetch<LostFoundCreateResponse>("/v1/lost-found", {
        method: "POST",
        body: JSON.stringify({
          type: reportType,
          title: formData.title.trim(),
          category_id: formData.category_id === "" ? null : Number(formData.category_id),
          location: formData.location.trim(),
          date_event: formData.date_event === "" ? null : formData.date_event,
          reward:
            reportType === "lost" && rewardRaw !== "" && !Number.isNaN(rewardNumeric) && rewardNumeric >= 0
              ? `Rp ${rewardNumeric.toLocaleString("id-ID")}`
              : null,
          description: formData.description.trim(),
          contact_info: normalizedContact,
          image_paths: uploaded.map((u) => u.path),
        }),
      });
      const createdType = reportType;
      setIsModalManuallyOpen(false);
      setOpenMenu(null);
      setFormData(EMPTY_FORM);
      setContactChannel("chat");
      setPhotoError(null);
      setPhotos((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.url));
        return [];
      });
      clearCreateParam();
      setIsLoading(true);
      setTypeFilter(createdType);
      setActiveCategoryId(null);
      setPage(1);
      setReloadNonce((n) => n + 1);
      setFeedbackNotice({
        tone: "success",
        text: `Laporan "${created.data.title}" berhasil dipublikasikan.`,
        href: `/lost-found/${created.data.id}`,
        hrefLabel: "Buka halaman laporan",
      });
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

  const activeTypeLabel = TYPE_OPTIONS.find((t) => t.value === typeFilter)?.label ?? "Semua laporan";
  const activeCategoryName =
    activeCategoryId !== null
      ? (categoryOptions.find((c) => c.id === activeCategoryId)?.name ?? null)
      : null;

  const hasActiveFilter =
    typeFilter !== "all" || activeCategoryId !== null || urlQuery !== "";

  function clearFilters() {
    setIsLoading(true);
    setOpenMenu(null);
    setTypeFilter("all");
    setActiveCategoryId(null);
    setSearchDraft({ base: "", value: "" });
    setPage(1);
    if (urlQuery !== "") {
      router.replace("/lost-found", { scroll: false });
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
            <span className="text-[#141416]">Lost &amp; Found</span>
            <span aria-hidden="true" className="text-[#CFC8BF]">
              ·
            </span>
            <span>{isLoading ? "Memuat laporan..." : `${total} laporan tercatat`}</span>
          </nav>

          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[#141416] sm:text-[32px] sm:leading-[1.18]">
            Barang Hilang &amp; Temuan.{" "}
            <span className="font-normal text-[#6E6A66]">
              Laporkan barang tertinggal atau bantu kembalikan temuan di kampus.
            </span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={(e) => openModal(e.currentTarget)}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            Buat Laporan
          </button>
        </div>
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

      {/* Search, Type & Editorial Category Filters */}
      <section
        ref={filterBarRef}
        aria-label="Pencarian dan filter laporan lost and found"
        className="rounded-[20px] border border-[#E5E0DA] bg-white p-5 sm:p-6"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1.65fr_1fr]">
          {/* Inline Search */}
          <form
            role="search"
            className="sm:col-span-2 lg:col-span-1"
            onSubmit={(e) => {
              e.preventDefault();
              applySearchToUrl(searchInput);
            }}
          >
            <label htmlFor="lost-found-search" className="block text-[13px] font-medium text-[#57534E]">
              Cari nama barang atau lokasi kampus
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
                id="lost-found-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchDraft({ base: urlQuery, value: e.target.value })}
                placeholder="Cari nama barang, lokasi kampus, atau ciri khusus"
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

          {/* Custom Type Dropdown */}
          <CustomSelectField
            id="lost-found-type"
            label="Jenis laporan"
            value={typeFilter}
            displayLabel={activeTypeLabel}
            isOpen={openMenu === "type"}
            onToggle={() => toggleMenu("type")}
            onSelect={(nextVal) => {
              setIsLoading(true);
              setTypeFilter(nextVal as TypeFilter);
              setOpenMenu(null);
              setPage(1);
            }}
            options={TYPE_OPTIONS}
          />

          {/* Mobile / Tablet Custom Category Dropdown */}
          <CustomSelectField
            id="lost-found-category-mobile"
            label="Kategori barang"
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
                    aria-label="Kategori lost and found lainnya"
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
        aria-label="Daftar laporan barang hilang dan temuan"
        className="space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] text-[#57534E]" aria-live="polite" role="status">
            {isLoading ? (
              "Memuat data laporan..."
            ) : total === 0 ? (
              "0 laporan ditemukan"
            ) : rangeStart !== null && rangeEnd !== null ? (
              <>
                Menampilkan{" "}
                <strong className="font-semibold text-[#141416]">
                  {rangeStart}-{rangeEnd}
                </strong>{" "}
                dari <strong className="font-semibold text-[#141416]">{total}</strong> laporan
              </>
            ) : (
              <>
                <strong className="font-semibold text-[#141416]">{total}</strong> laporan tercatat
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
              {typeFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => {
                    setIsLoading(true);
                    setTypeFilter("all");
                    setPage(1);
                  }}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D9D2C9] bg-white px-3.5 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                >
                  <span>Jenis: {activeTypeLabel}</span>
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
              {hasActiveFilter ? "Tidak ada laporan sesuai filter" : "Belum ada laporan tercatat"}
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-[14px] text-[#6E6A66]">
              {hasActiveFilter
                ? "Ubah jenis laporan, kategori, atau kata kunci pencarian untuk melihat laporan lain."
                : "Buat laporan pertama jika Anda kehilangan atau menemukan barang di lingkungan kampus UPN."}
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
                Buat Laporan
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, idx) => {
              const categoryName = item.category?.name ?? "Lainnya";
              const reporterName = item.user?.name ?? "Mahasiswa UPN";
              const eventDateText =
                formatEventDate(item.date_event) ?? formatTimeAgo(item.created_at);
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
                      module="lostfound"
                      seed={item.id}
                      eager={idx < 3}
                      width={800}
                      height={600}
                      hint={`${categoryName} ${item.title}`}
                      images={item.images}
                      alt={`Foto ${item.title}`}
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
                      <StatusBadge type={item.type} status={item.status} />
                    </div>

                    <h2 className="mt-3 line-clamp-2 break-words font-display text-[16px] font-semibold leading-snug text-[#141416]">
                      <Link
                        href={`/lost-found/${item.id}`}
                        className="after:absolute after:inset-0 hover:underline focus:outline-none"
                      >
                        {item.title}
                      </Link>
                    </h2>

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

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#F1EDE8] pt-4">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#141416] text-[13px] font-semibold text-white"
                          aria-hidden="true"
                        >
                          {initialsOf(reporterName)}
                        </span>
                        <span className="truncate text-[13px] font-medium text-[#141416]">
                          {reporterName}
                        </span>
                        {item.user?.is_official_account && (
                          <VerifiedBadge size="xs" title="Akun resmi terverifikasi UPN" />
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
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                aria-label="Halaman sebelumnya"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#E5E0DA] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={page >= lastPage}
                onClick={() => handlePageChange(Math.min(lastPage, page + 1))}
                aria-label="Halaman berikutnya"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#E5E0DA] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          </nav>
        )}
      </section>

      {/* Matte Warm-Alabaster Modal Buat Laporan.
          Rendered in a portal on document.body: the page wrapper runs an entrance
          animation that leaves a transform behind, which would turn this fixed
          overlay into one positioned against the tall page (and under the sticky
          topbar) instead of the viewport. */}
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
            aria-labelledby="lapor-barang-title"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[940px] flex-col overflow-hidden rounded-[28px] border border-[#E5E0DA] bg-[#F4F1EE] shadow-[0_20px_48px_-20px_rgba(20,20,22,0.20)] sm:max-h-[calc(100dvh-4rem)]"
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
                  aria-label="Tutup form laporan barang"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5E0DA] bg-white text-lg text-[#57534E] transition-colors hover:border-[#141416] hover:text-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
                >
                  ×
                </button>
              </div>
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

            <form
              onSubmit={handleSubmit}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-5 sm:px-7 sm:pb-7"
            >
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
                            className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border px-4 py-2 text-center text-[13px] font-medium transition-all focus-within:ring-2 focus-within:ring-[#141416] focus-within:ring-offset-1 ${
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
                      <div className="flex items-baseline justify-between gap-2">
                        <label htmlFor="laporan-title" className="block text-[14px] font-medium text-[#141416]">
                          Nama barang <span className="text-[#B83232]">*</span>
                        </label>
                        <span className="text-[13px] text-[#6E6A66]">
                          {formData.title.length}/255
                        </span>
                      </div>
                      <input
                        ref={titleInputRef}
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

                    <div ref={modalCategoryDropdownRef}>
                      <CustomSelectField
                        id="laporan-category"
                        label="Kategori"
                        value={formData.category_id}
                        displayLabel={
                          formData.category_id === ""
                            ? "Pilih kategori (opsional)"
                            : (categoryOptions.find((c) => String(c.id) === formData.category_id)?.name ??
                              "Pilih kategori (opsional)")
                        }
                        isOpen={openMenu === "modal-category"}
                        disabled={categoryOptions.length === 0}
                        onToggle={() => toggleMenu("modal-category")}
                        onSelect={(nextVal) => {
                          updateForm("category_id", nextVal);
                          setOpenMenu(null);
                        }}
                        options={[
                          { value: "", label: "Tanpa kategori" },
                          ...categoryOptions.map((cat) => ({
                            value: String(cat.id),
                            label: cat.name,
                          })),
                        ]}
                      />
                      {categoryOptions.length === 0 && (
                        <p className="mt-1.5 text-[13px] text-[#6E6A66]">
                          Kategori belum tersedia. Anda tetap dapat melanjutkan tanpa kategori.
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <label htmlFor="laporan-description" className="block text-[14px] font-medium text-[#141416]">
                          Deskripsi dan ciri khusus <span className="text-[#B83232]">*</span>
                        </label>
                        <span className="text-[13px] text-[#6E6A66]">
                          {formData.description.length}/2000
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
                      <div className="flex items-center justify-between gap-2">
                        <span id="laporan-photos-label" className="block text-[14px] font-medium text-[#141416]">
                          {reportType === "lost" ? "Foto referensi barang" : "Dokumentasi foto"} ({photos.length}/{MAX_PHOTOS})
                        </span>
                        <span className="text-[13px] text-[#6E6A66]">
                          Foto pertama menjadi sampul
                        </span>
                      </div>
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
                      {photoError && (
                        <p role="alert" className="mt-2 text-[13px] font-medium text-[#B83232]">
                          {photoError}
                        </p>
                      )}
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
                    <div ref={modalContactChannelDropdownRef}>
                      <CustomSelectField
                        id="laporan-contact-channel"
                        label="Preferensi kontak"
                        placement="top"
                        value={contactChannel}
                        displayLabel={
                          CONTACT_CHANNEL_OPTIONS.find((opt) => opt.value === contactChannel)
                            ?.label ?? "Chat dalam aplikasi saja (Privasi)"
                        }
                        isOpen={openMenu === "modal-contact-channel"}
                        onToggle={() => toggleMenu("modal-contact-channel")}
                        onSelect={(nextVal) => {
                          setContactChannel(nextVal as ContactChannel);
                          updateForm("contact_info", "");
                          setSubmitError(null);
                          setOpenMenu(null);
                        }}
                        options={CONTACT_CHANNEL_OPTIONS}
                      />
                    </div>

                    {contactChannel === "chat" ? (
                      <p className="rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-4 py-3 text-[13px] leading-relaxed text-[#57534E]">
                        Nomor telepon dan akun media sosial Anda tetap privat. Rekan kampus tetap dapat menghubungi Anda lewat{" "}
                        <strong className="font-semibold text-[#141416]">
                          Chat 1-on-1 dalam aplikasi
                        </strong>{" "}
                        pada halaman detail laporan.
                      </p>
                    ) : (
                      <div>
                        <label htmlFor="laporan-contact" className="block text-[14px] font-medium text-[#141416]">
                          {contactChannel === "whatsapp"
                            ? "Nomor WhatsApp"
                            : contactChannel === "instagram"
                              ? "Username Instagram"
                              : contactChannel === "telegram"
                                ? "Username Telegram"
                                : "Kontak atau ID media sosial lain"}{" "}
                          <span className="text-[#B83232]">*</span>
                        </label>
                        <div className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 transition-all focus-within:border-[#141416] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(20,20,22,0.06)]">
                          {(contactChannel === "whatsapp" ||
                            contactChannel === "instagram" ||
                            contactChannel === "telegram") && (
                            <span className="shrink-0 rounded-md bg-[#EFECE8] px-2 py-0.5 text-[13px] font-semibold text-[#5F5B57]">
                              {contactChannel === "whatsapp" ? "+62" : "@"}
                            </span>
                          )}
                          <input
                            id="laporan-contact"
                            type={contactChannel === "whatsapp" ? "tel" : "text"}
                            required
                            maxLength={contactChannel === "other" ? 65 : 50}
                            value={formData.contact_info}
                            onChange={(e) => updateForm("contact_info", e.target.value)}
                            placeholder={
                              contactChannel === "whatsapp"
                                ? "Masukkan nomor WhatsApp aktif"
                                : contactChannel === "instagram"
                                  ? "Username Instagram tanpa @"
                                  : contactChannel === "telegram"
                                    ? "Username Telegram tanpa @"
                                    : "Masukkan ID media sosial atau kanal aktif"
                            }
                            className="w-full bg-transparent text-[14px] text-[#141416] placeholder:text-[#66625E] focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
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
        </div>,
        document.body
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
