"use client";

import { useEffect, useState } from "react";
import { ActionIcon } from "@/components/admin/ActionIcons";
import ExportCsvButton from "@/components/admin/ExportCsvButton";
import ModalShell from "@/components/admin/ModalShell";
import Pagination from "@/components/admin/Pagination";
import SelectWrapper from "@/components/admin/SelectWrapper";
import StatusBadge, { type BadgeTone } from "@/components/admin/StatusBadge";
import TableState from "@/components/admin/TableState";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  downloadAdminCsv,
  getAdminReports,
  resolveAdminReport,
  type AdminReportItem,
  type Paginated,
  type ReportStatus,
  type ReportTargetAction,
} from "@/lib/admin-api";
import { extractAdminError, isAbortError } from "@/lib/api";
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
  tone: BadgeTone;
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

  const meta = statusMeta(report.status);

  return (
    <ModalShell
      ariaLabel={`Tindak lanjuti laporan #${report.id}`}
      onClose={onClose}
      busy={busy}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-semibold text-[#141416]">
            Laporan #{report.id} · {moduleLabel(report.reportable_type)}
          </h3>
          <p className="mt-0.5 text-xs text-[#787470]">
            Pelapor: {report.reporter?.name ?? `User #${report.reporter_id}`}
          </p>
        </div>
        <StatusBadge label={meta.label} tone={meta.tone} />
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-[#787470]">Target Terlapor</dt>
          <dd className="font-semibold text-right text-[#141416]">
            {targetDisplay(report)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[#787470]">Kategori Alasan</dt>
          <dd className="font-medium text-[#141416]">
            {REASON_LABELS[report.reason] ?? report.reason}
          </dd>
        </div>
      </dl>

      {report.description && (
        <p className="mt-3 rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] p-3.5 text-sm whitespace-pre-line text-[#57534E]">
          {report.description}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(nextStatus, targetAction);
        }}
        className="mt-5 space-y-4 border-t border-[#F2EEEA] pt-4"
      >
        <div>
          <label
            htmlFor="resolve-status"
            className="mb-1.5 block text-xs font-semibold text-[#57534E]"
          >
            Status Laporan
          </label>
          <SelectWrapper>
            <select
              id="resolve-status"
              value={nextStatus}
              onChange={(e) =>
                setNextStatus(e.target.value as Exclude<ReportStatus, "pending">)
              }
              className="w-full cursor-pointer appearance-none rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] py-2 pr-9 pl-3.5 text-sm text-[#141416] outline-none transition focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
            >
              <option value="resolved">Resolved (Diselesaikan)</option>
              <option value="reviewing">Reviewing (Sedang Ditinjau)</option>
              <option value="rejected">Rejected (Laporan Ditolak)</option>
              <option value="dismissed">Dismissed (Diabaikan)</option>
            </select>
          </SelectWrapper>
        </div>

        <div>
          <label
            htmlFor="resolve-action"
            className="mb-1.5 block text-xs font-semibold text-[#57534E]"
          >
            Tindakan Moderasi pada Target
          </label>
          <SelectWrapper>
            <select
              id="resolve-action"
              value={targetAction}
              onChange={(e) =>
                setTargetAction(e.target.value as ReportTargetAction)
              }
              className="w-full cursor-pointer appearance-none rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] py-2 pr-9 pl-3.5 text-sm text-[#141416] outline-none transition focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
            >
              <option value="none">Tanpa tindakan tambahan pada target</option>
              <option value="hide_content">Nonaktifkan / Sembunyikan Konten</option>
              <option value="delete_content">Hapus Konten (Soft Delete)</option>
              <option value="suspend_user">Suspend Akun Pemilik</option>
              <option value="ban_user">Ban Akun Pemilik</option>
            </select>
          </SelectWrapper>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full border border-[#DFD9D2] bg-white px-4 py-2 text-xs font-semibold text-[#141416] transition hover:border-[#CFC8BF] hover:bg-[#FAF8F6] disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-[#141416] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#242428] disabled:opacity-60"
          >
            {busy ? "Memproses…" : "Simpan Keputusan"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default function ReportsAdminPage() {
  const [result, setResult] = useState<Paginated<AdminReportItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 400, () => setPage(1));
  const [retryKey, setRetryKey] = useState(0);
  const [selected, setSelected] = useState<AdminReportItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getAdminReports(
      {
        page,
        status: status || undefined,
        search: debouncedSearch || undefined,
      },
      { signal: controller.signal },
    ).then(
      (data) => {
        if (controller.signal.aborted) return;
        if (data.data.length === 0 && data.current_page > 1) {
          setPage(data.current_page - 1);
          return;
        }
        setError(null);
        setResult(data);
      },
      (err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setError(LOAD_ERROR);
      },
    );
    return () => {
      controller.abort();
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
        setError(null);
        setResult(data);
      }
    } catch (err) {
      setActionError(extractAdminError(err, "Gagal memproses laporan. Coba lagi."));
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
    } catch (err) {
      setActionError(extractAdminError(err, "Gagal mengekspor CSV. Coba lagi."));
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-[#787470]">
            Komunitas
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-[#141416] sm:text-3xl">
            Reports &amp; Moderasi
          </h2>
          <p className="mt-1 text-sm text-[#6E6A66]">
            Tinjau laporan pelanggaran dari mahasiswa dan terapkan tindakan moderasi pada konten atau akun.
          </p>
        </div>
        <ExportCsvButton
          exporting={exporting}
          onClick={handleExport}
          className="self-start sm:self-auto"
        />
      </section>

      {actionError && (
        <p
          role="alert"
          className="rounded-xl border border-[#F3C6C6] bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#A62D2D]"
        >
          {actionError}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border border-[#E5E0DA] bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-96">
          <ActionIcon
            name="search"
            className="absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-[#787470]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari alasan, deskripsi, atau nama pelapor…"
            aria-label="Cari laporan"
            className="w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] py-2 pr-4 pl-10 text-sm text-[#141416] outline-none transition placeholder:text-[#8C8782] focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
          />
        </div>
        <div className="flex items-center gap-2.5">
          <label htmlFor="report-status-filter" className="text-xs font-semibold text-[#57534E]">
            Status
          </label>
          <SelectWrapper>
            <select
              id="report-status-filter"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="cursor-pointer appearance-none rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] py-2 pr-8 pl-3.5 text-sm text-[#141416] outline-none transition focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
            >
              <option value="">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="reviewing">Ditinjau</option>
              <option value="resolved">Selesai</option>
              <option value="rejected">Ditolak</option>
              <option value="dismissed">Diabaikan</option>
            </select>
          </SelectWrapper>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#E5E0DA] bg-white">
        <TableState
          error={error}
          onRetry={() => {
            setError(null);
            setRetryKey((k) => k + 1);
          }}
          loading={!result}
          loadingLabel="Memuat laporan"
          empty={Boolean(result && result.data.length === 0)}
          emptyTitle="Tidak ada laporan moderasi"
          emptyMessage="Belum ada laporan yang sesuai dengan filter saat ini."
        >
          {result && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#F2EEEA] bg-[#FAF8F6] text-xs font-semibold tracking-wider text-[#6E6A66] uppercase">
                      <th className="px-4 py-3.5 font-medium">Objek Terlapor</th>
                      <th className="px-4 py-3.5 font-medium">Alasan</th>
                      <th className="px-4 py-3.5 font-medium">Pelapor</th>
                      <th className="px-4 py-3.5 font-medium">Waktu</th>
                      <th className="px-4 py-3.5 font-medium">Status</th>
                      <th className="px-4 py-3.5 text-right font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2EEEA] text-sm">
                    {result.data.map((item) => {
                      const meta = statusMeta(item.status);
                      return (
                        <tr key={item.id} className="transition hover:bg-[#FAF8F6]">
                          <td className="px-4 py-4">
                            <p className="max-w-60 truncate font-semibold text-[#141416]">
                              {targetDisplay(item)}
                            </p>
                            <span className="mt-0.5 inline-block rounded-full bg-[#EFECE8] px-2 py-0.5 text-[10px] font-medium tracking-wide text-[#57534E] uppercase">
                              {moduleLabel(item.reportable_type)} · #{item.reportable_id}
                            </span>
                          </td>
                          <td className="max-w-60 px-4 py-4">
                            <p className="font-medium text-[#141416]">
                              {REASON_LABELS[item.reason] ?? item.reason}
                            </p>
                            {item.description && (
                              <p className="mt-0.5 truncate text-xs text-[#787470]">
                                {item.description}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-4 font-medium whitespace-nowrap text-[#57534E]">
                            {item.reporter?.name ?? `User #${item.reporter_id}`}
                          </td>
                          <td className="px-4 py-4 text-xs whitespace-nowrap text-[#787470]">
                            {timeAgo(item.created_at)}
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge label={meta.label} tone={meta.tone} />
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelected(item)}
                              className="rounded-full bg-[#141416] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#242428]"
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
        </TableState>
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
