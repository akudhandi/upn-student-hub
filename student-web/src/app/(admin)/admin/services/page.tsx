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

type ServiceItem = {
  id: number;
  title: string;
  price_min: string | number;
  price_max?: string | number | null;
  status: string;
  created_at: string;
  deleted_at?: string | null;
  reports_count?: number;
  user?: { id: number; name: string } | null;
  images?: ApiImage[] | null;
  category?: { id: number; name: string; slug: string } | null;
};

type ListResponse = {
  message: string;
  data: { current_page: number; last_page: number; total: number; data: ServiceItem[] };
};

type StatusFilter = "all" | "active" | "hidden" | "inactive" | "deleted";

const STATUS_TABS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "active", label: "Aktif" },
  { value: "hidden", label: "Hidden" },
  { value: "inactive", label: "Nonaktif" },
  { value: "deleted", label: "Dihapus" },
];

const STATUS_PILL: Record<string, { tone: PillTone; label: string }> = {
  active: { tone: "green", label: "Active" },
  hidden: { tone: "amber", label: "Hidden" },
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

export default function AdminServicesPage() {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [items, setItems] = useState<ServiceItem[]>([]);
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
      const res = await apiFetch<ListResponse>(`/v1/admin/services?${params.toString()}`);
      if (signal?.aborted) return;
      setItems(res.data.data);
      setTotal(res.data.total);
    } catch {
      if (signal?.aborted) return;
      setItems([]);
      setError("Gagal memuat data jasa. Periksa koneksi ke backend lalu coba lagi.");
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

  async function runAction(id: number, action: "hide" | "restore" | "delete") {
    try {
      setActionId(id);
      setActionError(null);
      await apiFetch(`/v1/admin/services/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      void loadItems(filter, debouncedQuery);
    } catch {
      setActionError("Gagal memproses jasa. Coba lagi.");
    } finally {
      setActionId(null);
    }
  }

  function handleExport() {
    exportToCsv(
      "jasa-mahasiswa.csv",
      ["ID", "Judul", "Penyedia", "Kategori", "Harga Min", "Harga Max", "Status", "Laporan", "Dibuat"],
      items.map((i) => [
        i.id,
        i.title,
        i.user?.name ?? "-",
        i.category?.name ?? "-",
        formatPrice(i.price_min),
        i.price_max ? formatPrice(i.price_max) : "-",
        i.deleted_at ? "deleted" : i.status,
        i.reports_count ?? 0,
        formatDate(i.created_at),
      ])
    );
  }

  const activeCount = items.filter((i) => i.status === "active" && !i.deleted_at).length;
  const hiddenCount = items.filter((i) => i.status === "hidden").length;
  const reportedCount = items.filter((i) => (i.reports_count ?? 0) > 0).length;

  return (
    <div>
      <AdminPageHeader
        title="Manajemen Jasa Mahasiswa"
        subtitle="Pantau, filter, dan kelola penawaran jasa mahasiswa UPN."
        actions={
          <ToolbarButton variant="light" onClick={handleExport} ariaLabel="Ekspor data jasa ke CSV">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-slate-500">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Ekspor (.csv)
          </ToolbarButton>
        }
      />

      <div className="mb-6 mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard
          label="Total Jasa"
          value={total.toLocaleString("id-ID")}
          icon={<MetricIcon><path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></MetricIcon>}
          iconClass="bg-indigo-500/10 text-indigo-600"
          accentClass="bg-indigo-500"
          trend={{ text: `${activeCount} aktif`, className: "text-emerald-600" }}
          footer="pada filter ini"
        />
        <AdminMetricCard
          label="Tersedia"
          value={activeCount.toLocaleString("id-ID")}
          icon={<MetricIcon><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></MetricIcon>}
          iconClass="bg-emerald-500/10 text-emerald-600"
          accentClass="bg-emerald-500"
          footer="dari data dimuat"
        />
        <AdminMetricCard
          label="Disembunyikan"
          value={hiddenCount.toLocaleString("id-ID")}
          icon={<MetricIcon><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></MetricIcon>}
          iconClass="bg-amber-500/10 text-amber-600"
          accentClass="bg-amber-500"
          footer="dari data dimuat"
        />
        <AdminMetricCard
          label="Dilaporkan"
          value={reportedCount.toLocaleString("id-ID")}
          icon={<MetricIcon><path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></MetricIcon>}
          iconClass="bg-red-500/10 text-red-600"
          accentClass="bg-red-500"
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
            <label htmlFor="services-search" className="sr-only">Cari jasa</label>
            <Input
              id="services-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari judul jasa, penyedia..."
              className="border-transparent bg-slate-100 pl-10 focus:border-slate-300 focus:bg-white"
            />
          </div>
          <FilterTabs ariaLabel="Filter jasa berdasarkan status" options={STATUS_TABS} value={filter} onChange={setFilter} />
        </div>
      </div>

      {actionError && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {actionError}
        </div>
      )}

      <div className="mt-4">
        {isLoading ? (
          <TableLoading label="Memuat data jasa" columns={6} />
        ) : error ? (
          <TableError message={error} onRetry={() => void loadItems(filter, debouncedQuery)} />
        ) : items.length === 0 ? (
          <TableEmpty title="Tidak ada jasa" description="Belum ada jasa pada filter ini." />
        ) : (
          <>
            <p className="mb-2 text-xs text-slate-500" role="status">Menampilkan {items.length} dari {total} jasa</p>
            <div className="admin-table-wrap admin-table overflow-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-3 font-semibold">Jasa & Kategori</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Penyedia Jasa</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Skema Tarif / Biaya</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Waktu Unggah</th>
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
                    return (
                      <tr key={item.id} className="align-top hover:bg-slate-50/60">
                        <td className="max-w-[280px] px-4 py-3">
                          <div className="flex items-start gap-3">
                            <ListingImage
                              module="service"
                              seed={item.id}
                              hint={item.title}
                              images={item.images}
                              alt={`Sampul ${item.title}`}
                              className="h-11 w-11 shrink-0 rounded-lg object-cover"
                            />
                            <div className="min-w-0">
                              <p className="line-clamp-2 text-[13px] font-semibold text-slate-900">{item.title}</p>
                              <p className="mt-0.5 text-xs text-slate-400">
                                {item.category?.name ?? "Tanpa kategori"}
                                {(item.reports_count ?? 0) > 0 && ` • ${item.reports_count} laporan`}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-600">{item.user?.name ?? "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] font-medium text-slate-900">
                          {formatPrice(item.price_min)}{item.price_max ? ` – ${formatPrice(item.price_max)}` : ""}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-600">{formatDate(item.created_at)}</td>
                        <td className="whitespace-nowrap px-4 py-3"><StatusPill tone={pill.tone}>{pill.label}</StatusPill></td>
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
