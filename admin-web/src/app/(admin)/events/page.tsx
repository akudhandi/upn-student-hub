"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  deleteAdminEvent,
  downloadAdminCsv,
  getAdminEvents,
  updateAdminEventStatus,
  type AdminEventItem,
  type EventStatus,
  type Paginated,
} from "@/lib/admin-api";
import { extractAdminError, isAbortError } from "@/lib/api";
import { formatDate, safeHttpUrl } from "@/lib/format";
import { mediaUrl } from "@/lib/media";

const LOAD_ERROR =
  "Gagal memuat daftar event kampus. Pastikan backend berjalan lalu coba lagi.";

function statusMeta(status: string): {
  label: string;
  tone: BadgeTone;
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

function DetailDialog({
  item,
  onClose,
}: {
  item: AdminEventItem;
  onClose: () => void;
}) {
  const images = (item.images ?? []).filter((img) => mediaUrl(img.file_path));
  const meta = statusMeta(item.status);
  const safeRegistrationHref = safeHttpUrl(item.registration_link);

  return (
    <ModalShell ariaLabel={`Detail ${item.title}`} onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-semibold text-[#141416]">{item.title}</h3>
          <p className="mt-0.5 text-xs text-[#787470]">
            {item.event_code ?? `#${item.id}`} ·{" "}
            {item.category?.name ?? "Tanpa kategori"}
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
              className="h-24 w-24 shrink-0 rounded-xl border border-[#E5E0DA] object-cover"
              fallbackClassName="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-[#E5E0DA] bg-[#EFECE8] text-xs font-bold text-[#787470]"
            />
          ))}
        </div>
      )}

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-[#787470]">Penyelenggara</dt>
          <dd className="font-medium text-right text-[#141416]">
            {item.organizer_name}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[#787470]">Jadwal</dt>
          <dd className="font-medium text-right text-[#141416]">
            {formatDate(item.event_date)}
            {item.event_time ? ` · ${item.event_time}` : ""}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[#787470]">Lokasi</dt>
          <dd className="font-medium text-right text-[#141416]">{item.location}</dd>
        </div>
        {item.registration_link && (
          <div className="flex justify-between gap-4">
            <dt className="text-[#787470]">Pendaftaran</dt>
            <dd className="truncate font-medium">
              {safeRegistrationHref ? (
                <a
                  href={safeRegistrationHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#35518C] hover:underline"
                >
                  {item.registration_link}
                </a>
              ) : (
                <span className="text-[#57534E]">
                  {item.registration_link}
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>

      <p className="mt-4 rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] p-3.5 text-sm whitespace-pre-line text-[#57534E]">
        {item.description || "Tidak ada deskripsi."}
      </p>

      <div className="mt-5 flex justify-end gap-2">
        <Link
          href={`/events/${item.id}/edit`}
          className="rounded-full bg-[#141416] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#242428]"
        >
          Edit Event
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-[#DFD9D2] bg-white px-4 py-2 text-xs font-semibold text-[#141416] transition hover:border-[#CFC8BF] hover:bg-[#FAF8F6]"
        >
          Tutup
        </button>
      </div>
    </ModalShell>
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
  const debouncedSearch = useDebouncedValue(search.trim(), 400, () => setPage(1));
  const [retryKey, setRetryKey] = useState(0);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminEventItem | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getAdminEvents(
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
        "/admin/events/export",
        {
          status: status || undefined,
          search: debouncedSearch || undefined,
        },
        "events-kampus.csv",
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
          <p className="text-xs font-medium text-[#787470]">
            Informasi Kampus
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-[#141416] sm:text-3xl">
            Manajemen Event &amp; Informasi
          </h2>
          <p className="mt-1 text-sm text-[#6E6A66]">
            Buat, ubah, publikasikan, arsipkan, atau hapus agenda dan informasi kegiatan mahasiswa.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportCsvButton exporting={exporting} onClick={handleExport} />
          <Link
            href="/events/create"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#141416] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#242428]"
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
          className="rounded-xl border border-[#F3C6C6] bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#A62D2D]"
        >
          {actionError}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border border-[#E5E0DA] bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-96">
          <ActionIcon
            name="search"
            className="absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-[#787470]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul event atau penyelenggara…"
            aria-label="Cari event"
            className="w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] py-2 pr-4 pl-10 text-sm text-[#141416] outline-none transition placeholder:text-[#8C8782] focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
          />
        </div>
        <div className="flex items-center gap-2.5">
          <label htmlFor="event-status-filter" className="text-xs font-semibold text-[#57534E]">
            Status
          </label>
          <SelectWrapper>
            <select
              id="event-status-filter"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="cursor-pointer appearance-none rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] py-2 pr-8 pl-3.5 text-sm text-[#141416] outline-none transition focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
            >
              <option value="">Semua Status</option>
              <option value="published">Published</option>
              <option value="pending">Pending</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
              <option value="rejected">Ditolak</option>
            </select>
          </SelectWrapper>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#E5E0DA] bg-white">
        <TableState
          error={error}
          onRetry={() => {
            setError(null);
            setRetryKey((k) => k + 1);
          }}
          loading={!result}
          loadingLabel="Memuat event"
          empty={Boolean(result && result.data.length === 0)}
          emptyTitle="Belum ada event"
          emptyMessage="Tambahkan event baru atau ubah kata kunci dan filter status."
        >
          {result && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#F2EEEA] bg-[#FAF8F6] text-xs font-semibold tracking-wider text-[#6E6A66] uppercase">
                      <th className="px-4 py-3.5 font-medium">Judul &amp; Kategori</th>
                      <th className="px-4 py-3.5 font-medium">Penyelenggara</th>
                      <th className="px-4 py-3.5 font-medium">Jadwal</th>
                      <th className="px-4 py-3.5 font-medium">Lokasi</th>
                      <th className="px-4 py-3.5 font-medium">Status</th>
                      <th className="px-4 py-3.5 text-right font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2EEEA] text-sm">
                    {result.data.map((item) => {
                      const meta = statusMeta(item.status);
                      return (
                        <tr key={item.id} className="transition hover:bg-[#FAF8F6]">
                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => setDetail(item)}
                              className="block max-w-60 truncate text-left text-sm font-semibold text-[#141416] transition hover:text-[#57534E]"
                              title={item.title}
                            >
                              {item.title}
                            </button>
                            <span className="mt-0.5 inline-block rounded-full bg-[#EFECE8] px-2 py-0.5 text-[10px] font-medium tracking-wide text-[#57534E] uppercase">
                              {item.category?.name ?? "Tanpa kategori"}
                            </span>
                          </td>
                          <td className="max-w-44 truncate px-4 py-4 font-medium text-[#141416]">
                            {item.organizer_name}
                          </td>
                          <td className="px-4 py-4 text-xs whitespace-nowrap text-[#57534E]">
                            <p className="font-semibold text-[#141416]">
                              {formatDate(item.event_date)}
                            </p>
                            {item.event_time && (
                              <p className="text-[#787470]">{item.event_time}</p>
                            )}
                          </td>
                          <td className="max-w-44 truncate px-4 py-4 text-[#57534E]" title={item.location}>
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
                                className="rounded-lg p-1.5 text-[#787470] transition hover:bg-[#EFECE8] hover:text-[#141416]"
                              >
                                <ActionIcon name="eye" />
                              </button>
                              <Link
                                href={`/events/${item.id}/edit`}
                                title="Ubah event"
                                aria-label={`Ubah ${item.title}`}
                                className="rounded-lg p-1.5 text-[#57534E] transition hover:bg-[#EFECE8] hover:text-[#141416]"
                              >
                                <ActionIcon name="edit" />
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
                                  className="rounded-lg p-1.5 text-[#226A46] transition hover:bg-[#E4F2EA]"
                                >
                                  <ActionIcon name="check" />
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
                                  className="rounded-lg p-1.5 text-[#8E581A] transition hover:bg-[#FBEAD8]"
                                >
                                  <ActionIcon name="archive" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setConfirm({ kind: "delete", item })}
                                title="Hapus event"
                                aria-label={`Hapus ${item.title}`}
                                className="rounded-lg p-1.5 text-[#C53939] transition hover:bg-[#FDECEC]"
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
                onPage={setPage}
              />
            </>
          )}
        </TableState>
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
