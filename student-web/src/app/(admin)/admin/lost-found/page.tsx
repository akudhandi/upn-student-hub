"use client";

import { useCallback, useEffect, useState } from "react";
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

  function handleExport() {
    exportToCsv(
      "lost-found.csv",
      ["ID", "Barang", "Tipe", "Pelapor", "Lokasi", "Tanggal", "Status"],
      items.map((i) => [
        i.id,
        i.title,
        i.type,
        i.user?.name ?? "-",
        i.location,
        formatDate(i.created_at),
        i.deleted_at ? "deleted" : i.status,
      ])
    );
  }

  const lostCount = items.filter((i) => i.type === "lost").length;
  const foundCount = items.filter((i) => i.type === "found").length;
  const resolvedCount = items.filter((i) => ["resolved", "closed"].includes(i.status)).length;

  return (
    <div>
      <AdminPageHeader
        title="Manajemen Lost & Found"
        subtitle="Moderasi laporan barang hilang & ditemukan: verifikasi, tandai selesai, atau hapus."
        actions={
          <ToolbarButton variant="light" onClick={handleExport} ariaLabel="Ekspor data lost and found ke CSV">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-slate-500">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Ekspor (.csv)
          </ToolbarButton>
        }
      />

      <div className="mb-6 mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard
          label="Total Laporan"
          value={total.toLocaleString("id-ID")}
          icon={<MetricIcon><path d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></MetricIcon>}
          iconClass="bg-sky-500/10 text-sky-600"
          accentClass="bg-sky-500"
          footer="pada tab ini"
        />
        <AdminMetricCard
          label="Barang Hilang"
          value={lostCount.toLocaleString("id-ID")}
          icon={<MetricIcon><circle cx="11" cy="11" r="7" /><path d="M20 20L16.5 16.5" /></MetricIcon>}
          iconClass="bg-red-500/10 text-red-600"
          accentClass="bg-red-500"
          footer="dari data dimuat"
        />
        <AdminMetricCard
          label="Barang Ditemukan"
          value={foundCount.toLocaleString("id-ID")}
          icon={<MetricIcon><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></MetricIcon>}
          iconClass="bg-indigo-500/10 text-indigo-600"
          accentClass="bg-indigo-500"
          footer="dari data dimuat"
        />
        <AdminMetricCard
          label="Berhasil Kembali"
          value={resolvedCount.toLocaleString("id-ID")}
          icon={<MetricIcon><path d="M5 13l4 4L19 7" /></MetricIcon>}
          iconClass="bg-emerald-500/10 text-emerald-600"
          accentClass="bg-emerald-500"
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
            <label htmlFor="lostfound-search" className="sr-only">Cari barang</label>
            <Input
              id="lostfound-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari barang, lokasi, pelapor..."
              className="border-transparent bg-slate-100 pl-10 focus:border-slate-300 focus:bg-white"
            />
          </div>
          <FilterTabs ariaLabel="Filter lost and found" options={TAB_OPTIONS} value={tab} onChange={setTab} />
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
            <div className="admin-table-wrap admin-table overflow-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
              <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-3 font-semibold">Barang & Lokasi</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Tipe</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Pelapor</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Tanggal Lapor</th>
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
                            <div className="min-w-0">
                              <p className="line-clamp-2">{item.title}</p>
                              <p className="mt-0.5 line-clamp-2 text-xs font-normal text-slate-400">{item.location}</p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusPill tone={item.type === "lost" ? "red" : "blue"}>
                            {item.type === "lost" ? "Lost" : "Found"}
                          </StatusPill>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-600">{item.user?.name ?? "-"}</td>
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
