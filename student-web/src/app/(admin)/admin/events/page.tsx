"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AdminMetricCard,
  AdminPageHeader,
  FilterTabs,
  MetricIcon,
  StatusPill,
  TableEmpty,
  TableError,
  TableLoading,
  ToolbarButton,
  exportToCsv,
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

  function handleExport() {
    exportToCsv(
      "events.csv",
      ["ID", "Judul", "Penyelenggara", "Kategori", "Tanggal", "Lokasi", "Status"],
      items.map((i) => [
        i.id,
        i.title,
        i.organizer_name,
        i.category?.name ?? "-",
        formatDate(i.event_date),
        i.location,
        i.status,
      ])
    );
  }

  const publishedCount = items.filter((i) => i.status === "published").length;
  const pendingCount = items.filter((i) => ["pending", "draft"].includes(i.status)).length;
  const archivedCount = items.filter((i) => i.status === "archived").length;

  return (
    <div>
      <AdminPageHeader
        title="Manajemen Event & Informasi"
        subtitle="Kelola pengumuman kampus: buat, kurasi, publikasikan, arsipkan, atau hapus."
        actions={
          <>
            <ToolbarButton variant="light" onClick={handleExport} ariaLabel="Ekspor data event ke CSV">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-slate-500">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Ekspor (.csv)
            </ToolbarButton>
            <button
              type="button"
              onClick={() => router.push("/admin/events/create")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <span aria-hidden="true" className="text-base leading-none">+</span> Tambah Info Kampus
            </button>
          </>
        }
      />

      <div className="mb-6 mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard
          label="Total Event"
          value={total.toLocaleString("id-ID")}
          icon={<MetricIcon><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></MetricIcon>}
          iconClass="bg-rose-500/10 text-rose-600"
          accentClass="bg-rose-500"
          trend={{ text: `${publishedCount} tayang`, className: "text-emerald-600" }}
          footer="pada filter ini"
        />
        <AdminMetricCard
          label="Published"
          value={publishedCount.toLocaleString("id-ID")}
          icon={<MetricIcon><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></MetricIcon>}
          iconClass="bg-emerald-500/10 text-emerald-600"
          accentClass="bg-emerald-500"
          footer="dari data dimuat"
        />
        <AdminMetricCard
          label="Draft / Pending"
          value={pendingCount.toLocaleString("id-ID")}
          icon={<MetricIcon><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></MetricIcon>}
          iconClass="bg-amber-500/10 text-amber-600"
          accentClass="bg-amber-500"
          footer="menunggu kurasi"
        />
        <AdminMetricCard
          label="Archived"
          value={archivedCount.toLocaleString("id-ID")}
          icon={<MetricIcon><path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v12a2 2 0 002 2h10a2 2 0 002-2V8" /></MetricIcon>}
          iconClass="bg-slate-500/10 text-slate-600"
          accentClass="bg-slate-500"
          footer="dari data dimuat"
        />
      </div>

      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:w-96">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20L16.5 16.5" />
              </svg>
            </span>
            <label htmlFor="events-search" className="sr-only">Cari event</label>
            <Input
              id="events-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari judul, penyelenggara..."
              className="border-transparent bg-slate-100 pl-10 focus:border-slate-300 focus:bg-white"
            />
          </div>
          <FilterTabs ariaLabel="Filter event berdasarkan status" options={STATUS_TABS} value={filter} onChange={setFilter} />
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
            <div className="admin-table-wrap admin-table overflow-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-3 font-semibold">Event & Penyelenggara</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Kategori</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Jadwal / Tanggal Event</th>
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
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-600">
                          <p>{formatDate(item.event_date)}</p>
                          <p className="mt-0.5 max-w-[200px] truncate text-xs text-slate-400">{item.location}</p>
                        </td>
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
