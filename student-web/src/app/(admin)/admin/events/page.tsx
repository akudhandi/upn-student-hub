"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FilterTabs,
  StatusPill,
  TableEmpty,
  TableError,
  TableLoading,
  type PillTone,
} from "@/components/admin-ui";
import ListingImage from "@/components/ListingImage";
import type { ApiImage } from "@/lib/images";

type AdminEventItem = {
  id: number;
  title: string;
  organizer_name: string;
  event_date: string;
  event_time?: string | null;
  location: string;
  status: string;
  category?: { id: number; name: string; slug: string } | null;
  images?: ApiImage[] | null;
};

type EventListResponse = {
  message: string;
  data: { current_page: number; last_page: number; total: number; data: AdminEventItem[] };
};

type StatusFilter = "all" | "draft" | "pending" | "published" | "archived";

const STATUS_TABS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

const STATUS_PILL: Record<string, { tone: PillTone; label: string }> = {
  draft: { tone: "slate", label: "Draft" },
  pending: { tone: "amber", label: "Pending" },
  published: { tone: "green", label: "Published" },
  rejected: { tone: "red", label: "Ditolak" },
  archived: { tone: "slate", label: "Archived" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminEventsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [items, setItems] = useState<AdminEventItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const loadItems = useCallback(async (status: StatusFilter, search: string, signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: "1" });
      if (status !== "all") params.set("status", status);
      if (search) params.set("search", search);
      const res = await apiFetch<EventListResponse>(`/v1/admin/events?${params.toString()}`);
      if (signal?.aborted) return;
      setItems(res.data.data);
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
    void loadItems(filter, debouncedQuery, controller.signal);
    return () => {
      controller.abort();
    };
  }, [filter, debouncedQuery, loadItems]);

  function refresh() {
    void loadItems(filter, debouncedQuery);
  }

  async function changeStatus(id: number, status: string) {
    try {
      setActionId(id);
      setActionError(null);
      await apiFetch(`/v1/admin/events/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      refresh();
    } catch {
      setActionError("Gagal memperbarui status event. Coba lagi.");
    } finally {
      setActionId(null);
    }
  }

  async function deleteEvent(id: number, title: string) {
    if (!window.confirm(`Hapus event "${title}"? Tindakan ini dapat dibatalkan via restore data.`)) return;
    try {
      setActionId(id);
      setActionError(null);
      await apiFetch(`/v1/admin/events/${id}`, { method: "DELETE" });
      refresh();
    } catch {
      setActionError("Gagal menghapus event. Coba lagi.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900 sm:text-[26px]">Event & Informasi</h1>
          <p className="mt-1 max-w-[600px] text-sm text-slate-500">
            Full CRUD pengumuman kampus: buat, ubah, publikasikan, arsipkan, atau hapus.
          </p>
        </div>
        <Button onClick={() => router.push("/admin/events/create")}>+ Buat Event</Button>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs ariaLabel="Filter event berdasarkan status" options={STATUS_TABS} value={filter} onChange={setFilter} />
        <div className="w-full sm:max-w-[280px]">
          <label htmlFor="events-search" className="sr-only">Cari event</label>
          <Input id="events-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari judul / penyelenggara…" />
        </div>
      </div>

      {actionError && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {actionError}
        </div>
      )}

      <div className="mt-4">
        {isLoading ? (
          <TableLoading label="Memuat data event" columns={5} />
        ) : error ? (
          <TableError message={error} onRetry={refresh} />
        ) : items.length === 0 ? (
          <TableEmpty title="Tidak ada event" description="Belum ada event pada filter ini. Buat event baru bila perlu." />
        ) : (
          <>
            <p className="mb-2 text-xs text-slate-500" role="status">Menampilkan {items.length} dari {total} event</p>
            <div className="admin-table-wrap admin-table overflow-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-3 font-semibold">Judul</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Kategori</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Tanggal</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Aksi</span>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const pill = STATUS_PILL[item.status] ?? { tone: "slate" as PillTone, label: item.status };
                    const busy = actionId === item.id;
                    return (
                      <tr key={item.id} className="align-top hover:bg-slate-50/60">
                        <td className="max-w-[300px] px-4 py-3">
                          <div className="flex items-start gap-3">
                            <ListingImage
                              module="event"
                              seed={item.id}
                              hint={item.title}
                              images={item.images}
                              alt={`Poster ${item.title}`}
                              className="h-11 w-11 shrink-0 rounded-lg object-cover"
                            />
                            <div className="min-w-0">
                              <p className="line-clamp-2 text-[13px] font-semibold text-slate-900">{item.title}</p>
                              <p className="mt-0.5 truncate text-xs text-slate-500">{item.organizer_name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-600">{item.category?.name ?? "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-600">{formatDate(item.event_date)}</td>
                        <td className="whitespace-nowrap px-4 py-3"><StatusPill tone={pill.tone}>{pill.label}</StatusPill></td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/admin/events/${item.id}/edit`}
                              className="inline-flex h-8 items-center rounded-md border border-gray-200 bg-white px-3 text-xs font-medium text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
                            >
                              Edit
                            </Link>
                            {item.status !== "published" && (
                              <Button size="sm" disabled={busy} onClick={() => void changeStatus(item.id, "published")} aria-label={`Publikasikan ${item.title}`}>Publish</Button>
                            )}
                            {item.status !== "archived" && (
                              <Button size="sm" variant="secondary" disabled={busy} onClick={() => void changeStatus(item.id, "archived")} aria-label={`Arsipkan ${item.title}`}>Arsip</Button>
                            )}
                            <Button size="sm" variant="secondary" disabled={busy} onClick={() => void deleteEvent(item.id, item.title)} aria-label={`Hapus ${item.title}`}>Hapus</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
