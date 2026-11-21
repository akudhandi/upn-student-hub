"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ActionIcon } from "@/components/admin/ActionIcons";
import AdminImage from "@/components/admin/AdminImage";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import Pagination from "@/components/admin/Pagination";
import SelectWrapper from "@/components/admin/SelectWrapper";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  deleteAdminEvent,
  downloadAdminCsv,
  getAdminCategories,
  getAdminEvents,
  updateAdminEventStatus,
  type AdminEventItem,
  type CategoryItem,
  type EventStatus,
  type Paginated,
} from "@/lib/admin-api";
import { extractAdminError, isAbortError } from "@/lib/api";
import { formatDate, formatNumber, safeHttpUrl } from "@/lib/format";
import { mediaUrl } from "@/lib/media";

const LOAD_ERROR =
  "Gagal memuat daftar event kampus. Pastikan backend berjalan lalu coba lagi.";

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "", label: "Semua" },
  { value: "pending", label: "Menunggu Kurasi" },
  { value: "published", label: "Tayang" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Diarsipkan" },
  { value: "rejected", label: "Ditolak" },
];

type ConfirmState =
  | { kind: "delete"; item: AdminEventItem }
  | { kind: "status"; item: AdminEventItem; nextStatus: EventStatus };

function parsePositiveInt(raw: string | null, fallback = 1): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function statusPresentation(status: string): {
  label: string;
  chipClass: string;
} {
  switch (status) {
    case "published":
      return {
        label: "Tayang",
        chipClass: "bg-hub-success-bg text-hub-success-ink",
      };
    case "pending":
      return {
        label: "Menunggu Kurasi",
        chipClass: "bg-hub-warning-bg text-hub-warning-ink",
      };
    case "draft":
      return {
        label: "Draft",
        chipClass: "bg-hub-sidebar text-hub-ink-muted",
      };
    case "archived":
      return {
        label: "Diarsipkan",
        chipClass: "bg-hub-accent-soft text-hub-accent-ink",
      };
    case "rejected":
      return {
        label: "Ditolak",
        chipClass: "bg-hub-danger-bg text-hub-danger-ink",
      };
    default:
      return {
        label: status || "Tercatat",
        chipClass: "bg-hub-sidebar text-hub-ink-muted",
      };
  }
}

function EventInspectorContent({
  item,
  activeImageIndex,
  onSelectImage,
  onConfirm,
  busy,
  onCloseDrawer,
}: {
  item: AdminEventItem;
  activeImageIndex: number;
  onSelectImage: (idx: number) => void;
  onConfirm: (state: ConfirmState) => void;
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
  const meta = statusPresentation(item.status);
  const safeRegistrationHref = safeHttpUrl(item.registration_link);
  const canApprove = item.status !== "published";
  const canReject = item.status === "pending" || item.status === "draft";
  const canArchive = item.status === "published";

  return (
    <div className="flex flex-col">
      {onCloseDrawer && (
        <div className="flex items-center justify-between gap-3 border-b border-hub-rule px-5 py-4">
          <h2 className="font-display text-[15px] font-semibold text-hub-ink">
            Kurasi Event
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
          fallbackLabel="Belum ada poster event"
          fallbackClassName="flex h-full w-full items-center justify-center bg-hub-sidebar text-[13px] font-medium text-hub-ink-subtle"
        />
        {images.length > 1 && (
          <span className="absolute right-3 bottom-3 rounded-md bg-hub-ink/85 px-2.5 py-1 text-[13px] font-medium tabular-nums text-hub-surface">
            Poster {safeIndex + 1} dari {images.length}
          </span>
        )}
      </div>

      {images.length > 1 && (
        <div
          className="flex gap-2 overflow-x-auto border-b border-hub-rule px-5 py-3"
          aria-label="Galeri poster event"
        >
          {images.map((img, idx) => {
            const thumbSrc = mediaUrl(img.file_path);
            const isSelected = idx === safeIndex;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => onSelectImage(idx)}
                aria-label={`Lihat poster ${idx + 1}`}
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
                  fallbackLabel="Poster"
                  fallbackClassName="flex h-full w-full items-center justify-center bg-hub-sidebar text-[13px] text-hub-ink-subtle"
                />
              </button>
            );
          })}
        </div>
      )}

      <div className="border-b border-hub-rule p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-block rounded-md bg-hub-sidebar px-2 py-0.5 text-[13px] font-medium tabular-nums text-hub-ink-muted">
              {item.event_code ?? `#${item.id}`}
            </span>
            <h3 className="mt-2 font-display text-lg leading-snug font-semibold [overflow-wrap:break-word] [text-wrap:balance] text-hub-ink">
              {item.title}
            </h3>
          </div>
          <span
            className={`shrink-0 rounded-md px-2.5 py-1 text-[13px] font-medium whitespace-nowrap ${meta.chipClass}`}
          >
            {meta.label}
          </span>
        </div>
      </div>

      <dl className="space-y-2.5 border-b border-hub-rule p-5 text-[14px]">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-hub-ink-subtle">Kategori</dt>
          <dd className="text-right font-medium text-hub-ink">
            {item.category?.name ?? "Tanpa kategori"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-hub-ink-subtle">Penyelenggara</dt>
          <dd className="text-right font-medium text-hub-ink">
            {item.organizer_name}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-hub-ink-subtle">Tanggal</dt>
          <dd className="text-right font-medium text-hub-ink">
            {formatDate(item.event_date)}
          </dd>
        </div>
        {item.event_time && (
          <div className="flex items-center justify-between gap-4">
            <dt className="text-hub-ink-subtle">Waktu</dt>
            <dd className="text-right font-medium text-hub-ink">
              {item.event_time}
            </dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <dt className="text-hub-ink-subtle">Lokasi</dt>
          <dd className="text-right font-medium text-hub-ink">{item.location}</dd>
        </div>
        {item.registration_link && (
          <div className="flex items-center justify-between gap-4">
            <dt className="text-hub-ink-subtle">Pendaftaran</dt>
            <dd className="min-w-0 truncate text-right font-medium">
              {safeRegistrationHref ? (
                <a
                  href={safeRegistrationHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-hub-accent-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus"
                >
                  {item.registration_link}
                </a>
              ) : (
                <span className="text-hub-ink-muted">
                  {item.registration_link}
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>

      <div className="border-b border-hub-rule p-5">
        <p className="text-[13px] font-semibold text-hub-ink-muted">
          Deskripsi kegiatan
        </p>
        <p className="mt-2 max-h-44 overflow-y-auto rounded-xl bg-hub-subtle p-3.5 text-[14px] leading-relaxed whitespace-pre-line text-hub-ink-muted">
          {item.description || "Tidak ada deskripsi tambahan."}
        </p>
      </div>

      <div className="space-y-2.5 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {canApprove && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                onConfirm({ kind: "status", item, nextStatus: "published" })
              }
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-hub-ink px-4 text-[13px] font-semibold whitespace-nowrap text-hub-surface transition-colors duration-150 hover:bg-hub-ink-hover active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus disabled:cursor-not-allowed disabled:opacity-55"
            >
              <ActionIcon name="check" className="h-4 w-4" />
              <span>Setujui &amp; Tayangkan</span>
            </button>
          )}
          <Link
            href={`/events/${item.id}/edit`}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-hub-border-strong bg-hub-surface px-4 text-[13px] font-semibold whitespace-nowrap text-hub-ink transition-colors duration-150 hover:bg-hub-subtle active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus"
          >
            <ActionIcon name="edit" className="h-4 w-4" />
            <span>Ubah</span>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canReject && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                onConfirm({ kind: "status", item, nextStatus: "rejected" })
              }
              className="inline-flex h-9 flex-1 items-center justify-center rounded-full border border-hub-danger-border bg-hub-danger-bg px-3.5 text-[13px] font-semibold whitespace-nowrap text-hub-danger-ink transition-colors duration-150 hover:bg-hub-danger-solid hover:text-hub-surface active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus disabled:cursor-not-allowed disabled:opacity-55"
            >
              Tolak Pengajuan
            </button>
          )}
          {canArchive && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                onConfirm({ kind: "status", item, nextStatus: "archived" })
              }
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-hub-border-strong bg-hub-subtle px-3.5 text-[13px] font-semibold whitespace-nowrap text-hub-ink transition-colors duration-150 hover:bg-hub-surface-tint active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus disabled:cursor-not-allowed disabled:opacity-55"
            >
              <ActionIcon name="archive" className="h-3.5 w-3.5" />
              <span>Arsipkan</span>
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm({ kind: "delete", item })}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-hub-danger-border bg-hub-surface px-3.5 text-[13px] font-semibold whitespace-nowrap text-hub-danger-ink transition-colors duration-150 hover:bg-hub-danger-bg active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus disabled:cursor-not-allowed disabled:opacity-55"
          >
            <ActionIcon name="trash" className="h-3.5 w-3.5" />
            <span>Hapus</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function EventsWorkbench() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "";
  const categoryIdRaw = searchParams.get("category_id") ?? "";
  const categoryId = parsePositiveInt(categoryIdRaw, 0) || undefined;
  const urlSearch = searchParams.get("search") ?? "";
  const page = parsePositiveInt(searchParams.get("page"), 1);

  const [searchInput, setSearchInput] = useState(() => urlSearch);
  const [result, setResult] = useState<Paginated<AdminEventItem> | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [inspectedId, setInspectedId] = useState<number | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [imageSelection, setImageSelection] = useState<{
    itemId: number;
    index: number;
  } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
      router.replace(qs ? `/events?${qs}` : "/events", { scroll: false });
    },
    [router, searchParams],
  );

  useDebouncedValue(searchInput.trim(), 400, (nextSearch) => {
    if (nextSearch === urlSearch) return;
    updateQuery({ search: nextSearch, page: 1 });
  });

  useEffect(() => {
    const controller = new AbortController();
    getAdminCategories({ type: "event" }, { signal: controller.signal }).then(
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
    getAdminEvents(
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

  const hasActiveFilters = Boolean(status || categoryId || urlSearch);

  function handleResetFilters() {
    setSearchInput("");
    updateQuery({ status: "", category_id: "", search: "", page: 1 });
  }

  function openInspectorFor(item: AdminEventItem) {
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
      if (confirm.kind === "delete") {
        await deleteAdminEvent(confirm.item.id);
      } else {
        await updateAdminEventStatus(confirm.item.id, confirm.nextStatus);
      }
      setConfirm(null);
      setMobileDrawerOpen(false);

      const data = await getAdminEvents({
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
      setActionError(
        extractAdminError(err, "Aksi kurasi event gagal diproses. Coba lagi."),
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setActionError(null);
    try {
      await downloadAdminCsv(
        "/admin/events/export",
        {
          status: status || undefined,
          category_id: categoryId,
          search: urlSearch || undefined,
        },
        "events-kampus.csv",
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
    if (confirm.kind === "delete") {
      return {
        title: "Hapus event?",
        message: `Event "${confirm.item.title}" akan dihapus dari portal mahasiswa.`,
        confirmLabel: "Hapus",
        danger: true,
      };
    }
    if (confirm.nextStatus === "published") {
      return {
        title: "Setujui & tayangkan event?",
        message: `Event "${confirm.item.title}" akan dipublikasikan di portal mahasiswa.`,
        confirmLabel: "Tayangkan",
        danger: false,
      };
    }
    if (confirm.nextStatus === "rejected") {
      return {
        title: "Tolak pengajuan event?",
        message: `Event "${confirm.item.title}" akan ditandai Ditolak dan tidak ditayangkan.`,
        confirmLabel: "Tolak Event",
        danger: true,
      };
    }
    return {
      title: "Arsipkan event?",
      message: `Event "${confirm.item.title}" akan dipindahkan ke arsip.`,
      confirmLabel: "Arsipkan",
      danger: false,
    };
  }, [confirm]);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-8 sm:py-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 font-display text-2xl font-semibold tracking-tight [overflow-wrap:break-word] [text-wrap:balance] text-hub-ink sm:text-[28px]">
              Manajemen Event &amp; Informasi
            </h1>
            {result && (
              <span
                role="status"
                className="rounded-md bg-hub-sidebar px-2.5 py-1 text-[13px] font-medium tabular-nums text-hub-ink-muted"
              >
                {formatNumber(result.total)} agenda
              </span>
            )}
          </div>
          <p className="mt-1 max-w-2xl text-[14px] text-hub-ink-muted [text-wrap:pretty]">
            Kurasi pengajuan kegiatan kampus, periksa poster serta tautan
            pendaftaran, dan kelola jadwal publikasi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-hub-border-strong bg-hub-surface px-4 text-[13px] font-semibold whitespace-nowrap text-hub-ink transition-colors duration-150 hover:bg-hub-subtle active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus disabled:cursor-not-allowed disabled:opacity-55"
          >
            <ActionIcon name="download" className="h-4 w-4 text-hub-ink-muted" />
            <span>{exporting ? "Mengekspor…" : "Ekspor CSV"}</span>
          </button>
          <Link
            href="/events/create"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-hub-ink px-4 text-[13px] font-semibold whitespace-nowrap text-hub-surface transition-colors duration-150 hover:bg-hub-ink-hover active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M12 5v14m-7-7h14"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            <span>Buat Event</span>
          </Link>
        </div>
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
              placeholder="Cari judul event atau penyelenggara…"
              aria-label="Cari event"
              className="h-10 w-full rounded-xl border border-hub-border bg-hub-subtle pr-10 pl-10 text-[14px] text-hub-ink outline-2 -outline-offset-2 outline-transparent transition-colors duration-150 placeholder:text-hub-ink-subtle hover:bg-hub-surface-tint focus:border-hub-ink-muted focus:bg-hub-surface focus-visible:outline-hub-focus"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
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
                  htmlFor="event-category-filter"
                  className="text-[13px] font-medium whitespace-nowrap text-hub-ink-muted"
                >
                  Kategori
                </label>
                <SelectWrapper>
                  <select
                    id="event-category-filter"
                    value={categoryId ? String(categoryId) : ""}
                    onChange={(e) =>
                      updateQuery({ category_id: e.target.value, page: 1 })
                    }
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
            id="event-status-filter"
            role="tablist"
            aria-label="Filter status event"
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
                  onClick={() => updateQuery({ status: tab.value, page: 1 })}
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

      <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
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
            <div className="divide-y divide-hub-rule" aria-label="Memuat event">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-hub-sidebar" />
                    <div className="space-y-2">
                      <div className="h-4 w-48 animate-pulse rounded bg-hub-sidebar" />
                      <div className="h-3.5 w-32 animate-pulse rounded bg-hub-subtle" />
                    </div>
                  </div>
                  <div className="h-6 w-24 animate-pulse rounded bg-hub-sidebar" />
                </div>
              ))}
            </div>
          ) : result.data.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <h2 className="font-display text-[16px] font-semibold text-hub-ink">
                Belum ada event yang cocok
              </h2>
              <p className="mx-auto mt-1 max-w-md text-[14px] text-hub-ink-subtle [text-wrap:pretty]">
                {hasActiveFilters
                  ? "Ubah kata kunci pencarian, kategori, atau tab status untuk melihat agenda lain."
                  : "Tambahkan agenda kegiatan kampus pertama melalui tombol Buat Event."}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-5 inline-flex h-10 items-center rounded-full border border-hub-border-strong bg-hub-surface px-4 text-[13px] font-semibold whitespace-nowrap text-hub-ink transition-colors duration-150 hover:bg-hub-subtle active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus"
                >
                  Tampilkan semua event
                </button>
              ) : (
                <Link
                  href="/events/create"
                  className="mt-5 inline-flex h-10 items-center rounded-full bg-hub-ink px-4 text-[13px] font-semibold whitespace-nowrap text-hub-surface transition-colors duration-150 hover:bg-hub-ink-hover active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus"
                >
                  Buat Event Baru
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-hub-rule bg-hub-subtle text-[13px] font-medium text-hub-ink-subtle">
                      <th className="py-3.5 pr-3 pl-5 font-medium whitespace-nowrap">
                        Agenda &amp; Kategori
                      </th>
                      <th className="hidden px-3 py-3.5 font-medium whitespace-nowrap md:table-cell">
                        Penyelenggara
                      </th>
                      <th className="px-3 py-3.5 font-medium whitespace-nowrap">
                        Jadwal
                      </th>
                      <th className="hidden px-3 py-3.5 font-medium whitespace-nowrap sm:table-cell">
                        Status
                      </th>
                      <th className="py-3.5 pr-5 pl-3 text-right font-medium whitespace-nowrap">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hub-rule text-[14px]">
                    {result.data.map((item) => {
                      const meta = statusPresentation(item.status);
                      const thumb = mediaUrl(item.images?.[0]?.file_path);
                      const isInspected = inspectedItem?.id === item.id;

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors duration-150 ${
                            isInspected
                              ? "bg-hub-subtle"
                              : "hover:bg-hub-subtle/70"
                          }`}
                        >
                          <td className="py-4 pr-3 pl-5 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-hub-sidebar">
                                <AdminImage
                                  src={thumb}
                                  alt=""
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                  fallbackLabel="Poster"
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
                                  <span className="text-[13px] text-hub-ink-subtle md:hidden">
                                    {item.organizer_name}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="hidden max-w-44 px-3 py-4 align-middle md:table-cell">
                            <p className="truncate font-medium text-hub-ink">
                              {item.organizer_name}
                            </p>
                            <p
                              className="mt-0.5 truncate text-[13px] text-hub-ink-subtle"
                              title={item.location}
                            >
                              {item.location}
                            </p>
                          </td>

                          <td className="px-3 py-4 align-middle whitespace-nowrap">
                            <p className="font-semibold text-hub-ink">
                              {formatDate(item.event_date)}
                            </p>
                            {item.event_time && (
                              <p className="mt-0.5 text-[13px] text-hub-ink-subtle">
                                {item.event_time}
                              </p>
                            )}
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

                          <td className="py-4 pr-5 pl-3 text-right align-middle">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openInspectorFor(item)}
                                title="Inspeksi event"
                                aria-label={`Inspeksi ${item.title}`}
                                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus ${
                                  isInspected
                                    ? "bg-hub-ink text-hub-surface"
                                    : "text-hub-ink-subtle hover:bg-hub-sidebar hover:text-hub-ink"
                                }`}
                              >
                                <ActionIcon name="eye" />
                              </button>
                              <Link
                                href={`/events/${item.id}/edit`}
                                title="Ubah event"
                                aria-label={`Ubah ${item.title}`}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-hub-ink-muted transition-colors duration-150 hover:bg-hub-sidebar hover:text-hub-ink active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus"
                              >
                                <ActionIcon name="edit" />
                              </Link>
                              {item.status !== "published" && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    setConfirm({
                                      kind: "status",
                                      item,
                                      nextStatus: "published",
                                    })
                                  }
                                  title="Setujui dan tayangkan event"
                                  aria-label={`Tayangkan ${item.title}`}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-hub-success-ink transition-colors duration-150 hover:bg-hub-success-bg active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                  <ActionIcon name="check" />
                                </button>
                              )}
                              {item.status === "published" && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    setConfirm({
                                      kind: "status",
                                      item,
                                      nextStatus: "archived",
                                    })
                                  }
                                  title="Arsipkan event"
                                  aria-label={`Arsipkan ${item.title}`}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-hub-warning-ink transition-colors duration-150 hover:bg-hub-warning-bg active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                  <ActionIcon name="archive" />
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => setConfirm({ kind: "delete", item })}
                                title="Hapus event"
                                aria-label={`Hapus ${item.title}`}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-hub-danger-solid transition-colors duration-150 hover:bg-hub-danger-bg active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus disabled:cursor-not-allowed disabled:opacity-55"
                              >
                                <ActionIcon name="trash" />
                              </button>
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
                onPage={(nextPage) => updateQuery({ page: nextPage })}
              />
            </>
          )}
        </div>

        <aside
          aria-label="Inspektor kurasi event"
          className="hidden overflow-hidden rounded-[20px] border border-hub-border bg-hub-surface xl:sticky xl:top-[92px] xl:col-span-4 xl:block"
        >
          {!result && !error ? (
            <div className="space-y-4 p-5" aria-label="Memuat detail event">
              <div className="aspect-[4/3] w-full animate-pulse rounded-xl bg-hub-sidebar" />
              <div className="h-6 w-3/4 animate-pulse rounded bg-hub-sidebar" />
              <div className="h-28 w-full animate-pulse rounded-xl bg-hub-subtle" />
            </div>
          ) : inspectedItem ? (
            <EventInspectorContent
              item={inspectedItem}
              activeImageIndex={activeImageIndex}
              onSelectImage={(index) =>
                setImageSelection({ itemId: inspectedItem.id, index })
              }
              onConfirm={setConfirm}
              busy={busy}
            />
          ) : (
            <div className="p-6 text-center">
              <h2 className="font-display text-[15px] font-semibold text-hub-ink">
                Kurasi Event
              </h2>
              <p className="mt-1.5 text-[14px] text-hub-ink-subtle [text-wrap:pretty]">
                Pilih salah satu agenda di sebelah kiri untuk meninjau poster,
                lokasi, tautan pendaftaran, dan status publikasi.
              </p>
            </div>
          )}
        </aside>
      </section>

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
            <EventInspectorContent
              item={inspectedItem}
              activeImageIndex={activeImageIndex}
              onSelectImage={(index) =>
                setImageSelection({ itemId: inspectedItem.id, index })
              }
              onConfirm={(nextConfirm) => {
                setMobileDrawerOpen(false);
                setConfirm(nextConfirm);
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

export default function EventsAdminPage() {
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
      <EventsWorkbench />
    </Suspense>
  );
}
