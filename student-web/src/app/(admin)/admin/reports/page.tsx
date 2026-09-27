"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  FilterTabs,
  Modal,
  StatusPill,
  TableEmpty,
  TableError,
  TableLoading,
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
  data: {
    current_page: number;
    last_page: number;
    total: number;
    data: AdminReportItem[];
  };
};

type StatusFilter = "pending" | "resolved" | "dismissed";

const STATUS_TABS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "pending", label: "Menunggu" },
  { value: "resolved", label: "Selesai" },
  { value: "dismissed", label: "Diabaikan" },
];

const STATUS_PILL: Record<string, { tone: PillTone; label: string }> = {
  pending: { tone: "amber", label: "Menunggu" },
  resolved: { tone: "green", label: "Selesai" },
  dismissed: { tone: "slate", label: "Diabaikan" },
};

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  fraud: "Penipuan",
  inappropriate: "Tidak pantas",
  other: "Lainnya",
};

function targetTypeLabel(reportableType: string): string {
  if (reportableType.includes("MarketplaceListing")) return "Marketplace";
  if (reportableType.includes("KostListing")) return "Kost";
  if (reportableType.includes("ServiceListing")) return "Jasa";
  if (reportableType.includes("LostFoundReport")) return "Lost & Found";
  if (reportableType.includes("Event")) return "Event";
  if (reportableType.endsWith("\\User") || reportableType === "User") return "Pengguna";
  const parts = reportableType.split("\\");
  return parts[parts.length - 1] || "Item";
}

function targetTitle(target: ReportTarget): string {
  if (!target) return "Item sudah tidak tersedia";
  return target.title || target.name || `Item #${target.id}`;
}

type ResolveChoice = "dismiss" | "delete" | "suspend_user";

const RESOLVE_OPTIONS: ReadonlyArray<{ value: ResolveChoice; title: string; description: string }> = [
  {
    value: "dismiss",
    title: "Abaikan laporan",
    description: "Laporan ditandai diabaikan, konten tidak diubah.",
  },
  {
    value: "delete",
    title: "Tindak & hapus listing",
    description: "Laporan selesai, konten yang dilaporkan dihapus.",
  },
  {
    value: "suspend_user",
    title: "Tindak & suspend user",
    description: "Laporan selesai, akun pemilik konten disuspend.",
  },
];

export default function AdminReportsPage() {
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [items, setItems] = useState<AdminReportItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [resolveTarget, setResolveTarget] = useState<AdminReportItem | null>(null);
  const [resolveChoice, setResolveChoice] = useState<ResolveChoice>("dismiss");

  const loadReports = useCallback(async (status: StatusFilter, pageNum: number, signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiFetch<ReportListResponse>(
        `/v1/admin/reports?status=${status}&page=${pageNum}`
      );
      if (signal?.aborted) return;
      setItems(res.data.data);
      setPage(res.data.current_page);
      setLastPage(res.data.last_page);
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
    void loadReports(filter, 1, controller.signal);
    return () => {
      controller.abort();
    };
  }, [filter, loadReports]);

  function refresh() {
    void loadReports(filter, page);
  }

  async function resolveReport() {
    if (!resolveTarget) return;
    const payload =
      resolveChoice === "dismiss"
        ? { status: "dismissed" }
        : { status: "resolved", target_action: resolveChoice === "delete" ? "delete" : "suspend_user" };
    try {
      setActionId(resolveTarget.id);
      setActionError(null);
      await apiFetch(`/v1/admin/reports/${resolveTarget.id}/resolve`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setResolveTarget(null);
      refresh();
    } catch {
      setActionError("Gagal memproses laporan. Coba lagi.");
    } finally {
      setActionId(null);
    }
  }

  function goToPage(pageNum: number) {
    if (pageNum < 1 || pageNum > lastPage || pageNum === page) return;
    void loadReports(filter, pageNum);
  }

  return (
    <div>
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900 sm:text-[26px]">Moderasi Laporan</h1>
        <p className="mt-1 max-w-[560px] text-sm text-slate-500">
          Tinjau aduan mahasiswa terhadap listing atau pengguna, lalu abaikan atau tindak lanjuti.
        </p>
      </div>

      <div className="mt-4">
        <FilterTabs
          ariaLabel="Filter laporan berdasarkan status"
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
          <TableLoading label="Memuat data laporan" columns={5} />
        ) : error ? (
          <TableError message={error} onRetry={refresh} />
        ) : items.length === 0 ? (
          <TableEmpty
            title="Tidak ada laporan pada tab ini"
            description="Semua laporan pada status ini sudah ditangani."
          />
        ) : (
          <>
            <p className="mb-2 text-xs text-slate-500" role="status">
              Menampilkan {items.length} dari {total} laporan
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-3 font-semibold">Pelapor</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Item Dilaporkan</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Alasan Aduan</th>
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
                          <p className="text-[13px] font-semibold text-slate-900">
                            {item.reporter?.name ?? `User #${item.id}`}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">{item.reporter?.email ?? "-"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[13px] font-semibold text-slate-900">
                            <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                              {targetTypeLabel(item.reportable_type)}
                            </span>
                            <span className="line-clamp-2">{targetTitle(item.reportable ?? null)}</span>
                          </p>
                        </td>
                        <td className="max-w-[260px] px-4 py-3">
                          <p className="text-[13px] font-medium text-slate-900">
                            {REASON_LABELS[item.reason] ?? item.reason}
                          </p>
                          {item.description && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.description}</p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => {
                              setResolveTarget(item);
                              setResolveChoice("dismiss");
                              setActionError(null);
                            }}
                            aria-label={`Proses laporan #${item.id}`}
                          >
                            {busy ? "…" : "Proses"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {lastPage > 1 && (
              <nav aria-label="Navigasi halaman laporan" className="mt-4 flex items-center justify-center gap-2">
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

      {resolveTarget && (
        <Modal
          title={`Proses laporan #${resolveTarget.id}`}
          description={`Dilaporkan oleh ${resolveTarget.reporter?.name ?? "pelapor"} • ${targetTypeLabel(resolveTarget.reportable_type)}: ${targetTitle(resolveTarget.reportable ?? null)}`}
          onClose={() => setResolveTarget(null)}
        >
          <fieldset>
            <legend className="sr-only">Pilih tindakan moderasi</legend>
            <div className="space-y-2" role="radiogroup" aria-label="Pilih tindakan moderasi">
              {RESOLVE_OPTIONS.map((opt) => {
                const selected = resolveChoice === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setResolveChoice(opt.value)}
                    className={`w-full rounded-lg border px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2342] focus-visible:ring-offset-2 ${
                      selected ? "border-[#0A2342] bg-slate-50" : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <span
                        aria-hidden="true"
                        className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                          selected ? "border-[#0A2342]" : "border-slate-300"
                        }`}
                      >
                        {selected && <span className="h-2 w-2 rounded-full bg-[#0A2342]" />}
                      </span>
                      {opt.title}
                    </span>
                    <span className="mt-1 block pl-6 text-xs text-slate-500">{opt.description}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setResolveTarget(null)}>
              Batal
            </Button>
            <Button disabled={actionId === resolveTarget.id} onClick={() => void resolveReport()}>
              {actionId === resolveTarget.id ? "Memproses…" : "Konfirmasi tindakan"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
