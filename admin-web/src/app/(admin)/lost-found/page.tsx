"use client";

import { useEffect, useState } from "react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import EmptyState from "@/components/admin/EmptyState";
import Pagination from "@/components/admin/Pagination";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  downloadAdminCsv,
  getAdminLostFound,
  updateLostFoundStatus,
  type LostFoundAction,
  type LostFoundItem,
  type LostFoundTab,
  type Paginated,
} from "@/lib/admin-api";
import { timeAgo } from "@/lib/format";
import { mediaUrl } from "@/lib/media";

const LOAD_ERROR =
  "Gagal memuat laporan Lost & Found. Pastikan backend berjalan lalu coba lagi.";

const TABS: ReadonlyArray<{ value: LostFoundTab; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "lost", label: "Kehilangan" },
  { value: "found", label: "Ditemukan" },
  { value: "resolved", label: "Selesai" },
];

function statusMeta(item: LostFoundItem): {
  label: string;
  tone: "green" | "amber" | "blue" | "slate" | "rose";
} {
  if (item.deleted_at) return { label: "Dihapus", tone: "slate" };
  switch (item.status) {
    case "open":
    case "active":
      return { label: "Terbuka", tone: "green" };
    case "resolved":
      return { label: "Selesai", tone: "blue" };
    case "closed":
      return { label: "Ditutup", tone: "slate" };
    case "hidden":
      return { label: "Tersembunyi", tone: "amber" };
    default:
      return { label: item.status, tone: "slate" };
  }
}

const ACTION_COPY: Record<
  LostFoundAction,
  { title: string; message: string; confirm: string; danger: boolean }
> = {
  mark_resolved: {
    title: "Tandai laporan selesai?",
    message: "Status laporan akan diubah menjadi selesai (resolved).",
    confirm: "Tandai Selesai",
    danger: false,
  },
  hide: {
    title: "Sembunyikan laporan?",
    message: "Laporan tidak akan tampil di publik sampai dipulihkan.",
    confirm: "Sembunyikan",
    danger: false,
  },
  restore: {
    title: "Pulihkan laporan?",
    message: "Laporan kembali aktif dan terbuka di portal mahasiswa.",
    confirm: "Pulihkan",
    danger: false,
  },
  delete: {
    title: "Hapus laporan?",
    message:
      "Laporan dihapus sementara (soft delete) dan dapat dipulihkan lewat filter Dihapus.",
    confirm: "Hapus",
    danger: true,
  },
};

function actionIcon(d: string) {
  return (
    <svg
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d={d} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
    </svg>
  );
}

const ICON_EYE =
  "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z";
const ICON_CHECK = "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z";
const ICON_PAUSE = "M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z";
const ICON_RESTORE =
  "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15";
const ICON_TRASH =
  "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16";

function DetailDialog({
  item,
  onClose,
}: {
  item: LostFoundItem;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const images = (item.images ?? []).filter((img) => mediaUrl(img.file_path));
  const meta = statusMeta(item);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Detail ${item.title}`}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              #{item.id} · {item.type === "lost" ? "Kehilangan" : "Ditemukan"} ·{" "}
              {item.category?.name ?? "Tanpa kategori"}
            </p>
          </div>
          <StatusBadge label={meta.label} tone={meta.tone} />
        </div>

        {images.length > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto">
            {images.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={mediaUrl(img.file_path) ?? ""}
                alt={item.title}
                className="h-24 w-24 shrink-0 rounded-lg border border-slate-200 object-cover"
              />
            ))}
          </div>
        )}

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Lokasi Kejadian</dt>
            <dd className="font-medium text-right text-slate-800">{item.location}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Pelapor</dt>
            <dd className="font-medium text-slate-800">
              {item.user?.name ?? `User #${item.user_id}`}
            </dd>
          </div>
          {item.contact_info && (
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Kontak</dt>
              <dd className="font-medium text-slate-800">{item.contact_info}</dd>
            </div>
          )}
          {item.reward && (
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Imbalan</dt>
              <dd className="font-medium text-slate-800">{item.reward}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Dilaporkan</dt>
            <dd className="font-medium text-slate-800">
              {item.reports_count ?? 0} laporan
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Tanggal Unggah</dt>
            <dd className="font-medium text-slate-800">
              {new Date(item.created_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
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
      </div>
    </div>
  );
}

export default function LostFoundAdminPage() {
  const [result, setResult] = useState<Paginated<LostFoundItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<LostFoundTab>("all");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [confirm, setConfirm] = useState<{
    item: LostFoundItem;
    action: LostFoundAction;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [detail, setDetail] = useState<LostFoundItem | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    getAdminLostFound({
      page,
      tab,
      status: status || undefined,
      search: debouncedSearch || undefined,
    }).then(
      (data) => {
        if (cancelled) return;
        if (data.data.length === 0 && data.current_page > 1) {
          setPage(data.current_page - 1);
          return;
        }
        setResult(data);
      },
      () => {
        if (cancelled) return;
        setError(LOAD_ERROR);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [page, tab, status, debouncedSearch, retryKey]);

  async function handleConfirm() {
    if (!confirm) return;
    setBusy(true);
    setActionError(null);
    try {
      await updateLostFoundStatus(confirm.item.id, confirm.action);
      setConfirm(null);
      const data = await getAdminLostFound({
        page,
        tab,
        status: status || undefined,
        search: debouncedSearch || undefined,
      });
      if (data.data.length === 0 && data.current_page > 1) {
        setPage(data.current_page - 1);
      } else {
        setResult(data);
      }
    } catch {
      setActionError("Aksi gagal diproses. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setActionError(null);
    try {
      await downloadAdminCsv(
        "/admin/lost-found/export",
        {
          tab,
          status: status || undefined,
          search: debouncedSearch || undefined,
        },
        "lost-found.csv",
      );
    } catch {
      setActionError("Gagal mengekspor CSV. Coba lagi.");
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
            Manajemen Lost &amp; Found
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Pantau dan kelola laporan kehilangan serta penemuan barang di lingkungan kampus.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-60 sm:self-auto"
        >
          <svg
            className="h-4 w-4 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          {exporting ? "Mengekspor…" : "Ekspor CSV"}
        </button>
      </section>

      {actionError && (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
        >
          {actionError}
        </p>
      )}

      <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <div
          role="tablist"
          aria-label="Filter tipe laporan"
          className="flex flex-wrap gap-1.5"
        >
          {TABS.map((t) => {
            const active = tab === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setTab(t.value);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:w-96">
            <svg
              className="absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul barang atau lokasi…"
              aria-label="Cari laporan lost & found"
              className="w-full rounded-lg bg-slate-100 py-2 pr-4 pl-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div className="flex items-center gap-2.5">
            <label htmlFor="lf-status-filter" className="text-xs font-semibold text-slate-500">
              Status
            </label>
            <select
              id="lf-status-filter"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="cursor-pointer appearance-none rounded-lg bg-slate-100 py-2 pr-8 pl-3.5 text-sm text-slate-800 outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="">Semua Status</option>
              <option value="open">Terbuka</option>
              <option value="resolved">Selesai</option>
              <option value="hidden">Tersembunyi</option>
              <option value="closed">Ditutup</option>
              <option value="deleted">Dihapus</option>
            </select>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm">
        {error ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12">
            <p role="alert" className="text-sm font-medium text-rose-700">
              {error}
            </p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setRetryKey((k) => k + 1);
              }}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Coba lagi
            </button>
          </div>
        ) : !result ? (
          <div className="space-y-3 p-4" aria-label="Memuat laporan">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        ) : result.data.length === 0 ? (
          <EmptyState
            title="Tidak ada laporan"
            message="Ubah tab, kata kunci, atau filter status untuk melihat data lain."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    <th className="px-4 py-3.5 font-medium">Barang &amp; Kategori</th>
                    <th className="px-4 py-3.5 font-medium">Tipe</th>
                    <th className="px-4 py-3.5 font-medium">Lokasi</th>
                    <th className="px-4 py-3.5 font-medium">Pelapor</th>
                    <th className="px-4 py-3.5 font-medium">Waktu</th>
                    <th className="px-4 py-3.5 font-medium">Status</th>
                    <th className="px-4 py-3.5 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {result.data.map((item) => {
                    const meta = statusMeta(item);
                    const thumb = mediaUrl(item.images?.[0]?.file_path);
                    const deleted = Boolean(item.deleted_at);
                    const resolved = item.status === "resolved";
                    return (
                      <tr key={item.id} className="transition hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                              {thumb ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={thumb}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-300">
                                  N/A
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => setDetail(item)}
                                className="block max-w-52 truncate text-left text-sm font-semibold text-slate-900 transition hover:text-sky-600"
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
                        <td className="px-4 py-4 whitespace-nowrap">
                          <StatusBadge
                            label={item.type === "lost" ? "Kehilangan" : "Ditemukan"}
                            tone={item.type === "lost" ? "rose" : "blue"}
                          />
                        </td>
                        <td className="max-w-44 truncate px-4 py-4 text-slate-600" title={item.location}>
                          {item.location}
                        </td>
                        <td className="px-4 py-4 font-medium whitespace-nowrap text-slate-800">
                          {item.user?.name ?? `User #${item.user_id}`}
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
                              title="Detail laporan"
                              aria-label={`Detail ${item.title}`}
                              className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                              {actionIcon(ICON_EYE)}
                            </button>
                            {deleted ? (
                              <button
                                type="button"
                                onClick={() => setConfirm({ item, action: "restore" })}
                                title="Pulihkan laporan"
                                aria-label={`Pulihkan ${item.title}`}
                                className="rounded p-1.5 text-emerald-600 transition hover:bg-emerald-500/15"
                              >
                                {actionIcon(ICON_RESTORE)}
                              </button>
                            ) : (
                              <>
                                {!resolved && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setConfirm({ item, action: "mark_resolved" })
                                    }
                                    title="Tandai selesai"
                                    aria-label={`Tandai selesai ${item.title}`}
                                    className="rounded p-1.5 text-sky-600 transition hover:bg-sky-500/15"
                                  >
                                    {actionIcon(ICON_CHECK)}
                                  </button>
                                )}
                                {item.status !== "hidden" ? (
                                  <button
                                    type="button"
                                    onClick={() => setConfirm({ item, action: "hide" })}
                                    title="Sembunyikan laporan"
                                    aria-label={`Sembunyikan ${item.title}`}
                                    className="rounded p-1.5 text-amber-600 transition hover:bg-amber-500/15"
                                  >
                                    {actionIcon(ICON_PAUSE)}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirm({ item, action: "restore" })}
                                    title="Pulihkan laporan"
                                    aria-label={`Pulihkan ${item.title}`}
                                    className="rounded p-1.5 text-emerald-600 transition hover:bg-emerald-500/15"
                                  >
                                    {actionIcon(ICON_RESTORE)}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setConfirm({ item, action: "delete" })}
                                  title="Hapus laporan"
                                  aria-label={`Hapus ${item.title}`}
                                  className="rounded p-1.5 text-rose-600 transition hover:bg-rose-500/15"
                                >
                                  {actionIcon(ICON_TRASH)}
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
