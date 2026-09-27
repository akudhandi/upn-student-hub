"use client";

import { useCallback, useEffect, useState } from "react";
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

type LostFoundItem = {
  id: number;
  type: string;
  title: string;
  location: string;
  status: string;
  created_at: string;
  deleted_at?: string | null;
  reports_count?: number;
  user?: { id: number; name: string } | null;
  images?: ApiImage[] | null;
};

type ListResponse = {
  message: string;
  data: { current_page: number; last_page: number; total: number; data: LostFoundItem[] };
};

type TabFilter = "all" | "lost" | "found" | "resolved";

const TAB_OPTIONS: ReadonlyArray<{ value: TabFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "lost", label: "Lost" },
  { value: "found", label: "Found" },
  { value: "resolved", label: "Resolved" },
];

const STATUS_PILL: Record<string, { tone: PillTone; label: string }> = {
  open: { tone: "green", label: "Open" },
  hidden: { tone: "amber", label: "Hidden" },
  resolved: { tone: "blue", label: "Resolved" },
  closed: { tone: "blue", label: "Closed" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminLostFoundPage() {
  const [tab, setTab] = useState<TabFilter>("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const loadItems = useCallback(async (activeTab: TabFilter, search: string, signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: "1", tab: activeTab });
      if (search) params.set("search", search);
      const res = await apiFetch<ListResponse>(`/v1/admin/lost-found?${params.toString()}`);
      if (signal?.aborted) return;
      setItems(res.data.data);
      setTotal(res.data.total);
    } catch {
      if (signal?.aborted) return;
      setItems([]);
      setError("Gagal memuat data lost & found. Periksa koneksi ke backend lalu coba lagi.");
    } finally {
      if (signal?.aborted) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount and tab change
    void loadItems(tab, debouncedQuery, controller.signal);
    return () => {
      controller.abort();
    };
  }, [tab, debouncedQuery, loadItems]);

  async function runAction(id: number, action: "hide" | "restore" | "mark_resolved" | "delete") {
    try {
      setActionId(id);
      setActionError(null);
      await apiFetch(`/v1/admin/lost-found/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      void loadItems(tab, debouncedQuery);
    } catch {
      setActionError("Gagal memproses laporan. Coba lagi.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div>
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900 sm:text-[26px]">Lost & Found</h1>
        <p className="mt-1 max-w-[600px] text-sm text-slate-500">
          Moderasi laporan barang hilang & ditemukan: sembunyikan, tandai selesai, hapus, atau pulihkan.
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs ariaLabel="Filter lost and found" options={TAB_OPTIONS} value={tab} onChange={setTab} />
        <div className="w-full sm:max-w-[280px]">
          <label htmlFor="lostfound-search" className="sr-only">Cari barang</label>
          <Input id="lostfound-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari barang / lokasi…" />
        </div>
      </div>

      {actionError && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {actionError}
        </div>
      )}

      <div className="mt-4">
        {isLoading ? (
          <TableLoading label="Memuat data lost and found" columns={6} />
        ) : error ? (
          <TableError message={error} onRetry={() => void loadItems(tab, debouncedQuery)} />
        ) : items.length === 0 ? (
          <TableEmpty title="Tidak ada laporan" description="Belum ada laporan pada tab ini." />
        ) : (
          <>
            <p className="mb-2 text-xs text-slate-500" role="status">Menampilkan {items.length} dari {total} laporan</p>
            <div className="admin-table-wrap admin-table overflow-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-3 font-semibold">Barang</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Tipe</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Pelapor</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Lokasi</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Tanggal</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Aksi</span>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const pill = item.deleted_at
                      ? { tone: "red" as PillTone, label: "Deleted" }
                      : (STATUS_PILL[item.status] ?? { tone: "slate" as PillTone, label: item.status });
                    const busy = actionId === item.id;
                    const trashed = Boolean(item.deleted_at);
                    const resolved = ["resolved", "closed"].includes(item.status);
                    return (
                      <tr key={item.id} className="align-top hover:bg-slate-50/60">
                        <td className="max-w-[260px] px-4 py-3 text-[13px] font-semibold text-slate-900">
                          <div className="flex items-start gap-3">
                            <ListingImage
                              module="lostfound"
                              seed={item.id}
                              hint={`${item.type} ${item.title}`}
                              images={item.images}
                              alt={`Foto ${item.title}`}
                              className="h-11 w-11 shrink-0 rounded-lg object-cover"
                            />
                            <p className="line-clamp-2 min-w-0">{item.title}</p>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusPill tone={item.type === "lost" ? "red" : "blue"}>
                            {item.type === "lost" ? "Lost" : "Found"}
                          </StatusPill>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-600">{item.user?.name ?? "-"}</td>
                        <td className="max-w-[180px] px-4 py-3 text-[13px] text-slate-600">
                          <p className="line-clamp-2">{item.location}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-600">{formatDate(item.created_at)}</td>
                        <td className="whitespace-nowrap px-4 py-3"><StatusPill tone={pill.tone}>{pill.label}</StatusPill></td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {!trashed && !resolved && (
                              <Button size="sm" disabled={busy} onClick={() => void runAction(item.id, "mark_resolved")} aria-label={`Tandai selesai ${item.title}`}>Selesai</Button>
                            )}
                            {!trashed && item.status !== "hidden" && (
                              <Button size="sm" variant="secondary" disabled={busy} onClick={() => void runAction(item.id, "hide")} aria-label={`Sembunyikan ${item.title}`}>Hide</Button>
                            )}
                            {!trashed && (
                              <Button size="sm" variant="secondary" disabled={busy} onClick={() => void runAction(item.id, "delete")} aria-label={`Hapus ${item.title}`}>Delete</Button>
                            )}
                            {(trashed || item.status === "hidden") && (
                              <Button size="sm" variant="secondary" disabled={busy} onClick={() => void runAction(item.id, "restore")} aria-label={`Pulihkan ${item.title}`}>Restore</Button>
                            )}
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
