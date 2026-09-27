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

type ListingItem = {
  id: number;
  title: string;
  price: string | number;
  status: string;
  created_at: string;
  deleted_at?: string | null;
  reports_count?: number;
  user?: { id: number; name: string } | null;
  category?: { id: number; name: string; slug: string } | null;
};

type ListResponse = {
  message: string;
  data: { current_page: number; last_page: number; total: number; data: ListingItem[] };
};

type StatusFilter = "all" | "active" | "hidden" | "sold" | "inactive" | "deleted";

const STATUS_TABS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "active", label: "Aktif" },
  { value: "hidden", label: "Hidden" },
  { value: "sold", label: "Terjual" },
  { value: "inactive", label: "Nonaktif" },
  { value: "deleted", label: "Dihapus" },
];

const STATUS_PILL: Record<string, { tone: PillTone; label: string }> = {
  active: { tone: "green", label: "Active" },
  hidden: { tone: "amber", label: "Hidden" },
  sold: { tone: "blue", label: "Terjual" },
  inactive: { tone: "slate", label: "Nonaktif" },
};

function formatPrice(value: string | number): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return String(value);
  return `Rp${num.toLocaleString("id-ID")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminMarketplacePage() {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [items, setItems] = useState<ListingItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const loadItems = useCallback(async (status: StatusFilter, search: string, pageNum: number, signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(pageNum) });
      if (status !== "all") params.set("status", status);
      if (search) params.set("search", search);
      const res = await apiFetch<ListResponse>(`/v1/admin/marketplace?${params.toString()}`);
      if (signal?.aborted) return;
      setItems(res.data.data);
      setPage(res.data.current_page);
      setTotal(res.data.total);
    } catch {
      if (signal?.aborted) return;
      setItems([]);
      setError("Gagal memuat data marketplace. Periksa koneksi ke backend lalu coba lagi.");
    } finally {
      if (signal?.aborted) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount and filter change
    void loadItems(filter, debouncedQuery, 1, controller.signal);
    return () => {
      controller.abort();
    };
  }, [filter, debouncedQuery, loadItems]);

  async function runAction(id: number, action: "hide" | "restore" | "delete") {
    try {
      setActionId(id);
      setActionError(null);
      await apiFetch(`/v1/admin/marketplace/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      void loadItems(filter, debouncedQuery, page);
    } catch {
      setActionError("Gagal memproses listing. Coba lagi.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div>
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900 sm:text-[26px]">Marketplace</h1>
        <p className="mt-1 max-w-[600px] text-sm text-slate-500">
          Monitoring & moderasi listing preloved: sembunyikan, hapus, atau pulihkan konten bermasalah.
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs ariaLabel="Filter marketplace berdasarkan status" options={STATUS_TABS} value={filter} onChange={setFilter} />
        <div className="w-full sm:max-w-[280px]">
          <label htmlFor="marketplace-search" className="sr-only">Cari listing</label>
          <Input id="marketplace-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari judul listing…" />
        </div>
      </div>

      {actionError && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {actionError}
        </div>
      )}

      <div className="mt-4">
        {isLoading ? (
          <TableLoading label="Memuat data marketplace" columns={6} />
        ) : error ? (
          <TableError message={error} onRetry={() => void loadItems(filter, debouncedQuery, page)} />
        ) : items.length === 0 ? (
          <TableEmpty title="Tidak ada listing" description="Belum ada listing pada filter ini." />
        ) : (
          <>
            <p className="mb-2 text-xs text-slate-500" role="status">Menampilkan {items.length} dari {total} listing</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-3 font-semibold">Judul</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Seller</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Kategori</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Harga</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Laporan</th>
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
                    return (
                      <tr key={item.id} className="align-top hover:bg-slate-50/60">
                        <td className="max-w-[240px] px-4 py-3">
                          <p className="line-clamp-2 text-[13px] font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-0.5 text-xs text-slate-400">{formatDate(item.created_at)}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-600">{item.user?.name ?? "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-600">{item.category?.name ?? "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] font-medium text-slate-900">{formatPrice(item.price)}</td>
                        <td className="whitespace-nowrap px-4 py-3"><StatusPill tone={pill.tone}>{pill.label}</StatusPill></td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-600">{item.reports_count ?? 0}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-2">
                            {!trashed && item.status !== "hidden" && (
                              <Button size="sm" variant="secondary" disabled={busy} onClick={() => void runAction(item.id, "hide")} aria-label={`Sembunyikan ${item.title}`}>Hide</Button>
                            )}
                            {!trashed && (
                              <Button size="sm" variant="secondary" disabled={busy} onClick={() => void runAction(item.id, "delete")} aria-label={`Hapus ${item.title}`}>Delete</Button>
                            )}
                            {(trashed || item.status === "hidden") && (
                              <Button size="sm" disabled={busy} onClick={() => void runAction(item.id, "restore")} aria-label={`Pulihkan ${item.title}`}>Restore</Button>
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
