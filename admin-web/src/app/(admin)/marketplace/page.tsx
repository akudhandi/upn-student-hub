"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ActionIcon } from "@/components/admin/ActionIcons";
import AdminImage from "@/components/admin/AdminImage";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import Pagination from "@/components/admin/Pagination";
import SelectWrapper from "@/components/admin/SelectWrapper";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  bulkUpdateMarketplaceStatus,
  downloadAdminCsv,
  getAdminCategories,
  getAdminMarketplace,
  updateMarketplaceStatus,
  type CategoryItem,
  type ListingAction,
  type MarketplaceListingItem,
  type Paginated,
} from "@/lib/admin-api";
import { extractAdminError, isAbortError } from "@/lib/api";
import { formatDate, formatNumber, timeAgo } from "@/lib/format";
import { mediaUrl } from "@/lib/media";

const LOAD_ERROR =
  "Gagal memuat listing marketplace. Pastikan backend berjalan lalu coba lagi.";

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "", label: "Semua" },
  { value: "active", label: "Aktif" },
  { value: "hidden", label: "Tersembunyi" },
  { value: "sold", label: "Terjual" },
  { value: "inactive", label: "Nonaktif" },
  { value: "deleted", label: "Dihapus" },
];

const ACTION_COPY: Record<
  ListingAction,
  {
    title: string;
    bulkTitle: string;
    message: string;
    bulkMessage: string;
    confirm: string;
    danger: boolean;
  }
> = {
  hide: {
    title: "Sembunyikan listing?",
    bulkTitle: "Sembunyikan listing terpilih?",
    message: "Listing tidak akan tampil di portal mahasiswa sampai dipulihkan.",
    bulkMessage:
      "Listing terpilih tidak akan tampil di portal mahasiswa sampai dipulihkan.",
    confirm: "Sembunyikan",
    danger: false,
  },
  restore: {
    title: "Pulihkan listing?",
    bulkTitle: "Pulihkan listing terpilih?",
    message: "Listing kembali aktif dan tampil di portal mahasiswa.",
    bulkMessage: "Listing terpilih kembali aktif dan tampil di portal mahasiswa.",
    confirm: "Pulihkan",
    danger: false,
  },
  delete: {
    title: "Hapus listing?",
    bulkTitle: "Hapus listing terpilih?",
    message:
      "Listing dihapus sementara (soft delete) dan bisa dipulihkan lewat tab Dihapus.",
    bulkMessage:
      "Listing terpilih dihapus sementara (soft delete) dan bisa dipulihkan lewat tab Dihapus.",
    confirm: "Hapus",
    danger: true,
  },
};

type ConfirmState =
  | { scope: "single"; item: MarketplaceListingItem; action: ListingAction }
  | { scope: "bulk"; ids: number[]; action: ListingAction };

function statusPresentation(item: MarketplaceListingItem): {
  label: string;
  chipClass: string;
} {
  if (item.deleted_at) {
    return {
      label: "Dihapus",
      chipClass: "bg-hub-sidebar text-hub-ink-muted",
    };
  }
  switch (item.status) {
    case "active":
      return {
        label: "Aktif",
        chipClass: "bg-hub-success-bg text-hub-success-ink",
      };
    case "hidden":
      return {
        label: "Tersembunyi",
        chipClass: "bg-hub-warning-bg text-hub-warning-ink",
      };
    case "sold":
      return {
        label: "Terjual",
        chipClass: "bg-hub-accent-soft text-hub-accent-ink",
      };
    case "inactive":
      return {
        label: "Nonaktif",
        chipClass: "bg-hub-sidebar text-hub-ink-muted",
      };
    default:
      return {
        label: item.status || "Tercatat",
        chipClass: "bg-hub-sidebar text-hub-ink-muted",
      };
  }
}

function parsePositiveInt(raw: string | null, fallback = 1): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function ListingInspectorContent({
  item,
  activeImageIndex,
  onSelectImage,
  onRequestAction,
  busy,
  onCloseDrawer,
}: {
  item: MarketplaceListingItem;
  activeImageIndex: number;
  onSelectImage: (idx: number) => void;
  onRequestAction: (item: MarketplaceListingItem, action: ListingAction) => void;
  busy: boolean;
  onCloseDrawer?: () => void;
}) {
  const images = useMemo(
    () => (item.images ?? []).filter((img) => Boolean(mediaUrl(img.file_path))),
    [item.images],
  );
  const safeIndex =
    activeImageIndex >= 0 && activeImageIndex < images.length
      ? activeImageIndex
      : 0;
  const activeSrc = images[safeIndex]
    ? mediaUrl(images[safeIndex].file_path)
    : null;
  const meta = statusPresentation(item);
  const deleted = Boolean(item.deleted_at);
  const reportsCount = item.reports_count ?? 0;

  return (
    <div className="flex flex-col">
      {onCloseDrawer && (
        <div className="flex items-center justify-between gap-3 border-b border-hub-rule px-5 py-4">
          <h2 className="font-display text-[15px] font-semibold text-hub-ink">
            Inspektor Listing
          </h2>
          <button
            type="button"
            onClick={onCloseDrawer}
            className="inline-flex h-9 items-center rounded-full border border-hub-border-strong bg-hub-surface px-3.5 text-[13px] font-semibold whitespace-nowrap text-hub-ink transition-colors duration-150 hover:bg-hub-subtle active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus"
          >
            Tutup
          </button>
        </div>
      )}

      <div className="relative aspect-[4/3] w-full overflow-hidden bg-hub-sidebar">
        <AdminImage
          src={activeSrc}
          alt={item.title}
          className="h-full w-full object-cover"
          fallbackLabel="Tidak ada foto produk"
          fallbackClassName="flex h-full w-full items-center justify-center bg-hub-sidebar text-[13px] font-medium text-hub-ink-subtle"
        />
        {images.length > 1 && (
          <span className="absolute right-3 bottom-3 rounded-md bg-hub-ink/85 px-2.5 py-1 text-[13px] font-medium tabular-nums text-hub-surface">
            Foto {safeIndex + 1} dari {images.length}
          </span>
        )}
      </div>

      {images.length > 1 && (
        <div
          className="flex gap-2 overflow-x-auto border-b border-hub-rule px-5 py-3"
          aria-label="Galeri foto produk"
        >
          {images.map((img, idx) => {
            const thumbSrc = mediaUrl(img.file_path);
            const isSelected = idx === safeIndex;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => onSelectImage(idx)}
                aria-label={`Lihat foto ${idx + 1}`}
                aria-pressed={isSelected}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus ${
                  isSelected
                    ? "border-hub-ink opacity-100"
                    : "border-hub-border opacity-70 hover:opacity-100"
                }`}
              >
                <AdminImage
                  src={thumbSrc}
                  alt=""
                  className="h-full w-full object-cover"
                  fallbackLabel="Foto"
                  fallbackClassName="flex h-full w-full items-center justify-center bg-hub-sidebar text-[13px] text-hub-ink-subtle"
                />
              </button>
            );
          })}
        </div>
      )}

      <div className="border-b border-hub-rule p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 font-display text-lg leading-snug font-semibold [overflow-wrap:break-word] [text-wrap:balance] text-hub-ink">
            {item.title}
          </h3>
          <span
            className={`shrink-0 rounded-md px-2.5 py-1 text-[13px] font-medium whitespace-nowrap ${meta.chipClass}`}
          >
            {meta.label}
          </span>
        </div>

        <p className="mt-2 font-display text-2xl font-bold tracking-tight tabular-nums text-hub-ink">
          Rp {formatNumber(item.price)}
        </p>

        {reportsCount > 0 && (
          <p className="mt-3 rounded-xl bg-hub-danger-bg px-3.5 py-2.5 text-[13px] font-medium text-hub-danger-ink">
            {formatNumber(reportsCount)} laporan masuk untuk listing ini
          </p>
        )}
      </div>

      <dl className="space-y-2.5 border-b border-hub-rule p-5 text-[14px]">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-hub-ink-subtle">ID Listing</dt>
          <dd className="font-medium tabular-nums text-hub-ink">#{item.id}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-hub-ink-subtle">Kategori</dt>
          <dd className="text-right font-medium text-hub-ink">
            {item.category?.name ?? "Tanpa kategori"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-hub-ink-subtle">Kondisi</dt>
          <dd className="text-right font-medium text-hub-ink">
            {item.condition || "Tidak dicantumkan"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-hub-ink-subtle">Penjual</dt>
          <dd className="text-right font-medium text-hub-ink">
            {item.user?.name ?? `User #${item.user_id}`}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-hub-ink-subtle">Diunggah</dt>
          <dd className="text-right font-medium text-hub-ink">
            {formatDate(item.created_at)}
          </dd>
        </div>
      </dl>

      <div className="border-b border-hub-rule p-5">
        <p className="text-[13px] font-semibold text-hub-ink-muted">
          Deskripsi produk
        </p>
        <p className="mt-2 max-h-48 overflow-y-auto rounded-xl bg-hub-subtle p-3.5 text-[14px] leading-relaxed whitespace-pre-line text-hub-ink-muted">
          {item.description || "Tidak ada deskripsi tambahan dari penjual."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 p-5">
        {deleted || item.status === "hidden" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onRequestAction(item, "restore")}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-hub-ink px-4 text-[13px] font-semibold whitespace-nowrap text-hub-surface transition-colors duration-150 hover:bg-hub-ink-hover active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus disabled:cursor-not-allowed disabled:opacity-55"
          >
            <ActionIcon name="restore" className="h-4 w-4" />
            <span>Pulihkan listing</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => onRequestAction(item, "hide")}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-hub-border-strong bg-hub-surface px-4 text-[13px] font-semibold whitespace-nowrap text-hub-ink transition-colors duration-150 hover:bg-hub-subtle active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus disabled:cursor-not-allowed disabled:opacity-55"
          >
            <ActionIcon name="pause" className="h-4 w-4" />
            <span>Sembunyikan</span>
          </button>
        )}

        {!deleted && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onRequestAction(item, "delete")}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-hub-danger-border bg-hub-danger-bg px-4 text-[13px] font-semibold whitespace-nowrap text-hub-danger-ink transition-colors duration-150 hover:bg-hub-danger-solid hover:text-hub-surface active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus disabled:cursor-not-allowed disabled:opacity-55"
          >
            <ActionIcon name="trash" className="h-4 w-4" />
            <span>Hapus</span>
          </button>
        )}
      </div>
    </div>
  );
}

function MarketplaceWorkbench() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "";
  const categoryIdRaw = searchParams.get("category_id") ?? "";
  const categoryId = parsePositiveInt(categoryIdRaw, 0) || undefined;
  const urlSearch = searchParams.get("search") ?? "";
  const page = parsePositiveInt(searchParams.get("page"), 1);

  const [searchInput, setSearchInput] = useState(() => urlSearch);
  const [result, setResult] =
    useState<Paginated<MarketplaceListingItem> | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [inspectedId, setInspectedId] = useState<number | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [imageSelection, setImageSelection] = useState<{
    itemId: number;
    index: number;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const updateQuery = useCallback(
    (patch: {
      status?: string;
      category_id?: string;
      search?: string;
      page?: number;
    }) => {
      const next = new URLSearchParams(searchParams.toString());

      const setOrDelete = (key: string, val: string | undefined) => {
        if (val) {
          next.set(key, val);
        } else {
          next.delete(key);
        }
      };

      if ("status" in patch) setOrDelete("status", patch.status);
      if ("category_id" in patch) setOrDelete("category_id", patch.category_id);
      if ("search" in patch) setOrDelete("search", patch.search);
      if ("page" in patch) {
        if (patch.page && patch.page > 1) {
          next.set("page", String(patch.page));
        } else {
          next.delete("page");
        }
      }

      const qs = next.toString();
      router.replace(qs ? `/marketplace?${qs}` : "/marketplace", {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  useDebouncedValue(searchInput.trim(), 400, (nextSearch) => {
    if (nextSearch === urlSearch) return;
    setSelectedIds([]);
    updateQuery({ search: nextSearch, page: 1 });
  });

  useEffect(() => {
    const controller = new AbortController();
    getAdminCategories(
      { type: "marketplace" },
      { signal: controller.signal },
    ).then(
      (res) => {
        if (controller.signal.aborted) return;
        setCategories(res.data);
      },
      () => {
        // Kategori opsional: jika gagal dimuat, tetap pertahankan daftar utama.
      },
    );
    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getAdminMarketplace(
      {
        page,
        status: status || undefined,
        category_id: categoryId,
        search: urlSearch || undefined,
      },
      { signal: controller.signal },
    ).then(
      (data) => {
        if (controller.signal.aborted) return;
        if (data.data.length === 0 && data.current_page > 1) {
          updateQuery({ page: data.current_page - 1 });
          return;
        }
        setError(null);
        setResult(data);
      },
      (err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setError(LOAD_ERROR);
      },
    );
    return () => {
      controller.abort();
    };
  }, [page, status, categoryId, urlSearch, retryKey, updateQuery]);

  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileDrawerOpen]);

  const inspectedItem = useMemo(() => {
    if (!result || result.data.length === 0) return null;
    if (inspectedId !== null) {
      const match = result.data.find((item) => item.id === inspectedId);
      if (match) return match;
    }
    return result.data[0];
  }, [result, inspectedId]);

  const activeImageIndex =
    inspectedItem && imageSelection?.itemId === inspectedItem.id
      ? imageSelection.index
      : 0;

  const pageIds = useMemo(
    () => new Set((result?.data ?? []).map((item) => item.id)),
    [result],
  );

  const visibleSelectedIds = useMemo(
    () => selectedIds.filter((id) => pageIds.has(id)),
    [selectedIds, pageIds],
  );

  const allOnPageSelected = Boolean(
    result &&
      result.data.length > 0 &&
      result.data.every((item) => visibleSelectedIds.includes(item.id)),
  );

  const hasActiveFilters = Boolean(status || categoryId || urlSearch);

  function toggleRowSelection(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id],
    );
  }

  function toggleAllOnPage() {
    if (!result) return;
    if (allOnPageSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(result.data.map((item) => item.id));
    }
  }

  function handleResetFilters() {
    setSearchInput("");
    setSelectedIds([]);
    updateQuery({ status: "", category_id: "", search: "", page: 1 });
  }

  function openInspectorFor(item: MarketplaceListingItem) {
    setInspectedId(item.id);
    if (
      typeof window !== "undefined" &&
      !window.matchMedia("(min-width: 1280px)").matches
    ) {
      setMobileDrawerOpen(true);
    }
  }

  async function handleConfirm() {
    if (!confirm) return;
    setBusy(true);
    setActionError(null);
    try {
      if (confirm.scope === "single") {
        await updateMarketplaceStatus(confirm.item.id, confirm.action);
      } else {
        await bulkUpdateMarketplaceStatus(confirm.ids, confirm.action);
        setSelectedIds([]);
      }
      setConfirm(null);

      const data = await getAdminMarketplace({
        page,
        status: status || undefined,
        category_id: categoryId,
        search: urlSearch || undefined,
      });
      if (data.data.length === 0 && data.current_page > 1) {
        updateQuery({ page: data.current_page - 1 });
      } else {
        setError(null);
        setResult(data);
      }
    } catch (err) {
      setActionError(extractAdminError(err, "Aksi moderasi gagal. Coba lagi."));
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setActionError(null);
    try {
      await downloadAdminCsv(
        "/admin/marketplace/export",
        {
          status: status || undefined,
          category_id: categoryId,
          search: urlSearch || undefined,
        },
        "marketplace.csv",
      );
    } catch (err) {
      setActionError(
        extractAdminError(err, "Gagal mengekspor CSV. Coba lagi."),
      );
    } finally {
      setExporting(false);
    }
  }

  const confirmDialogProps = useMemo(() => {
    if (!confirm) return null;
    const copy = ACTION_COPY[confirm.action];
    if (confirm.scope === "single") {
      return {
        title: copy.title,
        message: `${copy.message} (${confirm.item.title})`,
        confirmLabel: copy.confirm,
        danger: copy.danger,
      };
    }
    return {
      title: copy.bulkTitle,
      message: `${copy.bulkMessage} (${formatNumber(confirm.ids.length)} listing dipilih)`,
      confirmLabel: copy.confirm,
      danger: copy.danger,
    };
  }, [confirm]);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-8 sm:py-8">
      {/* Header Bar (tanpa eyebrow di atas judul) */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 font-display text-2xl font-semibold tracking-tight [overflow-wrap:break-word] [text-wrap:balance] text-hub-ink sm:text-[28px]">
              Manajemen Marketplace
            </h1>
            {result && (
              <span
                role="status"
                className="rounded-md bg-hub-sidebar px-2.5 py-1 text-[13px] font-medium tabular-nums text-hub-ink-muted"
              >
                {formatNumber(result.total)} listing
              </span>
            )}
          </div>
          <p className="mt-1 max-w-2xl text-[14px] text-hub-ink-muted [text-wrap:pretty]">
            Pantau katalog jual-beli mahasiswa, inspeksi foto produk secara
            langsung, dan tangani listing bermasalah.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-full border border-hub-border-strong bg-hub-surface px-4 text-[13px] font-semibold whitespace-nowrap text-hub-ink transition-colors duration-150 hover:bg-hub-subtle active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus disabled:cursor-not-allowed disabled:opacity-55 sm:self-auto"
        >
          <ActionIcon name="download" className="h-4 w-4 text-hub-ink-muted" />
          <span>{exporting ? "Mengekspor…" : "Ekspor CSV"}</span>
        </button>
      </section>

      {actionError && (
        <div
          role="alert"
          className="flex flex-col justify-between gap-3 rounded-[20px] border border-hub-danger-border bg-hub-danger-bg px-5 py-3.5 text-[14px] text-hub-danger-ink sm:flex-row sm:items-center"
        >
          <p className="font-medium">{actionError}</p>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="inline-flex h-9 shrink-0 items-center rounded-full border border-hub-danger-border bg-hub-surface px-3.5 text-[13px] font-semibold whitespace-nowrap text-hub-danger-ink transition-colors duration-150 hover:bg-hub-subtle active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Search, Category Filter & Status Tab Strip */}
      <section className="overflow-hidden rounded-[20px] border border-hub-border bg-hub-surface">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <ActionIcon
              name="search"
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-hub-ink-subtle"
            />
            <input
              type="text"
              name="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama produk atau deskripsi…"
              aria-label="Cari listing"
              className="h-10 w-full rounded-xl border border-hub-border bg-hub-subtle pr-10 pl-10 text-[14px] text-hub-ink outline-2 -outline-offset-2 outline-transparent transition-colors duration-150 placeholder:text-hub-ink-subtle hover:bg-hub-surface-tint focus:border-hub-ink-muted focus:bg-hub-surface focus-visible:outline-hub-focus"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSelectedIds([]);
                  updateQuery({ search: "", page: 1 });
                }}
                aria-label="Hapus kata kunci pencarian"
                className="absolute top-1/2 right-1.5 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-hub-ink-subtle transition-colors duration-150 hover:bg-hub-sidebar hover:text-hub-ink active:translate-y-px focus-visible:outline-2 focus-visible:outline-hub-focus"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M6 18L18 6M6 6l12 12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {categories.length > 0 && (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="category-filter"
                  className="text-[13px] font-medium whitespace-nowrap text-hub-ink-muted"
                >
                  Kategori
                </label>
                <SelectWrapper>
                  <select
                    id="category-filter"
                    value={categoryId ? String(categoryId) : ""}
                    onChange={(e) => {
                      setSelectedIds([]);
                      updateQuery({ category_id: e.target.value, page: 1 });
                    }}
                    className="h-10 cursor-pointer appearance-none rounded-xl border border-hub-border bg-hub-subtle pr-9 pl-3.5 text-[14px] text-hub-ink outline-2 -outline-offset-2 outline-transparent transition-colors duration-150 hover:bg-hub-surface-tint focus:border-hub-ink-muted focus:bg-hub-surface focus-visible:outline-hub-focus"
                  >
                    <option value="">Semua kategori</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </SelectWrapper>
              </div>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex h-10 items-center rounded-full border border-hub-border-strong bg-hub-surface px-4 text-[13px] font-semibold whitespace-nowrap text-hub-ink transition-colors duration-150 hover:bg-hub-subtle active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus"
              >
                Reset filter
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-hub-rule px-4 py-2.5">
          <div
            id="status-filter"
            role="tablist"
            aria-label="Filter status listing"
            className="flex items-center gap-1.5 overflow-x-auto"
          >
            {STATUS_TABS.map((tab) => {
              const selected = status === tab.value;
              return (
                <button
                  key={tab.value || "all"}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => {
                    setSelectedIds([]);
                    updateQuery({ status: tab.value, page: 1 });
                  }}
                  className={`inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-150 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus ${
                    selected
                      ? "bg-hub-ink text-hub-surface"
                      : "bg-hub-canvas text-hub-ink-muted hover:bg-hub-surface-active hover:text-hub-ink"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bulk Moderation Bar */}
      {visibleSelectedIds.length > 0 && (
        <section
          aria-label="Aksi massal listing"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-hub-ink px-5 py-3 text-hub-surface"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[14px] font-semibold tabular-nums">
              {formatNumber(visibleSelectedIds.length)} listing dipilih
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="inline-flex h-8 items-center rounded-full border border-hub-ink-muted px-3 text-[13px] font-medium whitespace-nowrap text-hub-surface transition-colors duration-150 hover:bg-hub-ink-hover active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-surface"
            >
              Batal pilih
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                setConfirm({
                  scope: "bulk",
                  ids: visibleSelectedIds,
                  action: "hide",
                })
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-hub-ink-muted bg-hub-ink-hover px-3.5 text-[13px] font-semibold whitespace-nowrap text-hub-surface transition-colors duration-150 hover:border-hub-surface active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-surface disabled:cursor-not-allowed disabled:opacity-55"
            >
              <ActionIcon name="pause" className="h-3.5 w-3.5" />
              <span>Sembunyikan</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                setConfirm({
                  scope: "bulk",
                  ids: visibleSelectedIds,
                  action: "restore",
                })
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-hub-surface px-3.5 text-[13px] font-semibold whitespace-nowrap text-hub-ink transition-colors duration-150 hover:bg-hub-sidebar active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-surface disabled:cursor-not-allowed disabled:opacity-55"
            >
              <ActionIcon name="restore" className="h-3.5 w-3.5" />
              <span>Pulihkan</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                setConfirm({
                  scope: "bulk",
                  ids: visibleSelectedIds,
                  action: "delete",
                })
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-hub-danger-solid px-3.5 text-[13px] font-semibold whitespace-nowrap text-hub-surface transition-colors duration-150 hover:bg-hub-danger-solid-hover active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-surface disabled:cursor-not-allowed disabled:opacity-55"
            >
              <ActionIcon name="trash" className="h-3.5 w-3.5" />
              <span>Hapus</span>
            </button>
          </div>
        </section>
      )}

      {/* Split Catalog & Curatorial Inspector Workbench */}
      <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        {/* Left Ledger */}
        <div className="overflow-hidden rounded-[20px] border border-hub-border bg-hub-surface xl:col-span-8">
          {error ? (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <p
                role="alert"
                className="text-[14px] font-medium text-hub-danger-ink"
              >
                {error}
              </p>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setRetryKey((k) => k + 1);
                }}
                className="inline-flex h-10 items-center rounded-full bg-hub-ink px-4 text-[13px] font-semibold whitespace-nowrap text-hub-surface transition-colors duration-150 hover:bg-hub-ink-hover active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus"
              >
                Coba lagi
              </button>
            </div>
          ) : !result ? (
            <div className="divide-y divide-hub-rule" aria-label="Memuat listing">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-hub-sidebar" />
                    <div className="space-y-2">
                      <div className="h-4 w-44 animate-pulse rounded bg-hub-sidebar" />
                      <div className="h-3.5 w-28 animate-pulse rounded bg-hub-subtle" />
                    </div>
                  </div>
                  <div className="h-4 w-24 animate-pulse rounded bg-hub-sidebar" />
                </div>
              ))}
            </div>
          ) : result.data.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <h2 className="font-display text-[16px] font-semibold text-hub-ink">
                Tidak ada listing yang cocok
              </h2>
              <p className="mx-auto mt-1 max-w-md text-[14px] text-hub-ink-subtle [text-wrap:pretty]">
                {hasActiveFilters
                  ? "Ubah kata kunci pencarian, kategori, atau tab status untuk menampilkan listing lain."
                  : "Belum ada barang mahasiswa yang tercatat di marketplace saat ini."}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-5 inline-flex h-10 items-center rounded-full border border-hub-border-strong bg-hub-surface px-4 text-[13px] font-semibold whitespace-nowrap text-hub-ink transition-colors duration-150 hover:bg-hub-subtle active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus"
                >
                  Tampilkan semua listing
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-hub-rule bg-hub-subtle text-[13px] font-medium text-hub-ink-subtle">
                      <th className="w-10 py-3.5 pl-4 pr-2">
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={toggleAllOnPage}
                          aria-label="Pilih semua listing di halaman ini"
                          className="h-4 w-4 cursor-pointer rounded border-hub-border-strong accent-hub-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus"
                        />
                      </th>
                      <th className="px-3 py-3.5 font-medium whitespace-nowrap">
                        Produk
                      </th>
                      <th className="hidden px-3 py-3.5 font-medium whitespace-nowrap md:table-cell">
                        Penjual
                      </th>
                      <th className="px-3 py-3.5 font-medium whitespace-nowrap">
                        Harga
                      </th>
                      <th className="hidden px-3 py-3.5 font-medium whitespace-nowrap sm:table-cell">
                        Status
                      </th>
                      <th className="py-3.5 pr-4 pl-3 text-right font-medium whitespace-nowrap">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hub-rule text-[14px]">
                    {result.data.map((item) => {
                      const meta = statusPresentation(item);
                      const thumb = mediaUrl(item.images?.[0]?.file_path);
                      const deleted = Boolean(item.deleted_at);
                      const isInspected = inspectedItem?.id === item.id;
                      const isChecked = visibleSelectedIds.includes(item.id);
                      const reportsCount = item.reports_count ?? 0;

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors duration-150 ${
                            isInspected
                              ? "bg-hub-subtle"
                              : "hover:bg-hub-subtle/70"
                          }`}
                        >
                          <td className="py-4 pl-4 pr-2 align-middle">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleRowSelection(item.id)}
                              aria-label={`Pilih ${item.title}`}
                              className="h-4 w-4 cursor-pointer rounded border-hub-border-strong accent-hub-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus"
                            />
                          </td>

                          <td className="px-3 py-4 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-hub-sidebar">
                                <AdminImage
                                  src={thumb}
                                  alt=""
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                  fallbackLabel="Foto"
                                  fallbackClassName="flex h-full w-full items-center justify-center text-[13px] font-medium text-hub-ink-subtle"
                                />
                              </div>
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => openInspectorFor(item)}
                                  title={item.title}
                                  className="block max-w-52 truncate text-left text-[14px] font-semibold text-hub-ink transition-colors duration-150 hover:text-hub-ink-muted hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus sm:max-w-64"
                                >
                                  {item.title}
                                </button>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <span className="rounded-md bg-hub-sidebar px-2 py-0.5 text-[13px] font-medium text-hub-ink-muted">
                                    {item.category?.name ?? "Tanpa kategori"}
                                  </span>
                                  {reportsCount > 0 && (
                                    <span className="rounded-md bg-hub-danger-bg px-2 py-0.5 text-[13px] font-medium tabular-nums text-hub-danger-ink">
                                      {formatNumber(reportsCount)} laporan
                                    </span>
                                  )}
                                  <span className="text-[13px] text-hub-ink-subtle md:hidden">
                                    {item.user?.name ?? `User #${item.user_id}`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="hidden px-3 py-4 align-middle md:table-cell">
                            <p className="max-w-36 truncate font-medium text-hub-ink">
                              {item.user?.name ?? `User #${item.user_id}`}
                            </p>
                            <p className="mt-0.5 text-[13px] whitespace-nowrap text-hub-ink-subtle">
                              {timeAgo(item.created_at)}
                            </p>
                          </td>

                          <td className="px-3 py-4 align-middle font-semibold whitespace-nowrap tabular-nums text-hub-ink">
                            <p>Rp {formatNumber(item.price)}</p>
                            <span
                              className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[13px] font-medium sm:hidden ${meta.chipClass}`}
                            >
                              {meta.label}
                            </span>
                          </td>

                          <td className="hidden px-3 py-4 align-middle sm:table-cell">
                            <span
                              className={`inline-block rounded-md px-2.5 py-0.5 text-[13px] font-medium whitespace-nowrap ${meta.chipClass}`}
                            >
                              {meta.label}
                            </span>
                          </td>

                          <td className="py-4 pr-4 pl-3 text-right align-middle">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openInspectorFor(item)}
                                title="Inspeksi listing"
                                aria-label={`Inspeksi ${item.title}`}
                                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus ${
                                  isInspected
                                    ? "bg-hub-ink text-hub-surface"
                                    : "text-hub-ink-subtle hover:bg-hub-sidebar hover:text-hub-ink"
                                }`}
                              >
                                <ActionIcon name="eye" />
                              </button>

                              {deleted || item.status === "hidden" ? (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    setConfirm({
                                      scope: "single",
                                      item,
                                      action: "restore",
                                    })
                                  }
                                  title="Pulihkan listing"
                                  aria-label={`Pulihkan ${item.title}`}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-hub-success-ink transition-colors duration-150 hover:bg-hub-success-bg active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                  <ActionIcon name="restore" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    setConfirm({
                                      scope: "single",
                                      item,
                                      action: "hide",
                                    })
                                  }
                                  title="Sembunyikan listing"
                                  aria-label={`Sembunyikan ${item.title}`}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-hub-warning-ink transition-colors duration-150 hover:bg-hub-warning-bg active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                  <ActionIcon name="pause" />
                                </button>
                              )}

                              {!deleted && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    setConfirm({
                                      scope: "single",
                                      item,
                                      action: "delete",
                                    })
                                  }
                                  title="Hapus listing"
                                  aria-label={`Hapus ${item.title}`}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-hub-danger-solid transition-colors duration-150 hover:bg-hub-danger-bg active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                  <ActionIcon name="trash" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={result.current_page}
                lastPage={result.last_page}
                total={result.total}
                onPage={(nextPage) => {
                  setSelectedIds([]);
                  updateQuery({ page: nextPage });
                }}
              />
            </>
          )}
        </div>

        {/* Right Sticky Curatorial Inspector (Desktop xl+) */}
        <aside
          aria-label="Inspektor detail listing"
          className="hidden overflow-hidden rounded-[20px] border border-hub-border bg-hub-surface xl:sticky xl:top-[92px] xl:col-span-4 xl:block"
        >
          {!result && !error ? (
            <div className="space-y-4 p-5" aria-label="Memuat inspektor">
              <div className="aspect-[4/3] w-full animate-pulse rounded-xl bg-hub-sidebar" />
              <div className="h-6 w-3/4 animate-pulse rounded bg-hub-sidebar" />
              <div className="h-8 w-1/2 animate-pulse rounded bg-hub-sidebar" />
              <div className="h-24 w-full animate-pulse rounded-xl bg-hub-subtle" />
            </div>
          ) : inspectedItem ? (
            <ListingInspectorContent
              item={inspectedItem}
              activeImageIndex={activeImageIndex}
              onSelectImage={(index) =>
                setImageSelection({ itemId: inspectedItem.id, index })
              }
              onRequestAction={(targetItem, action) =>
                setConfirm({ scope: "single", item: targetItem, action })
              }
              busy={busy}
            />
          ) : (
            <div className="p-6 text-center">
              <h2 className="font-display text-[15px] font-semibold text-hub-ink">
                Inspektor Listing
              </h2>
              <p className="mt-1.5 text-[14px] text-hub-ink-subtle [text-wrap:pretty]">
                Pilih salah satu listing pada daftar di sebelah kiri untuk
                memeriksa galeri foto, detail harga, dan deskripsinya di sini.
              </p>
            </div>
          )}
        </aside>
      </section>

      {/* Mobile & Tablet Slide-Over Inspector Drawer (< xl) */}
      {mobileDrawerOpen && inspectedItem && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-hub-ink/35 backdrop-blur-[1px] xl:hidden"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Detail ${inspectedItem.title}`}
            className="h-full w-full max-w-md overflow-y-auto border-l border-hub-border bg-hub-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <ListingInspectorContent
              item={inspectedItem}
              activeImageIndex={activeImageIndex}
              onSelectImage={(index) =>
                setImageSelection({ itemId: inspectedItem.id, index })
              }
              onRequestAction={(targetItem, action) => {
                setMobileDrawerOpen(false);
                setConfirm({ scope: "single", item: targetItem, action });
              }}
              busy={busy}
              onCloseDrawer={() => setMobileDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {confirm && confirmDialogProps && (
        <ConfirmDialog
          title={confirmDialogProps.title}
          message={confirmDialogProps.message}
          confirmLabel={confirmDialogProps.confirmLabel}
          danger={confirmDialogProps.danger}
          busy={busy}
          onConfirm={handleConfirm}
          onCancel={() => {
            if (!busy) setConfirm(null);
          }}
        />
      )}
    </main>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-8 sm:py-8">
          <div className="h-12 w-72 animate-pulse rounded-xl bg-hub-sidebar" />
          <div className="h-28 w-full animate-pulse rounded-[20px] bg-hub-surface" />
          <div className="h-96 w-full animate-pulse rounded-[20px] bg-hub-surface" />
        </main>
      }
    >
      <MarketplaceWorkbench />
    </Suspense>
  );
}
