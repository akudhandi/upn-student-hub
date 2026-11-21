"use client";

import { useEffect, useState } from "react";
import { ActionIcon } from "@/components/admin/ActionIcons";
import AdminImage from "@/components/admin/AdminImage";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import ExportCsvButton from "@/components/admin/ExportCsvButton";
import ModalShell from "@/components/admin/ModalShell";
import Pagination from "@/components/admin/Pagination";
import SelectWrapper from "@/components/admin/SelectWrapper";
import StatusBadge, { type BadgeTone } from "@/components/admin/StatusBadge";
import TableState from "@/components/admin/TableState";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  downloadAdminCsv,
  getAdminServices,
  updateServiceStatus,
  type ListingAction,
  type Paginated,
  type ServiceListingItem,
} from "@/lib/admin-api";
import { extractAdminError, isAbortError } from "@/lib/api";
import { formatDate, formatNumber, timeAgo } from "@/lib/format";
import { mediaUrl } from "@/lib/media";

const LOAD_ERROR =
  "Gagal memuat data jasa mahasiswa. Pastikan backend berjalan lalu coba lagi.";

function statusMeta(item: ServiceListingItem): {
  label: string;
  tone: BadgeTone;
} {
  if (item.deleted_at) return { label: "Dihapus", tone: "slate" };
  switch (item.status) {
    case "active":
      return { label: "Aktif", tone: "green" };
    case "hidden":
      return { label: "Tersembunyi", tone: "amber" };
    case "inactive":
      return { label: "Nonaktif", tone: "slate" };
    default:
      return { label: item.status, tone: "slate" };
  }
}

function formatServicePrice(item: ServiceListingItem): string {
  const min = Number(item.price_min ?? 0);
  const max =
    item.price_max !== null && item.price_max !== undefined
      ? Number(item.price_max)
      : null;
  if (max !== null && !Number.isNaN(max) && max > min) {
    return `Rp ${formatNumber(min)} – Rp ${formatNumber(max)}`;
  }
  return `Rp ${formatNumber(min)}`;
}

const ACTION_COPY: Record<
  ListingAction,
  { title: string; message: string; confirm: string; danger: boolean }
> = {
  hide: {
    title: "Sembunyikan jasa?",
    message:
      "Layanan ini tidak akan tampil di portal mahasiswa sampai dipulihkan.",
    confirm: "Sembunyikan",
    danger: false,
  },
  restore: {
    title: "Pulihkan jasa?",
    message: "Layanan kembali aktif dan tampil di portal mahasiswa.",
    confirm: "Pulihkan",
    danger: false,
  },
  delete: {
    title: "Hapus jasa?",
    message:
      "Layanan dihapus sementara (soft delete) dan dapat dipulihkan lewat filter Dihapus.",
    confirm: "Hapus",
    danger: true,
  },
};

function DetailDialog({
  item,
  onClose,
}: {
  item: ServiceListingItem;
  onClose: () => void;
}) {
  const images = (item.images ?? []).filter((img) => mediaUrl(img.file_path));
  const meta = statusMeta(item);

  return (
    <ModalShell ariaLabel={`Detail ${item.title}`} onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            #{item.id} · {item.category?.name ?? "Tanpa kategori"}
            {item.pricing_type ? ` · Tipe: ${item.pricing_type}` : ""}
          </p>
        </div>
        <StatusBadge label={meta.label} tone={meta.tone} />
      </div>

      {images.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {images.map((img) => (
            <AdminImage
              key={img.id}
              src={mediaUrl(img.file_path)}
              alt={item.title}
              className="h-24 w-24 shrink-0 rounded-lg border border-slate-200 object-cover"
              fallbackClassName="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-xs font-bold text-slate-300"
            />
          ))}
        </div>
      )}

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-400">Tarif</dt>
          <dd className="font-bold text-slate-900">{formatServicePrice(item)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-400">Penyedia</dt>
          <dd className="font-medium text-slate-800">
            {item.user?.name ?? `User #${item.user_id}`}
          </dd>
        </div>
        {item.estimated_time && (
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Estimasi Pengerjaan</dt>
            <dd className="font-medium text-slate-800">{item.estimated_time}</dd>
          </div>
        )}
        {item.whatsapp_number && (
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">WhatsApp</dt>
            <dd className="font-medium text-slate-800">{item.whatsapp_number}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-slate-400">Dilaporkan</dt>
          <dd className="font-medium text-slate-800">
            {item.reports_count ?? 0} laporan
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-400">Diunggah</dt>
          <dd className="font-medium text-slate-800">
            {formatDate(item.created_at)}
          </dd>
        </div>
      </dl>

      <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-line text-slate-600">
        {item.description || "Tidak ada deskripsi."}
      </p>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Tutup
        </button>
      </div>
    </ModalShell>
  );
}

export default function ServicesPage() {
  const [result, setResult] = useState<Paginated<ServiceListingItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 400, () => setPage(1));
  const [retryKey, setRetryKey] = useState(0);
  const [confirm, setConfirm] = useState<{
    item: ServiceListingItem;
    action: ListingAction;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ServiceListingItem | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getAdminServices(
      {
        page,
        status: status || undefined,
        search: debouncedSearch || undefined,
      },
      { signal: controller.signal },
    ).then(
      (data) => {
        if (controller.signal.aborted) return;
        if (data.data.length === 0 && data.current_page > 1) {
          setPage(data.current_page - 1);
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
  }, [page, status, debouncedSearch, retryKey]);

  async function handleConfirm() {
    if (!confirm) return;
    setBusy(true);
    setActionError(null);
    try {
      await updateServiceStatus(confirm.item.id, confirm.action);
      setConfirm(null);
      const data = await getAdminServices({
        page,
        status: status || undefined,
        search: debouncedSearch || undefined,
      });
      if (data.data.length === 0 && data.current_page > 1) {
        setPage(data.current_page - 1);
      } else {
        setError(null);
        setResult(data);
      }
    } catch (err) {
      setActionError(extractAdminError(err, "Aksi gagal diproses. Coba lagi."));
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setActionError(null);
    try {
      await downloadAdminCsv(
        "/admin/services/export",
        {
          status: status || undefined,
          search: debouncedSearch || undefined,
        },
        "jasa-mahasiswa.csv",
      );
    } catch (err) {
      setActionError(extractAdminError(err, "Gagal mengekspor CSV. Coba lagi."));
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            Katalog Mahasiswa
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Manajemen Jasa Mahasiswa
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Pantau, filter, dan moderasi penawaran jasa dan layanan antar mahasiswa UPN.
          </p>
        </div>
        <ExportCsvButton
          exporting={exporting}
          onClick={handleExport}
          className="self-start sm:self-auto"
        />
      </section>

      {actionError && (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
        >
          {actionError}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-96">
          <ActionIcon
            name="search"
            className="absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama jasa atau deskripsi…"
            aria-label="Cari jasa"
            className="w-full rounded-lg bg-slate-100 py-2 pr-4 pl-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="flex items-center gap-2.5">
          <label htmlFor="service-status-filter" className="text-xs font-semibold text-slate-500">
            Status
          </label>
          <SelectWrapper>
            <select
              id="service-status-filter"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="cursor-pointer appearance-none rounded-lg bg-slate-100 py-2 pr-8 pl-3.5 text-sm text-slate-800 outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="hidden">Tersembunyi</option>
              <option value="inactive">Nonaktif</option>
              <option value="deleted">Dihapus</option>
            </select>
          </SelectWrapper>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm">
        <TableState
          error={error}
          onRetry={() => {
            setError(null);
            setRetryKey((k) => k + 1);
          }}
          loading={!result}
          loadingLabel="Memuat jasa"
          empty={Boolean(result && result.data.length === 0)}
          emptyTitle="Tidak ada layanan jasa"
          emptyMessage="Ubah kata kunci atau filter status untuk melihat data lain."
        >
          {result && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                      <th className="px-4 py-3.5 font-medium">Layanan &amp; Kategori</th>
                      <th className="px-4 py-3.5 font-medium">Penyedia</th>
                      <th className="px-4 py-3.5 font-medium">Tarif</th>
                      <th className="px-4 py-3.5 font-medium">Unggah</th>
                      <th className="px-4 py-3.5 font-medium">Status</th>
                      <th className="px-4 py-3.5 text-right font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {result.data.map((item) => {
                      const meta = statusMeta(item);
                      const thumb = mediaUrl(item.images?.[0]?.file_path);
                      const deleted = Boolean(item.deleted_at);
                      return (
                        <tr key={item.id} className="transition hover:bg-slate-50">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                <AdminImage
                                  src={thumb}
                                  alt=""
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                  fallbackClassName="flex h-full w-full items-center justify-center text-xs font-bold text-slate-300"
                                />
                              </div>
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => setDetail(item)}
                                  className="block max-w-56 truncate text-left text-sm font-semibold text-slate-900 transition hover:text-sky-600"
                                  title={item.title}
                                >
                                  {item.title}
                                </button>
                                <div className="mt-0.5 flex items-center gap-2">
                                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-500 uppercase">
                                    {item.category?.name ?? "Tanpa kategori"}
                                  </span>
                                  {(item.reports_count ?? 0) > 0 && (
                                    <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                      {item.reports_count} laporan
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 font-medium whitespace-nowrap text-slate-800">
                            {item.user?.name ?? `User #${item.user_id}`}
                          </td>
                          <td className="px-4 py-4 font-bold whitespace-nowrap text-slate-900">
                            {formatServicePrice(item)}
                          </td>
                          <td className="px-4 py-4 text-xs whitespace-nowrap text-slate-400">
                            {timeAgo(item.created_at)}
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge label={meta.label} tone={meta.tone} />
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setDetail(item)}
                                title="Detail jasa"
                                aria-label={`Detail ${item.title}`}
                                className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              >
                                <ActionIcon name="eye" />
                              </button>
                              {deleted ? (
                                <button
                                  type="button"
                                  onClick={() => setConfirm({ item, action: "restore" })}
                                  title="Pulihkan jasa"
                                  aria-label={`Pulihkan ${item.title}`}
                                  className="rounded p-1.5 text-emerald-600 transition hover:bg-emerald-500/15"
                                >
                                  <ActionIcon name="restore" />
                                </button>
                              ) : (
                                <>
                                  {item.status !== "hidden" ? (
                                    <button
                                      type="button"
                                      onClick={() => setConfirm({ item, action: "hide" })}
                                      title="Sembunyikan jasa"
                                      aria-label={`Sembunyikan ${item.title}`}
                                      className="rounded p-1.5 text-amber-600 transition hover:bg-amber-500/15"
                                    >
                                      <ActionIcon name="pause" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirm({ item, action: "restore" })}
                                      title="Pulihkan jasa"
                                      aria-label={`Pulihkan ${item.title}`}
                                      className="rounded p-1.5 text-emerald-600 transition hover:bg-emerald-500/15"
                                    >
                                      <ActionIcon name="restore" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setConfirm({ item, action: "delete" })}
                                    title="Hapus jasa"
                                    aria-label={`Hapus ${item.title}`}
                                    className="rounded p-1.5 text-rose-600 transition hover:bg-rose-500/15"
                                  >
                                    <ActionIcon name="trash" />
                                  </button>
                                </>
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
                onPage={setPage}
              />
            </>
          )}
        </TableState>
      </section>

      {confirm && (
        <ConfirmDialog
          title={ACTION_COPY[confirm.action].title}
          message={`${ACTION_COPY[confirm.action].message} (${confirm.item.title})`}
          confirmLabel={ACTION_COPY[confirm.action].confirm}
          danger={ACTION_COPY[confirm.action].danger}
          busy={busy}
          onConfirm={handleConfirm}
          onCancel={() => {
            if (!busy) setConfirm(null);
          }}
        />
      )}

      {detail && <DetailDialog item={detail} onClose={() => setDetail(null)} />}
    </main>
  );
}
