"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/admin/EmptyState";
import Pagination from "@/components/admin/Pagination";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  downloadAdminCsv,
  getAdminReports,
  resolveAdminReport,
  type AdminReportItem,
  type Paginated,
  type ReportStatus,
  type ReportTargetAction,
} from "@/lib/admin-api";
import { shortReportableType, timeAgo } from "@/lib/format";

const LOAD_ERROR =
  "Gagal memuat daftar laporan pelanggaran. Pastikan backend berjalan lalu coba lagi.";

const REASON_LABELS: Record<string, string> = {
  spam: "Spam / Promosi",
  fraud: "Penipuan / Palsu",
  inappropriate: "Konten Tidak Pantas",
  other: "Lainnya",
};

function statusMeta(status: string): {
  label: string;
  tone: "green" | "amber" | "blue" | "slate" | "rose";
} {
  switch (status) {
    case "pending":
      return { label: "Pending", tone: "amber" };
    case "reviewing":
      return { label: "Ditinjau", tone: "blue" };
    case "resolved":
      return { label: "Selesai", tone: "green" };
    case "rejected":
      return { label: "Ditolak", tone: "rose" };
    case "dismissed":
      return { label: "Diabaikan", tone: "slate" };
    default:
      return { label: status, tone: "slate" };
  }
}

function moduleLabel(reportableType: string): string {
  if (reportableType.includes("MarketplaceListing")) return "Marketplace";
  if (reportableType.includes("ServiceListing")) return "Jasa Mahasiswa";
  if (reportableType.includes("LostFoundReport")) return "Lost & Found";
  if (reportableType.includes("Event")) return "Event";
  if (reportableType.endsWith("\\User") || reportableType === "User") return "User";
  return shortReportableType(reportableType);
}

function targetDisplay(report: AdminReportItem): string {
  const target = report.reportable;
  if (!target) return `${moduleLabel(report.reportable_type)} #${report.reportable_id}`;
  return target.title || target.name || `#${report.reportable_id}`;
}

function ResolveDialog({
  report,
  busy,
  onSubmit,
  onClose,
}: {
  report: AdminReportItem;
  busy: boolean;
  onSubmit: (
    nextStatus: Exclude<ReportStatus, "pending">,
    targetAction: ReportTargetAction,
  ) => void;
  onClose: () => void;
}) {
  const [nextStatus, setNextStatus] =
    useState<Exclude<ReportStatus, "pending">>("resolved");
  const [targetAction, setTargetAction] = useState<ReportTargetAction>("none");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const meta = statusMeta(report.status);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Tindak lanjuti laporan #${report.id}`}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Laporan #{report.id} · {moduleLabel(report.reportable_type)}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Pelapor: {report.reporter?.name ?? `User #${report.reporter_id}`}
            </p>
          </div>
          <StatusBadge label={meta.label} tone={meta.tone} />
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Target Terlapor</dt>
            <dd className="font-semibold text-right text-slate-900">
              {targetDisplay(report)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Kategori Alasan</dt>
            <dd className="font-medium text-slate-800">
              {REASON_LABELS[report.reason] ?? report.reason}
            </dd>
          </div>
        </dl>

        {report.description && (
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-line text-slate-600">
            {report.description}
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(nextStatus, targetAction);
          }}
          className="mt-5 space-y-4 border-t border-slate-100 pt-4"
        >
          <div>
            <label
              htmlFor="resolve-status"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              Status Laporan
            </label>
            <select
              id="resolve-status"
              value={nextStatus}
              onChange={(e) =>
                setNextStatus(e.target.value as Exclude<ReportStatus, "pending">)
              }
              className="w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            >
              <option value="resolved">Resolved (Diselesaikan)</option>
              <option value="reviewing">Reviewing (Sedang Ditinjau)</option>
              <option value="rejected">Rejected (Laporan Ditolak)</option>
              <option value="dismissed">Dismissed (Diabaikan)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="resolve-action"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              Tindakan Moderasi pada Target
            </label>
            <select
              id="resolve-action"
              value={targetAction}
              onChange={(e) =>
                setTargetAction(e.target.value as ReportTargetAction)
              }
              className="w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            >
              <option value="none">Tanpa tindakan tambahan pada target</option>
              <option value="hide_content">Nonaktifkan / Sembunyikan Konten</option>
              <option value="delete_content">Hapus Konten (Soft Delete)</option>
              <option value="suspend_user">Suspend Akun Pemilik</option>
              <option value="ban_user">Ban Akun Pemilik</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {busy ? "Memproses…" : "Simpan Keputusan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ReportsAdminPage() {
  const [result, setResult] = useState<Paginated<AdminReportItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [selected, setSelected] = useState<AdminReportItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    getAdminReports({
      page,
      status: status || undefined,
      search: debouncedSearch || undefined,
    }).then(
      (data) => {
        if (cancelled) return;
        if (data.data.length === 0 && data.current_page > 1) {
          setPage(data.current_page - 1);
          return;
        }
        setResult(data);
      },
      () => {
        if (cancelled) return;
        setError(LOAD_ERROR);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [page, status, debouncedSearch, retryKey]);

  async function handleResolve(
    nextStatus: Exclude<ReportStatus, "pending">,
    targetAction: ReportTargetAction,
  ) {
    if (!selected) return;
    setBusy(true);
    setActionError(null);
    try {
      await resolveAdminReport(selected.id, {
        status: nextStatus,
        target_action: targetAction,
      });
      setSelected(null);
      const data = await getAdminReports({
        page,
        status: status || undefined,
        search: debouncedSearch || undefined,
      });
      if (data.data.length === 0 && data.current_page > 1) {
        setPage(data.current_page - 1);
      } else {
        setResult(data);
      }
    } catch {
      setActionError("Gagal memproses laporan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setActionError(null);
    try {
      await downloadAdminCsv(
        "/admin/reports/export",
        {
          status: status || undefined,
          search: debouncedSearch || undefined,
        },
        "reports-moderasi.csv",
      );
    } catch {
      setActionError("Gagal mengekspor CSV. Coba lagi.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            Komunitas
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Reports &amp; Moderasi
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Tinjau laporan pelanggaran dari mahasiswa dan terapkan tindakan moderasi pada konten atau akun.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-60 sm:self-auto"
        >
          <svg
            className="h-4 w-4 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          {exporting ? "Mengekspor…" : "Ekspor CSV"}
        </button>
      </section>

      {actionError && (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
        >
          {actionError}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-96">
          <svg
            className="absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari alasan, deskripsi, atau nama pelapor…"
            aria-label="Cari laporan"
            className="w-full rounded-lg bg-slate-100 py-2 pr-4 pl-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="flex items-center gap-2.5">
          <label htmlFor="report-status-filter" className="text-xs font-semibold text-slate-500">
            Status
          </label>
          <select
            id="report-status-filter"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="cursor-pointer appearance-none rounded-lg bg-slate-100 py-2 pr-8 pl-3.5 text-sm text-slate-800 outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="reviewing">Ditinjau</option>
            <option value="resolved">Selesai</option>
            <option value="rejected">Ditolak</option>
            <option value="dismissed">Diabaikan</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm">
        {error ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12">
            <p role="alert" className="text-sm font-medium text-rose-700">
              {error}
            </p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setRetryKey((k) => k + 1);
              }}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Coba lagi
            </button>
          </div>
        ) : !result ? (
          <div className="space-y-3 p-4" aria-label="Memuat laporan">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        ) : result.data.length === 0 ? (
          <EmptyState
            title="Tidak ada laporan moderasi"
            message="Belum ada laporan yang sesuai dengan filter saat ini."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    <th className="px-4 py-3.5 font-medium">Objek Terlapor</th>
                    <th className="px-4 py-3.5 font-medium">Alasan</th>
                    <th className="px-4 py-3.5 font-medium">Pelapor</th>
                    <th className="px-4 py-3.5 font-medium">Waktu</th>
                    <th className="px-4 py-3.5 font-medium">Status</th>
                    <th className="px-4 py-3.5 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {result.data.map((item) => {
                    const meta = statusMeta(item.status);
                    return (
                      <tr key={item.id} className="transition hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <p className="max-w-60 truncate font-semibold text-slate-900">
                            {targetDisplay(item)}
                          </p>
                          <span className="mt-0.5 inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-500 uppercase">
                            {moduleLabel(item.reportable_type)} · #{item.reportable_id}
                          </span>
                        </td>
                        <td className="max-w-60 px-4 py-4">
                          <p className="font-medium text-slate-800">
                            {REASON_LABELS[item.reason] ?? item.reason}
                          </p>
                          {item.description && (
                            <p className="mt-0.5 truncate text-xs text-slate-400">
                              {item.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4 font-medium whitespace-nowrap text-slate-700">
                          {item.reporter?.name ?? `User #${item.reporter_id}`}
                        </td>
                        <td className="px-4 py-4 text-xs whitespace-nowrap text-slate-400">
                          {timeAgo(item.created_at)}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge label={meta.label} tone={meta.tone} />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelected(item)}
                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                          >
                            Proses
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={result.current_page}
              lastPage={result.last_page}
              total={result.total}
              onPage={setPage}
            />
          </>
        )}
      </section>

      {selected && (
        <ResolveDialog
          report={selected}
          busy={busy}
          onSubmit={handleResolve}
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        />
      )}
    </main>
  );
}
