"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  AdminDrawer,
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

type ReportTarget = {
  id: number;
  title?: string | null;
  name?: string | null;
  status?: string | null;
  user?: { id: number; name: string } | null;
} | null;

type AdminReportItem = {
  id: number;
  reportable_type: string;
  reportable_id: number;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reporter?: { id: number; name: string; email: string } | null;
  reportable?: ReportTarget;
};

type ReportListResponse = {
  message: string;
  data: { current_page: number; last_page: number; total: number; data: AdminReportItem[] };
};

type StatusFilter = "pending" | "reviewing" | "resolved" | "rejected";

const STATUS_TABS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "reviewing", label: "Reviewing" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_PILL: Record<string, { tone: PillTone; label: string }> = {
  pending: { tone: "amber", label: "Pending" },
  reviewing: { tone: "blue", label: "Reviewing" },
  resolved: { tone: "green", label: "Resolved" },
  rejected: { tone: "slate", label: "Rejected" },
  dismissed: { tone: "slate", label: "Dismissed" },
};

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  fraud: "Penipuan",
  inappropriate: "Tidak pantas",
  other: "Lainnya",
};

function targetTypeLabel(reportableType: string): string {
  if (reportableType.includes("MarketplaceListing")) return "Listing";
  if (reportableType.includes("KostListing")) return "Listing";
  if (reportableType.includes("ServiceListing")) return "Listing";
  if (reportableType.includes("LostFoundReport")) return "Listing";
  if (reportableType.includes("Event")) return "Listing";
  if (reportableType.endsWith("\\User") || reportableType === "User") return "User";
  if (reportableType.includes("Chat")) return "Chat";
  const parts = reportableType.split("\\");
  return parts[parts.length - 1] || "Item";
}

function moduleOf(reportableType: string): string {
  if (reportableType.includes("MarketplaceListing")) return "Marketplace";
  if (reportableType.includes("ServiceListing")) return "Jasa";
  if (reportableType.includes("KostListing")) return "Kost";
  if (reportableType.includes("LostFoundReport")) return "Lost & Found";
  if (reportableType.includes("Event")) return "Event";
  if (reportableType.endsWith("\\User") || reportableType === "User") return "Users";
  if (reportableType.includes("Chat")) return "Chat";
  return "Lainnya";
}

function targetTitle(target: ReportTarget): string {
  if (!target) return "Item sudah tidak tersedia";
  return target.title || target.name || `Item #${target.id}`;
}

type ResolveAction = "hide_content" | "delete_content" | "suspend_user" | "ban_user" | "reject";

const RESOLVE_OPTIONS: ReadonlyArray<{ value: ResolveAction; title: string; description: string }> = [
  { value: "hide_content", title: "Hide Content", description: "Konten disembunyikan dari publik." },
  { value: "delete_content", title: "Delete Content", description: "Konten dihapus (soft delete)." },
  { value: "suspend_user", title: "Suspend User", description: "Akun pemilik konten disuspend." },
  { value: "ban_user", title: "Ban User", description: "Akun pemilik konten diban permanen." },
  { value: "reject", title: "Reject Report", description: "Laporan ditolak, tidak ada tindakan." },
];

export default function AdminReportsPage() {
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [items, setItems] = useState<AdminReportItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminReportItem | null>(null);
  const [choice, setChoice] = useState<ResolveAction>("hide_content");

  const loadReports = useCallback(async (status: StatusFilter, signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiFetch<ReportListResponse>(`/v1/admin/reports?status=${status}&page=1`);
      if (signal?.aborted) return;
      setItems(res.data.data);
      setTotal(res.data.total);
    } catch {
      if (signal?.aborted) return;
      setItems([]);
      setError("Gagal memuat data laporan. Periksa koneksi ke backend lalu coba lagi.");
    } finally {
      if (signal?.aborted) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount and filter change
    void loadReports(filter, controller.signal);
    return () => {
      controller.abort();
    };
  }, [filter, loadReports]);

  function refresh() {
    void loadReports(filter);
  }

  function handleExport() {
    exportToCsv(
      "reports.csv",
      ["ID", "Konten", "Modul", "Alasan", "Pelapor", "Tanggal", "Status"],
      items.map((item) => [
        item.id,
        targetTitle(item.reportable ?? null),
        moduleOf(item.reportable_type),
        REASON_LABELS[item.reason] ?? item.reason,
        item.reporter?.name ?? "-",
        formatDate(item.created_at),
        item.status,
      ])
    );
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }

  const withReporter = items.filter((i) => i.reporter).length;
  const missingTarget = items.filter((i) => !i.reportable).length;

  const headerBlock = (
    <>
      <AdminPageHeader
        title="Manajemen Reports / Moderasi"
        subtitle="Tinjau bukti aduan, ambil tindakan terhadap konten atau akun, atau tolak laporan."
        actions={
          <ToolbarButton variant="light" onClick={handleExport} ariaLabel="Ekspor laporan ke CSV">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-slate-500">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Ekspor Laporan (.csv)
          </ToolbarButton>
        }
      />

      <div className="mb-6 mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard
          label="Total Laporan"
          value={total.toLocaleString("id-ID")}
          icon={<MetricIcon><path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></MetricIcon>}
          iconClass="bg-amber-500/10 text-amber-600"
          accentClass="bg-amber-500"
          footer={`status: ${filter}`}
        />
        <AdminMetricCard
          label="Perlu Tindakan"
          value={(filter === "pending" || filter === "reviewing" ? total : 0).toLocaleString("id-ID")}
          icon={<MetricIcon><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></MetricIcon>}
          iconClass="bg-red-500/10 text-red-600"
          accentClass="bg-red-500"
          footer="pending + reviewing"
        />
        <AdminMetricCard
          label="Pelapor Teridentifikasi"
          value={withReporter.toLocaleString("id-ID")}
          icon={<MetricIcon><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></MetricIcon>}
          iconClass="bg-blue-500/10 text-blue-600"
          accentClass="bg-blue-500"
          footer="dari data dimuat"
        />
        <AdminMetricCard
          label="Target Tak Tersedia"
          value={missingTarget.toLocaleString("id-ID")}
          icon={<MetricIcon><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></MetricIcon>}
          iconClass="bg-slate-500/10 text-slate-600"
          accentClass="bg-slate-500"
          footer="konten sudah dihapus"
        />
      </div>

      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <FilterTabs ariaLabel="Filter laporan berdasarkan status" options={STATUS_TABS} value={filter} onChange={setFilter} />
      </div>
    </>
  );

  async function markReviewing(item: AdminReportItem) {
    try {
      setActionId(item.id);
      setActionError(null);
      await apiFetch(`/v1/admin/reports/${item.id}/resolve`, {
        method: "PATCH",
        body: JSON.stringify({ status: "reviewing" }),
      });
      refresh();
    } catch {
      setActionError("Gagal menandai laporan. Coba lagi.");
    } finally {
      setActionId(null);
    }
  }

  async function resolveReport() {
    if (!selected) return;
    const payload =
      choice === "reject"
        ? { status: "rejected" }
        : { status: "resolved", target_action: choice };
    try {
      setActionId(selected.id);
      setActionError(null);
      await apiFetch(`/v1/admin/reports/${selected.id}/resolve`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setSelected(null);
      refresh();
    } catch {
      setActionError("Gagal memproses laporan. Coba lagi.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div>
      {headerBlock}

      {actionError && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {actionError}
        </div>
      )}

      <div className="mt-4">
        {isLoading ? (
          <TableLoading label="Memuat data laporan" columns={5} />
        ) : error ? (
          <TableError message={error} onRetry={refresh} />
        ) : items.length === 0 ? (
          <TableEmpty title="Tidak ada laporan pada tab ini" description="Semua laporan pada status ini sudah ditangani." />
        ) : (
          <>
            <p className="mb-2 text-xs text-slate-500" role="status">Menampilkan {items.length} dari {total} laporan</p>
            <div className="admin-table-wrap admin-table overflow-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
              <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-3 font-semibold">Konten / Entitas Terlapor</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Modul</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Alasan & Catatan Pelapor</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Pelapor</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Tanggal Lapor</th>
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
                        <td className="max-w-[240px] px-4 py-3">
                          <p className="line-clamp-2 text-[13px] font-semibold text-slate-900">{targetTitle(item.reportable ?? null)}</p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {targetTypeLabel(item.reportable_type)} • #{item.reportable_id}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                            {moduleOf(item.reportable_type)}
                          </span>
                        </td>
                        <td className="max-w-[220px] px-4 py-3">
                          <p className="text-[13px] font-medium text-slate-800">{REASON_LABELS[item.reason] ?? item.reason}</p>
                          {item.description && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.description}</p>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-600">{item.reporter?.name ?? "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-600">{formatDate(item.created_at)}</td>
                        <td className="whitespace-nowrap px-4 py-3"><StatusPill tone={pill.tone}>{pill.label}</StatusPill></td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="secondary" disabled={busy} onClick={() => { setSelected(item); setChoice("hide_content"); setActionError(null); }} aria-label={`Detail laporan #${item.id}`}>Detail</Button>
                            {item.status === "pending" && (
                              <Button size="sm" variant="secondary" disabled={busy} onClick={() => void markReviewing(item)} aria-label={`Tinjau laporan #${item.id}`}>Tinjau</Button>
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

      {selected && (
        <AdminDrawer
          title={`Laporan #${selected.id} • ${targetTypeLabel(selected.reportable_type)}`}
          description={`Dilaporkan oleh ${selected.reporter?.name ?? "pelapor"}${selected.reporter?.email ? ` (${selected.reporter.email})` : ""}`}
          onClose={() => setSelected(null)}
          actions={
            <>
              <Button size="sm" variant="secondary" onClick={() => setSelected(null)}>Batal</Button>
              <Button size="sm" disabled={actionId === selected.id} onClick={() => void resolveReport()}>
                {actionId === selected.id ? "Memproses…" : "Konfirmasi tindakan"}
              </Button>
            </>
          }
        >
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">{targetTitle(selected.reportable ?? null)}</p>
            <p className="mt-1 text-xs text-slate-500">Alasan: {REASON_LABELS[selected.reason] ?? selected.reason}</p>
            {selected.description && <p className="mt-1.5 text-[13px] leading-5 text-slate-700">{selected.description}</p>}
          </div>
          <fieldset className="mt-4">
            <legend className="sr-only">Pilih tindakan moderasi</legend>
            <div className="space-y-2" role="radiogroup" aria-label="Pilih tindakan moderasi">
              {RESOLVE_OPTIONS.map((opt) => {
                const active = choice === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setChoice(opt.value)}
                    className={`w-full rounded-lg border px-3.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2342] focus-visible:ring-offset-2 ${
                      active ? "border-[#0A2342] bg-slate-50" : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <span aria-hidden="true" className={`flex h-4 w-4 items-center justify-center rounded-full border ${active ? "border-[#0A2342]" : "border-slate-300"}`}>
                        {active && <span className="h-2 w-2 rounded-full bg-[#0A2342]" />}
                      </span>
                      {opt.title}
                    </span>
                    <span className="mt-0.5 block pl-6 text-xs text-slate-500">{opt.description}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </AdminDrawer>
      )}
    </div>
  );
}
