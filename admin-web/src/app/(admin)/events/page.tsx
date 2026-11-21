"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import EmptyState from "@/components/admin/EmptyState";
import Pagination from "@/components/admin/Pagination";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  deleteAdminEvent,
  downloadAdminCsv,
  getAdminEvents,
  updateAdminEventStatus,
  type AdminEventItem,
  type EventStatus,
  type Paginated,
} from "@/lib/admin-api";
import { safeHttpUrl } from "@/lib/format";
import { mediaUrl } from "@/lib/media";

const LOAD_ERROR =
  "Gagal memuat daftar event kampus. Pastikan backend berjalan lalu coba lagi.";

function statusMeta(status: string): {
  label: string;
  tone: "green" | "amber" | "blue" | "slate" | "rose";
} {
  switch (status) {
    case "published":
      return { label: "Published", tone: "green" };
    case "pending":
      return { label: "Pending", tone: "amber" };
    case "draft":
      return { label: "Draft", tone: "slate" };
    case "archived":
      return { label: "Archived", tone: "blue" };
    case "rejected":
      return { label: "Ditolak", tone: "rose" };
    default:
      return { label: status, tone: "slate" };
  }
}

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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
const ICON_EDIT =
  "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z";
const ICON_PUBLISH = "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z";
const ICON_ARCHIVE =
  "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4";
const ICON_TRASH =
  "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16";

function DetailDialog({
  item,
  onClose,
}: {
  item: AdminEventItem;
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
  const meta = statusMeta(item.status);
  const safeRegistrationHref = safeHttpUrl(item.registration_link);

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
              {item.event_code ?? `#${item.id}`} ·{" "}
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
            <dt className="text-slate-400">Penyelenggara</dt>
            <dd className="font-medium text-right text-slate-800">
              {item.organizer_name}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Jadwal</dt>
            <dd className="font-medium text-right text-slate-800">
              {formatEventDate(item.event_date)}
              {item.event_time ? ` · ${item.event_time}` : ""}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Lokasi</dt>
            <dd className="font-medium text-right text-slate-800">{item.location}</dd>
          </div>
          {item.registration_link && (
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Pendaftaran</dt>
              <dd className="truncate font-medium">
                {safeRegistrationHref ? (
                  <a
                    href={safeRegistrationHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-600 hover:underline"
                  >
                    {item.registration_link}
                  </a>
                ) : (
                  <span className="text-slate-700">
                    {item.registration_link}
                  </span>
                )}
              </dd>
            </div>
          )}
        </dl>

        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-line text-slate-600">
          {item.description || "Tidak ada deskripsi."}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <Link
            href={`/events/${item.id}/edit`}
            className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Edit Event
          </Link>
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

type ConfirmState =
  | { kind: "delete"; item: AdminEventItem }
  | { kind: "status"; item: AdminEventItem; nextStatus: EventStatus };

export default function EventsAdminPage() {
  const [result, setResult] = useState<Paginated<AdminEventItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminEventItem | null>(null);
  const prevSearchRef = useRef("");

  useEffect(() => {
    const trimmed = search.trim();
    if (prevSearchRef.current === trimmed) return;
    const t = window.setTimeout(() => {
      prevSearchRef.current = trimmed;
      setDebouncedSearch(trimmed);
      setPage(1);
    }, 400);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    getAdminEvents({
      page,
      status: status || undefined,
      search: debouncedSearch || undefined,
    }).then(
      (data) => {
        if (cancelled) return;
        if (data.data.length === 0 && data.current_page > 1) {
          setPage(data.current_page - 1);
          return;
        }
        setError(null);
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
  }, [page, status, debouncedSearch, retryKey]);

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
      const data = await getAdminEvents({
        page,
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
        "/admin/events/export",
        {
          status: status || undefined,
          search: debouncedSearch || undefined,
        },
        "events-kampus.csv",
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
            Informasi Kampus
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Manajemen Event &amp; Informasi
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Buat, ubah, publikasikan, arsipkan, atau hapus agenda dan informasi kegiatan mahasiswa.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-60"
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
          <Link
            href="/events/create"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-slate-800"
          >
            <span aria-hidden="true" className="text-sm leading-none">
              +
            </span>
            Buat Event
          </Link>
        </div>
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
            placeholder="Cari judul event atau penyelenggara…"
            aria-label="Cari event"
            className="w-full rounded-lg bg-slate-100 py-2 pr-4 pl-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="flex items-center gap-2.5">
          <label htmlFor="event-status-filter" className="text-xs font-semibold text-slate-500">
            Status
          </label>
          <select
            id="event-status-filter"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="cursor-pointer appearance-none rounded-lg bg-slate-100 py-2 pr-8 pl-3.5 text-sm text-slate-800 outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">Semua Status</option>
            <option value="published">Published</option>
            <option value="pending">Pending</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
            <option value="rejected">Ditolak</option>
          </select>
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
          <div className="space-y-3 p-4" aria-label="Memuat event">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        ) : result.data.length === 0 ? (
          <EmptyState
            title="Belum ada event"
            message="Tambahkan event baru atau ubah kata kunci dan filter status."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    <th className="px-4 py-3.5 font-medium">Judul &amp; Kategori</th>
                    <th className="px-4 py-3.5 font-medium">Penyelenggara</th>
                    <th className="px-4 py-3.5 font-medium">Jadwal</th>
                    <th className="px-4 py-3.5 font-medium">Lokasi</th>
                    <th className="px-4 py-3.5 font-medium">Status</th>
                    <th className="px-4 py-3.5 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {result.data.map((item) => {
                    const meta = statusMeta(item.status);
                    return (
                      <tr key={item.id} className="transition hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => setDetail(item)}
                            className="block max-w-60 truncate text-left text-sm font-semibold text-slate-900 transition hover:text-sky-600"
                            title={item.title}
                          >
                            {item.title}
                          </button>
                          <span className="mt-0.5 inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-500 uppercase">
                            {item.category?.name ?? "Tanpa kategori"}
                          </span>
                        </td>
                        <td className="max-w-44 truncate px-4 py-4 font-medium text-slate-800">
                          {item.organizer_name}
                        </td>
                        <td className="px-4 py-4 text-xs whitespace-nowrap text-slate-600">
                          <p className="font-semibold text-slate-800">
                            {formatEventDate(item.event_date)}
                          </p>
                          {item.event_time && (
                            <p className="text-slate-400">{item.event_time}</p>
                          )}
                        </td>
                        <td className="max-w-44 truncate px-4 py-4 text-slate-600" title={item.location}>
                          {item.location}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge label={meta.label} tone={meta.tone} />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setDetail(item)}
                              title="Detail event"
                              aria-label={`Detail ${item.title}`}
                              className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                              {actionIcon(ICON_EYE)}
                            </button>
                            <Link
                              href={`/events/${item.id}/edit`}
                              title="Ubah event"
                              aria-label={`Ubah ${item.title}`}
                              className="rounded p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                            >
                              {actionIcon(ICON_EDIT)}
                            </Link>
                            {item.status !== "published" && (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirm({
                                    kind: "status",
                                    item,
                                    nextStatus: "published",
                                  })
                                }
                                title="Publikasikan event"
                                aria-label={`Publikasikan ${item.title}`}
                                className="rounded p-1.5 text-emerald-600 transition hover:bg-emerald-500/15"
                              >
                                {actionIcon(ICON_PUBLISH)}
                              </button>
                            )}
                            {item.status !== "archived" && (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirm({
                                    kind: "status",
                                    item,
                                    nextStatus: "archived",
                                  })
                                }
                                title="Arsipkan event"
                                aria-label={`Arsipkan ${item.title}`}
                                className="rounded p-1.5 text-amber-600 transition hover:bg-amber-500/15"
                              >
                                {actionIcon(ICON_ARCHIVE)}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setConfirm({ kind: "delete", item })}
                              title="Hapus event"
                              aria-label={`Hapus ${item.title}`}
                              className="rounded p-1.5 text-rose-600 transition hover:bg-rose-500/15"
                            >
                              {actionIcon(ICON_TRASH)}
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
              onPage={setPage}
            />
          </>
        )}
      </section>

      {confirm && (
        <ConfirmDialog
          title={
            confirm.kind === "delete"
              ? "Hapus event?"
              : confirm.nextStatus === "published"
                ? "Publikasikan event?"
                : "Arsipkan event?"
          }
          message={
            confirm.kind === "delete"
              ? `Event "${confirm.item.title}" akan dihapus dari portal.`
              : confirm.nextStatus === "published"
                ? `Event "${confirm.item.title}" akan ditayangkan di portal mahasiswa.`
                : `Event "${confirm.item.title}" akan dipindahkan ke arsip.`
          }
          confirmLabel={
            confirm.kind === "delete"
              ? "Hapus"
              : confirm.nextStatus === "published"
                ? "Publikasikan"
                : "Arsipkan"
          }
          danger={confirm.kind === "delete"}
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
