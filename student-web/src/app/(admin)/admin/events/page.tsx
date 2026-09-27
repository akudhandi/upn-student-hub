"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  FilterTabs,
  Modal,
  StatusPill,
  TableEmpty,
  TableError,
  TableLoading,
  type PillTone,
} from "@/components/admin-ui";

type AdminEventItem = {
  id: number;
  title: string;
  slug: string;
  organizer_name: string;
  event_date: string;
  event_time?: string | null;
  location: string;
  description: string | null;
  status: string;
  user?: { id: number; name: string } | null;
  category?: { id: number; name: string; slug: string } | null;
};

type EventListResponse = {
  message: string;
  data: {
    current_page: number;
    last_page: number;
    total: number;
    data: AdminEventItem[];
  };
};

type StatusFilter = "pending" | "published" | "rejected";

const STATUS_TABS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "pending", label: "Menunggu" },
  { value: "published", label: "Terbit" },
  { value: "rejected", label: "Ditolak" },
];

const STATUS_PILL: Record<string, { tone: PillTone; label: string }> = {
  pending: { tone: "amber", label: "Menunggu" },
  draft: { tone: "slate", label: "Draf" },
  published: { tone: "green", label: "Terbit" },
  rejected: { tone: "red", label: "Ditolak" },
  archived: { tone: "slate", label: "Arsip" },
};

function formatEventDate(isoDate: string, time?: string | null): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "-";
  const day = date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  return time?.trim() ? `${day} • ${time.trim()}` : day;
}

export default function AdminEventsPage() {
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [items, setItems] = useState<AdminEventItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminEventItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadEvents = useCallback(async (status: StatusFilter, pageNum: number, signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiFetch<EventListResponse>(
        `/v1/admin/events?status=${status}&page=${pageNum}`
      );
      if (signal?.aborted) return;
      setItems(res.data.data);
      setPage(res.data.current_page);
      setLastPage(res.data.last_page);
      setTotal(res.data.total);
    } catch {
      if (signal?.aborted) return;
      setItems([]);
      setError("Gagal memuat data event. Periksa koneksi ke backend lalu coba lagi.");
    } finally {
      if (signal?.aborted) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount and filter change
    void loadEvents(filter, 1, controller.signal);
    return () => {
      controller.abort();
    };
  }, [filter, loadEvents]);

  function refresh() {
    void loadEvents(filter, page);
  }

  async function updateStatus(id: number, status: "published" | "rejected", reason?: string) {
    try {
      setActionId(id);
      setActionError(null);
      await apiFetch(`/v1/admin/events/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify(
          reason ? { status, rejection_reason: reason } : { status }
        ),
      });
      setRejectTarget(null);
      setRejectionReason("");
      refresh();
    } catch {
      setActionError("Gagal memperbarui status event. Coba lagi.");
    } finally {
      setActionId(null);
    }
  }

  function goToPage(pageNum: number) {
    if (pageNum < 1 || pageNum > lastPage || pageNum === page) return;
    void loadEvents(filter, pageNum);
  }

  return (
    <div>
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900 sm:text-[26px]">Kurasi Event</h1>
        <p className="mt-1 max-w-[560px] text-sm text-slate-500">
          Tinjau pengajuan event kampus, terbitkan yang layak, atau tolak beserta alasannya.
        </p>
      </div>

      <div className="mt-4">
        <FilterTabs
          ariaLabel="Filter event berdasarkan status"
          options={STATUS_TABS}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {actionError && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {actionError}
        </div>
      )}

      <div className="mt-4">
        {isLoading ? (
          <TableLoading label="Memuat data event" columns={4} />
        ) : error ? (
          <TableError message={error} onRetry={refresh} />
        ) : items.length === 0 ? (
          <TableEmpty
            title="Tidak ada event pada tab ini"
            description="Semua pengajuan pada status ini sudah ditangani."
          />
        ) : (
          <>
            <p className="mb-2 text-xs text-slate-500" role="status">
              Menampilkan {items.length} dari {total} event
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-3 font-semibold">Event</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Tanggal</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      <span className="sr-only">Aksi</span>Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const pill = STATUS_PILL[item.status] ?? { tone: "slate" as PillTone, label: item.status };
                    const busy = actionId === item.id;
                    return (
                      <tr key={item.id} className="align-top hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <div
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#0A2342] text-white/70"
                              role="img"
                              aria-label={`Poster ${item.title}`}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <rect x="2" y="4" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M2 9H22" stroke="currentColor" strokeWidth="1.5" />
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <p className="line-clamp-2 text-[13px] font-semibold text-slate-900">{item.title}</p>
                              <p className="mt-0.5 truncate text-xs text-slate-500">
                                {item.organizer_name}
                                {item.category?.name ? ` • ${item.category.name}` : ""}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-slate-400">{item.location}</p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-600">
                          {formatEventDate(item.event_date, item.event_time)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              disabled={busy}
                              onClick={() => void updateStatus(item.id, "published")}
                              aria-label={`Setujui event ${item.title}`}
                            >
                              {busy ? "…" : "Setujui"}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busy}
                              onClick={() => {
                                setRejectTarget(item);
                                setRejectionReason("");
                                setActionError(null);
                              }}
                              aria-label={`Tolak event ${item.title}`}
                            >
                              Tolak
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {lastPage > 1 && (
              <nav aria-label="Navigasi halaman event" className="mt-4 flex items-center justify-center gap-2">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                  ← Sebelumnya
                </Button>
                <span className="text-xs text-slate-500" role="status">
                  Halaman {page} dari {lastPage}
                </span>
                <Button size="sm" variant="secondary" disabled={page >= lastPage} onClick={() => goToPage(page + 1)}>
                  Berikutnya →
                </Button>
              </nav>
            )}
          </>
        )}
      </div>

      {rejectTarget && (
        <Modal
          title="Tolak pengajuan event"
          description={`"${rejectTarget.title}" tidak akan ditampilkan ke mahasiswa. Tulis alasan penolakan bila perlu.`}
          onClose={() => {
            setRejectTarget(null);
            setRejectionReason("");
          }}
        >
          <Label htmlFor="rejection-reason">Alasan penolakan (opsional)</Label>
          <textarea
            id="rejection-reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Contoh: Informasi kegiatan belum lengkap…"
            className="mt-1.5 flex min-h-[96px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setRejectTarget(null);
                setRejectionReason("");
              }}
            >
              Batal
            </Button>
            <Button
              disabled={actionId === rejectTarget.id}
              onClick={() =>
                void updateStatus(
                  rejectTarget.id,
                  "rejected",
                  rejectionReason.trim() ? rejectionReason.trim() : undefined
                )
              }
            >
              {actionId === rejectTarget.id ? "Memproses…" : "Tolak event"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
