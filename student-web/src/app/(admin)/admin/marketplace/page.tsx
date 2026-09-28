"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AdminDrawer,
  AdminMetricCard,
  AdminPageHeader,
  FilterTabs,
  MetricIcon,
  Pagination,
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

type ListingItem = {
  id: number;
  title: string;
  description?: string | null;
  price: string | number;
  status: string;
  created_at: string;
  deleted_at?: string | null;
  reports_count?: number;
  user?: { id: number; name: string } | null;
  category?: { id: number; name: string; slug: string } | null;
  images?: ApiImage[] | null;
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
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);

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
      setLastPage(res.data.last_page);
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

  function handleExport() {
    exportToCsv(
      "marketplace.csv",
      ["ID", "Judul", "Penjual", "Kategori", "Harga", "Status", "Laporan", "Dibuat"],
      items.map((i) => [
        i.id,
        i.title,
        i.user?.name ?? "-",
        i.category?.name ?? "-",
        formatPrice(i.price),
        i.deleted_at ? "deleted" : i.status,
        i.reports_count ?? 0,
        formatDate(i.created_at),
      ])
    );
  }

  const preview = previewId !== null ? (items.find((i) => i.id === previewId) ?? null) : null;
  const activeCount = items.filter((i) => i.status === "active" && !i.deleted_at).length;
  const reportedCount = items.filter((i) => (i.reports_count ?? 0) > 0).length;
  const soldCount = items.filter((i) => i.status === "sold").length;

  return (
    <div>
      <AdminPageHeader
        title="Manajemen Marketplace"
        subtitle="Pantau, filter, dan kelola listing barang/produk jual-beli mahasiswa UPN."
        eyebrow="Katalog Mahasiswa"
        refCode="REF: MKT-UPNJT-2026"
        actions={
          <ToolbarButton variant="light" onClick={handleExport} ariaLabel="Ekspor data marketplace ke CSV">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-slate-500">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Ekspor (.csv)
          </ToolbarButton>
        }
      />

      <div className="mb-6 mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard
          label="Total Listing"
          value={total.toLocaleString("id-ID")}
          icon={<MetricIcon><path d="M4 7l8-4 8 4v10l-8 4-8-4V7z" /><path d="M4 7l8 4 8-4M12 11v9" /></MetricIcon>}
          iconClass="bg-teal-500/10 text-teal-700"
          accentClass="bg-teal-500"
          trend={{ text: `${activeCount} aktif`, className: "text-emerald-600" }}
          footer="pada filter ini"
        />
        <AdminMetricCard
          label="Aktif Tayang"
          value={activeCount.toLocaleString("id-ID")}
          icon={<MetricIcon><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></MetricIcon>}
          iconClass="bg-amber-500/10 text-amber-600"
          accentClass="bg-amber-500"
          footer={`halaman ${page} dari ${lastPage}`}
        />
        <AdminMetricCard
          label="Dilaporkan"
          value={reportedCount.toLocaleString("id-ID")}
          icon={<MetricIcon><path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></MetricIcon>}
          iconClass="bg-red-500/10 text-red-600"
          accentClass="bg-red-500"
          footer="dari data dimuat"
        />
        <AdminMetricCard
          label="Terjual"
          value={soldCount.toLocaleString("id-ID")}
          icon={<MetricIcon><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></MetricIcon>}
          iconClass="bg-slate-900/10 text-slate-900"
          accentClass="bg-slate-900"
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
            <label htmlFor="marketplace-search" className="sr-only">Cari listing</label>
            <Input
              id="marketplace-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama produk, nama mahasiswa, NIM..."
              className="border-transparent bg-slate-100 pl-10 focus:border-slate-300 focus:bg-white"
            />
          </div>
          <FilterTabs ariaLabel="Filter marketplace berdasarkan status" options={STATUS_TABS} value={filter} onChange={setFilter} />
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
            <div className="admin-table-wrap admin-table overflow-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-3 font-semibold">Produk & Kategori</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Penjual</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Harga</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Unggah</th>
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
                              module="marketplace"
                              seed={item.id}
                              hint={`${item.category?.name ?? ""} ${item.title}`}
                              images={item.images}
                              alt={`Foto ${item.title}`}
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
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] font-medium text-slate-900">{formatPrice(item.price)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-600">{formatDate(item.created_at)}</td>
                        <td className="whitespace-nowrap px-4 py-3"><StatusPill tone={pill.tone}>{pill.label}</StatusPill></td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="secondary" disabled={busy} onClick={() => setPreviewId(item.id)} aria-label={`Pratinjau ${item.title}`}>Preview</Button>
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
            <Pagination
              page={page}
              lastPage={lastPage}
              total={total}
              unit="listing"
              onChange={(p) => void loadItems(filter, debouncedQuery, p)}
            />
          </>
        )}
      </div>

      {preview && (
        <AdminDrawer
          title={preview.title}
          description={`Dijual oleh ${preview.user?.name ?? "-"} • ${preview.category?.name ?? "Tanpa kategori"}`}
          onClose={() => setPreviewId(null)}
          actions={
            <>
              {!preview.deleted_at && preview.status !== "hidden" && (
                <Button size="sm" variant="secondary" disabled={actionId === preview.id} onClick={() => void runAction(preview.id, "hide")}>Hide</Button>
              )}
              {!preview.deleted_at && (
                <Button size="sm" variant="secondary" disabled={actionId === preview.id} onClick={() => void runAction(preview.id, "delete")}>Delete</Button>
              )}
              {(Boolean(preview.deleted_at) || preview.status === "hidden") && (
                <Button size="sm" disabled={actionId === preview.id} onClick={() => void runAction(preview.id, "restore")}>Restore</Button>
              )}
            </>
          }
        >
          <ListingImage
            module="marketplace"
            seed={preview.id}
            hint={`${preview.category?.name ?? ""} ${preview.title}`}
            images={preview.images}
            alt={`Foto ${preview.title}`}
            eager
            className="aspect-[4/3] w-full rounded-xl object-cover"
          />
          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-lg font-bold text-slate-900">{formatPrice(preview.price)}</p>
            <StatusPill tone={(STATUS_PILL[preview.status] ?? { tone: "slate" }).tone as PillTone}>
              {(STATUS_PILL[preview.status] ?? { label: preview.status }).label}
            </StatusPill>
          </div>
          <p className="mt-2 text-[13px] leading-6 text-slate-600">
            {preview.description ?? "Tidak ada deskripsi."}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Dilaporkan {preview.reports_count ?? 0} kali • Dibuat {formatDate(preview.created_at)}
          </p>
        </AdminDrawer>
      )}
    </div>
  );
}
