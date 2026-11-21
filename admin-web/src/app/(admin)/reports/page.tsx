"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ActionIcon } from "@/components/admin/ActionIcons";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import Pagination from "@/components/admin/Pagination";
import SelectWrapper from "@/components/admin/SelectWrapper";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  bulkResolveAdminReports,
  downloadAdminCsv,
  getAdminReports,
  resolveAdminReport,
  type AdminReportItem,
  type Paginated,
  type ReportStatus,
  type ReportTargetAction,
} from "@/lib/admin-api";
import { extractAdminError, isAbortError } from "@/lib/api";
import { formatDateTime, formatNumber, shortReportableType, timeAgo } from "@/lib/format";

const LOAD_ERROR =
  "Gagal memuat daftar laporan pelanggaran. Pastikan backend berjalan lalu coba lagi.";

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "", label: "Semua" },
  { value: "pending", label: "Pending" },
  { value: "reviewing", label: "Ditinjau" },
  { value: "resolved", label: "Selesai" },
  { value: "rejected", label: "Ditolak" },
  { value: "dismissed", label: "Diabaikan" },
];

const REASON_LABELS: Record<string, string> = {
  spam: "Spam / Promosi",
  fraud: "Penipuan / Palsu",
  inappropriate: "Konten Tidak Pantas",
  other: "Lainnya",
};

const INTENT_OPTIONS: Array<{
  value: Exclude<ReportStatus, "pending">;
  label: string;
  hint: string;
}> = [
  {
    value: "resolved",
    label: "Tindak & Selesaikan",
    hint: "Laporan valid dan dapat disertai sanksi pada target.",
  },
  {
    value: "reviewing",
    label: "Tandai Ditinjau",
    hint: "Kasus masih dalam investigasi admin tanpa sanksi.",
  },
  {
    value: "rejected",
    label: "Tolak Laporan",
    hint: "Laporan tidak terbukti melanggar aturan platform.",
  },
  {
    value: "dismissed",
    label: "Abaikan",
    hint: "Arsipkan laporan duplikat atau tidak relevan.",
  },
];

const DESTRUCTIVE_ACTIONS = new Set<ReportTargetAction>([
  "delete_content",
  "suspend_user",
  "ban_user",
]);

const BULK_COPY: Record<
  Exclude<ReportStatus, "pending">,
  { title: string; message: string; confirm: string; danger: boolean }
> = {
  reviewing: {
    title: "Tandai laporan sedang ditinjau?",
    message:
      "Status laporan terpilih akan diubah menjadi Ditinjau tanpa tindakan tambahan pada target.",
    confirm: "Tandai Ditinjau",
    danger: false,
  },
  resolved: {
    title: "Selesaikan laporan terpilih?",
    message:
      "Status laporan terpilih akan diubah menjadi Selesai tanpa tindakan tambahan pada target.",
    confirm: "Selesaikan",
    danger: false,
  },
  rejected: {
    title: "Tolak laporan terpilih?",
    message:
      "Laporan terpilih ditandai Ditolak dan tidak mengubah status objek terlapor.",
    confirm: "Tolak Laporan",
    danger: false,
  },
  dismissed: {
    title: "Abaikan laporan terpilih?",
    message: "Laporan terpilih akan diabaikan dan keluar dari antrean aktif.",
    confirm: "Abaikan",
    danger: false,
  },
};

const TARGET_ACTION_COPY: Record<
  Exclude<ReportTargetAction, "none">,
  { title: string; warning: string; confirm: string }
> = {
  hide_content: {
    title: "Sembunyikan konten terlapor?",
    warning: "Konten akan disembunyikan dari portal mahasiswa.",
    confirm: "Terapkan & Selesaikan",
  },
  delete_content: {
    title: "Hapus konten & selesaikan laporan?",
    warning:
      "Konten terlapor akan dihapus sementara (soft delete) dan langsung hilang dari portal mahasiswa.",
    confirm: "Hapus Konten",
  },
  suspend_user: {
    title: "Suspend akun & selesaikan laporan?",
    warning:
      "Akun pemilik target akan ditangguhkan sementara dan seluruh sesi aktifnya dicabut.",
    confirm: "Suspend Akun",
  },
  ban_user: {
    title: "Ban permanen akun & selesaikan laporan?",
    warning:
      "Akun pemilik target akan diblokir dari platform dan seluruh token aksesnya dicabut.",
    confirm: "Ban Akun",
  },
};

function parsePositiveInt(raw: string | null, fallback = 1): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function statusPresentation(status: string): {
  label: string;
  chipClass: string;
} {
  switch (status) {
    case "pending":
      return {
        label: "Pending",
        chipClass: "bg-hub-warning-bg text-hub-warning-ink",
      };
    case "reviewing":
      return {
        label: "Ditinjau",
        chipClass: "bg-hub-accent-soft text-hub-accent-ink",
      };
    case "resolved":
      return {
        label: "Selesai",
        chipClass: "bg-hub-success-bg text-hub-success-ink",
      };
    case "rejected":
      return {
        label: "Ditolak",
        chipClass: "bg-hub-danger-bg text-hub-danger-ink",
      };
    case "dismissed":
      return {
        label: "Diabaikan",
        chipClass: "bg-hub-sidebar text-hub-ink-muted",
      };
    default:
      return {
        label: status || "Tercatat",
        chipClass: "bg-hub-sidebar text-hub-ink-muted",
      };
  }
}

function moduleLabel(reportableType: string): string {
  if (reportableType.includes("MarketplaceListing")) return "Marketplace";
  if (reportableType.includes("ServiceListing")) return "Jasa Mahasiswa";
  if (reportableType.includes("LostFoundReport")) return "Lost & Found";
  if (reportableType.includes("Event")) return "Event";
  if (reportableType.endsWith("\\User") || reportableType === "User") {
    return "Akun Pengguna";
  }
  return shortReportableType(reportableType);
}

function isUserTarget(reportableType: string): boolean {
  return reportableType.endsWith("\\User") || reportableType === "User";
}

function targetDisplay(report: AdminReportItem): string {
  const target = report.reportable;
  if (!target) {
    return `${moduleLabel(report.reportable_type)} #${report.reportable_id}`;
  }
  return target.title || target.name || `#${report.reportable_id}`;
}

function defaultIntentForReport(
  status: string,
): Exclude<ReportStatus, "pending"> {
  if (
    status === "reviewing" ||
    status === "resolved" ||
    status === "rejected" ||
    status === "dismissed"
  ) {
    return status === "reviewing" ? "resolved" : status;
  }
  return "resolved";
}

type ConfirmState =
  | {
      scope: "single";
      report: AdminReportItem;
      nextStatus: Exclude<ReportStatus, "pending">;
      targetAction: ReportTargetAction;
    }
  | {
      scope: "bulk";
      ids: number[];
      nextStatus: Exclude<ReportStatus, "pending">;
    };

function ReportDecisionPanel({
  report,
  busy,
  onSubmitDecision,
  onCloseDrawer,
}: {
  report: AdminReportItem;
  busy: boolean;
  onSubmitDecision: (
    report: AdminReportItem,
    nextStatus: Exclude<ReportStatus, "pending">,
    targetAction: ReportTargetAction,
  ) => void;
  onCloseDrawer?: () => void;
}) {
  const [nextStatus, setNextStatus] = useState<Exclude<ReportStatus, "pending">>(
    () => defaultIntentForReport(report.status),
  );
  const [targetAction, setTargetAction] = useState<ReportTargetAction>("none");

  const meta = statusPresentation(report.status);
  const userTarget = isUserTarget(report.reportable_type);
  const effectiveAction: ReportTargetAction =
    nextStatus === "resolved" ? targetAction : "none";
  const isDestructive = DESTRUCTIVE_ACTIONS.has(effectiveAction);

  const actionOptions = userTarget
    ? [
        { value: "none" as const, label: "Tanpa tindakan tambahan" },
        {
          value: "suspend_user" as const,
          label: "Suspend akun pengguna ini",
        },
        { value: "ban_user" as const, label: "Ban akun pengguna ini" },
      ]
    : [
        { value: "none" as const, label: "Tanpa tindakan tambahan pada target" },
        {
          value: "hide_content" as const,
          label: "Sembunyikan / arsipkan konten terlapor",
        },
        {
          value: "delete_content" as const,
          label: "Hapus konten (soft delete)",
        },
        { value: "suspend_user" as const, label: "Suspend akun pemilik" },
        { value: "ban_user" as const, label: "Ban akun pemilik" },
      ];

  const activeIntentMeta =
    INTENT_OPTIONS.find((opt) => opt.value === nextStatus) ?? INTENT_OPTIONS[0];

  return (
    <div className="flex flex-col">
      {onCloseDrawer && (
        <div className="flex items-center justify-between gap-3 border-b border-hub-rule px-5 py-4">
          <h2 className="font-display text-[15px] font-semibold text-hub-ink">
            Keputusan Moderasi
          </h2>
          <button
            type="button"
            onClick={onCloseDrawer}
            className="inline-flex h-9 items-center rounded-full border border-hub-border-strong bg-hub-surface px-3.5 text-[13px] font-semibold whitespace-nowrap text-hub-ink transition-colors duration-150 hover:bg-hub-subtle active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus"
          >
            Tutup
          </button>
        </div>
      )}

      <div className="border-b border-hub-rule p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-hub-sidebar px-2 py-0.5 text-[13px] font-medium tabular-nums text-hub-ink-muted">
                Laporan #{report.id}
              </span>
              <span className="rounded-md bg-hub-subtle px-2 py-0.5 text-[13px] font-medium text-hub-ink-muted">
                {moduleLabel(report.reportable_type)}
              </span>
            </div>
            <h3 className="mt-2.5 font-display text-lg leading-snug font-semibold [overflow-wrap:break-word] [text-wrap:balance] text-hub-ink">
              {targetDisplay(report)}
            </h3>
          </div>
          <span
            className={`shrink-0 rounded-md px-2.5 py-1 text-[13px] font-medium whitespace-nowrap ${meta.chipClass}`}
          >
            {meta.label}
          </span>
        </div>

        <dl className="mt-4 space-y-2 text-[14px]">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-hub-ink-subtle">Kategori Alasan</dt>
            <dd className="text-right font-semibold text-hub-ink">
              {REASON_LABELS[report.reason] ?? report.reason}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-hub-ink-subtle">Pelapor</dt>
            <dd className="text-right font-medium text-hub-ink">
              {report.reporter?.name ?? `User #${report.reporter_id}`}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-hub-ink-subtle">Waktu Laporan</dt>
            <dd className="text-right font-medium text-hub-ink">
              {formatDateTime(report.created_at)}
            </dd>
          </div>
          {report.reportable?.status && (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-hub-ink-subtle">Status Target Saat Ini</dt>
              <dd className="text-right font-medium text-hub-ink">
                {report.reportable.status}
              </dd>
            </div>
          )}
        </dl>

        {report.description && (
          <div className="mt-4">
            <p className="text-[13px] font-semibold text-hub-ink-muted">
              Catatan pelapor
            </p>
            <p className="mt-1.5 max-h-36 overflow-y-auto rounded-xl bg-hub-subtle p-3.5 text-[14px] leading-relaxed whitespace-pre-line text-hub-ink-muted">
              {report.description}
            </p>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmitDecision(report, nextStatus, effectiveAction);
        }}
        className="space-y-4 p-5"
      >
        <div>
          <span className="block text-[13px] font-semibold text-hub-ink">
            Keputusan kasus
          </span>
          <div
            role="radiogroup"
            aria-label="Pilih keputusan laporan"
            className="mt-2 grid grid-cols-2 gap-2"
          >
            {INTENT_OPTIONS.map((opt) => {
              const selected = nextStatus === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={busy}
                  onClick={() => {
                    setNextStatus(opt.value);
                    if (opt.value !== "resolved") {
                      setTargetAction("none");
                    }
                  }}
                  className={`flex min-h-10 items-center justify-center rounded-xl border px-3 py-2 text-center text-[13px] font-semibold transition-colors duration-150 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus disabled:cursor-not-allowed disabled:opacity-55 ${
                    selected
                      ? "border-hub-ink bg-hub-ink text-hub-surface"
                      : "border-hub-border bg-hub-subtle text-hub-ink hover:bg-hub-surface-tint"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[13px] text-hub-ink-subtle [text-wrap:pretty]">
            {activeIntentMeta.hint}
          </p>
        </div>

        {nextStatus === "resolved" ? (
          <div>
            <label
              htmlFor="resolve-target-action"
              className="mb-1.5 block text-[13px] font-semibold text-hub-ink"
            >
              Tindakan pada objek terlapor
            </label>
            <SelectWrapper>
              <select
                id="resolve-target-action"
                value={targetAction}
                disabled={busy}
                onChange={(e) =>
                  setTargetAction(e.target.value as ReportTargetAction)
                }
                className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-hub-border bg-hub-subtle pr-9 pl-3.5 text-[14px] text-hub-ink outline-2 -outline-offset-2 outline-transparent transition-colors duration-150 hover:bg-hub-surface-tint focus:border-hub-ink-muted focus:bg-hub-surface focus-visible:outline-hub-focus disabled:cursor-not-allowed disabled:opacity-55"
              >
                {actionOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </SelectWrapper>

            {isDestructive && (
              <p
                role="status"
                className="mt-3 rounded-xl bg-hub-danger-bg px-3.5 py-2.5 text-[13px] font-medium text-hub-danger-ink [text-wrap:pretty]"
              >
                {TARGET_ACTION_COPY[
                  effectiveAction as Exclude<ReportTargetAction, "none">
                ]?.warning}
              </p>
            )}
          </div>
        ) : (
          <p className="rounded-xl bg-hub-subtle px-3.5 py-2.5 text-[13px] text-hub-ink-muted [text-wrap:pretty]">
            Status konten dan akun pemilik tidak akan diubah oleh keputusan ini.
          </p>
        )}

        <div className="flex items-center justify-end pt-1">
          <button
            type="submit"
            disabled={busy}
            className={`inline-flex h-10 w-full items-center justify-center rounded-full px-5 text-[13px] font-semibold whitespace-nowrap text-hub-surface transition-colors duration-150 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus disabled:cursor-not-allowed disabled:opacity-55 ${
              isDestructive
                ? "bg-hub-danger-solid hover:bg-hub-danger-solid-hover"
                : "bg-hub-ink hover:bg-hub-ink-hover"
            }`}
          >
            {busy
              ? "Memproses…"
              : isDestructive
                ? "Tinjau & Konfirmasi Sanksi"
                : "Simpan Keputusan"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ReportsWorkbench() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "";
  const urlSearch = searchParams.get("search") ?? "";
  const page = parsePositiveInt(searchParams.get("page"), 1);

  const [searchInput, setSearchInput] = useState(() => urlSearch);
  const [result, setResult] = useState<Paginated<AdminReportItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [inspectedId, setInspectedId] = useState<number | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const updateQuery = useCallback(
    (patch: { status?: string; search?: string; page?: number }) => {
      const next = new URLSearchParams(searchParams.toString());

      const setOrDelete = (key: string, val: string | undefined) => {
        if (val) {
          next.set(key, val);
        } else {
          next.delete(key);
        }
      };

      if ("status" in patch) setOrDelete("status", patch.status);
      if ("search" in patch) setOrDelete("search", patch.search);
      if ("page" in patch) {
        if (patch.page && patch.page > 1) {
          next.set("page", String(patch.page));
        } else {
          next.delete("page");
        }
      }

      const qs = next.toString();
      router.replace(qs ? `/reports?${qs}` : "/reports", { scroll: false });
    },
    [router, searchParams],
  );

  useDebouncedValue(searchInput.trim(), 400, (nextSearch) => {
    if (nextSearch === urlSearch) return;
    setSelectedIds([]);
    updateQuery({ search: nextSearch, page: 1 });
  });

  useEffect(() => {
    const controller = new AbortController();
    getAdminReports(
      {
        page,
        status: status || undefined,
        search: urlSearch || undefined,
      },
      { signal: controller.signal },
    ).then(
      (data) => {
        if (controller.signal.aborted) return;
        if (data.data.length === 0 && data.current_page > 1) {
          updateQuery({ page: data.current_page - 1 });
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
  }, [page, status, urlSearch, retryKey, updateQuery]);

  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileDrawerOpen]);

  const inspectedReport = useMemo(() => {
    if (!result || result.data.length === 0) return null;
    if (inspectedId !== null) {
      const match = result.data.find((item) => item.id === inspectedId);
      if (match) return match;
    }
    return result.data[0];
  }, [result, inspectedId]);

  const pageIds = useMemo(
    () => new Set((result?.data ?? []).map((item) => item.id)),
    [result],
  );

  const visibleSelectedIds = useMemo(
    () => selectedIds.filter((id) => pageIds.has(id)),
    [selectedIds, pageIds],
  );

  const allOnPageSelected = Boolean(
    result &&
      result.data.length > 0 &&
      result.data.every((item) => visibleSelectedIds.includes(item.id)),
  );

  const hasActiveFilters = Boolean(status || urlSearch);

  function toggleRowSelection(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id],
    );
  }

  function toggleAllOnPage() {
    if (!result) return;
    if (allOnPageSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(result.data.map((item) => item.id));
    }
  }

  function handleResetFilters() {
    setSearchInput("");
    setSelectedIds([]);
    updateQuery({ status: "", search: "", page: 1 });
  }

  function openInspectorFor(item: AdminReportItem) {
    setInspectedId(item.id);
    if (
      typeof window !== "undefined" &&
      !window.matchMedia("(min-width: 1280px)").matches
    ) {
      setMobileDrawerOpen(true);
    }
  }

  async function executeSingleResolution(
    report: AdminReportItem,
    nextStatus: Exclude<ReportStatus, "pending">,
    targetAction: ReportTargetAction,
  ) {
    setBusy(true);
    setActionError(null);
    try {
      await resolveAdminReport(report.id, {
        status: nextStatus,
        target_action: targetAction,
      });
      setConfirm(null);
      setMobileDrawerOpen(false);
      const data = await getAdminReports({
        page,
        status: status || undefined,
        search: urlSearch || undefined,
      });
      if (data.data.length === 0 && data.current_page > 1) {
        updateQuery({ page: data.current_page - 1 });
      } else {
        setError(null);
        setResult(data);
      }
    } catch (err) {
      setActionError(
        extractAdminError(err, "Gagal memproses laporan. Coba lagi."),
      );
    } finally {
      setBusy(false);
    }
  }

  function handleDecisionRequest(
    report: AdminReportItem,
    nextStatus: Exclude<ReportStatus, "pending">,
    targetAction: ReportTargetAction,
  ) {
    if (nextStatus === "resolved" && DESTRUCTIVE_ACTIONS.has(targetAction)) {
      setConfirm({
        scope: "single",
        report,
        nextStatus,
        targetAction,
      });
      return;
    }
    void executeSingleResolution(report, nextStatus, targetAction);
  }

  async function handleConfirm() {
    if (!confirm) return;
    if (confirm.scope === "single") {
      await executeSingleResolution(
        confirm.report,
        confirm.nextStatus,
        confirm.targetAction,
      );
      return;
    }

    setBusy(true);
    setActionError(null);
    try {
      await bulkResolveAdminReports(confirm.ids, {
        status: confirm.nextStatus,
        target_action: "none",
      });
      setSelectedIds([]);
      setConfirm(null);
      const data = await getAdminReports({
        page,
        status: status || undefined,
        search: urlSearch || undefined,
      });
      if (data.data.length === 0 && data.current_page > 1) {
        updateQuery({ page: data.current_page - 1 });
      } else {
        setError(null);
        setResult(data);
      }
    } catch (err) {
      setActionError(
        extractAdminError(err, "Gagal memproses laporan terpilih. Coba lagi."),
      );
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
          search: urlSearch || undefined,
        },
        "reports-moderasi.csv",
      );
    } catch (err) {
      setActionError(
        extractAdminError(err, "Gagal mengekspor CSV. Coba lagi."),
      );
    } finally {
      setExporting(false);
    }
  }

  const confirmDialogProps = useMemo(() => {
    if (!confirm) return null;
    if (confirm.scope === "single") {
      const actionKey = confirm.targetAction as Exclude<
        ReportTargetAction,
        "none"
      >;
      const copy = TARGET_ACTION_COPY[actionKey];
      return {
        title: copy.title,
        message: `${copy.warning} (${targetDisplay(confirm.report)})`,
        confirmLabel: copy.confirm,
        danger: true,
      };
    }
    const copy = BULK_COPY[confirm.nextStatus];
    return {
      title: copy.title,
      message: `${copy.message} (${formatNumber(confirm.ids.length)} laporan dipilih)`,
      confirmLabel: copy.confirm,
      danger: copy.danger,
    };
  }, [confirm]);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-8 sm:py-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 font-display text-2xl font-semibold tracking-tight [overflow-wrap:break-word] [text-wrap:balance] text-hub-ink sm:text-[28px]">
              Reports &amp; Moderasi
            </h1>
            {result && (
              <span
                role="status"
                className="rounded-md bg-hub-sidebar px-2.5 py-1 text-[13px] font-medium tabular-nums text-hub-ink-muted"
              >
                {formatNumber(result.total)} laporan
              </span>
            )}
          </div>
          <p className="mt-1 max-w-2xl text-[14px] text-hub-ink-muted [text-wrap:pretty]">
            Tinjau laporan pelanggaran mahasiswa, pastikan kombinasi status dan
            sanksi valid, lalu proses antrean secara aman.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-full border border-hub-border-strong bg-hub-surface px-4 text-[13px] font-semibold whitespace-nowrap text-hub-ink transition-colors duration-150 hover:bg-hub-subtle active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus disabled:cursor-not-allowed disabled:opacity-55 sm:self-auto"
        >
          <ActionIcon name="download" className="h-4 w-4 text-hub-ink-muted" />
          <span>{exporting ? "Mengekspor…" : "Ekspor CSV"}</span>
        </button>
      </section>

      {actionError && (
        <div
          role="alert"
          className="flex flex-col justify-between gap-3 rounded-[20px] border border-hub-danger-border bg-hub-danger-bg px-5 py-3.5 text-[14px] text-hub-danger-ink sm:flex-row sm:items-center"
        >
          <p className="font-medium">{actionError}</p>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="inline-flex h-9 shrink-0 items-center rounded-full border border-hub-danger-border bg-hub-surface px-3.5 text-[13px] font-semibold whitespace-nowrap text-hub-danger-ink transition-colors duration-150 hover:bg-hub-subtle active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus"
          >
            Tutup
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-[20px] border border-hub-border bg-hub-surface">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <ActionIcon
              name="search"
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-hub-ink-subtle"
            />
            <input
              type="text"
              name="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari alasan, deskripsi, atau nama pelapor…"
              aria-label="Cari laporan"
              className="h-10 w-full rounded-xl border border-hub-border bg-hub-subtle pr-10 pl-10 text-[14px] text-hub-ink outline-2 -outline-offset-2 outline-transparent transition-colors duration-150 placeholder:text-hub-ink-subtle hover:bg-hub-surface-tint focus:border-hub-ink-muted focus:bg-hub-surface focus-visible:outline-hub-focus"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSelectedIds([]);
                  updateQuery({ search: "", page: 1 });
                }}
                aria-label="Hapus kata kunci pencarian"
                className="absolute top-1/2 right-1.5 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-hub-ink-subtle transition-colors duration-150 hover:bg-hub-sidebar hover:text-hub-ink active:translate-y-px focus-visible:outline-2 focus-visible:outline-hub-focus"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M6 18L18 6M6 6l12 12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex h-10 self-start items-center rounded-full border border-hub-border-strong bg-hub-surface px-4 text-[13px] font-semibold whitespace-nowrap text-hub-ink transition-colors duration-150 hover:bg-hub-subtle active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus lg:self-auto"
            >
              Reset filter
            </button>
          )}
        </div>

        <div className="border-t border-hub-rule px-4 py-2.5">
          <div
            id="report-status-filter"
            role="tablist"
            aria-label="Filter status laporan"
            className="flex items-center gap-1.5 overflow-x-auto"
          >
            {STATUS_TABS.map((tab) => {
              const selected = status === tab.value;
              return (
                <button
                  key={tab.value || "all"}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => {
                    setSelectedIds([]);
                    updateQuery({ status: tab.value, page: 1 });
                  }}
                  className={`inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-150 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus ${
                    selected
                      ? "bg-hub-ink text-hub-surface"
                      : "bg-hub-canvas text-hub-ink-muted hover:bg-hub-surface-active hover:text-hub-ink"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {visibleSelectedIds.length > 0 && (
        <section
          aria-label="Aksi massal laporan"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-hub-ink px-5 py-3 text-hub-surface"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[14px] font-semibold tabular-nums">
              {formatNumber(visibleSelectedIds.length)} laporan dipilih
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="inline-flex h-8 items-center rounded-full border border-hub-ink-muted px-3 text-[13px] font-medium whitespace-nowrap text-hub-surface transition-colors duration-150 hover:bg-hub-ink-hover active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-surface"
            >
              Batal pilih
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { status: "reviewing", label: "Tandai Ditinjau" },
                { status: "resolved", label: "Tandai Selesai" },
                { status: "rejected", label: "Tolak" },
                { status: "dismissed", label: "Abaikan" },
              ] as const
            ).map((btn) => (
              <button
                key={btn.status}
                type="button"
                disabled={busy}
                onClick={() =>
                  setConfirm({
                    scope: "bulk",
                    ids: visibleSelectedIds,
                    nextStatus: btn.status,
                  })
                }
                className="inline-flex h-9 items-center rounded-full border border-hub-ink-muted bg-hub-ink-hover px-3.5 text-[13px] font-semibold whitespace-nowrap text-hub-surface transition-colors duration-150 hover:border-hub-surface active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-surface disabled:cursor-not-allowed disabled:opacity-55"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <div className="overflow-hidden rounded-[20px] border border-hub-border bg-hub-surface xl:col-span-7">
          {error ? (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <p
                role="alert"
                className="text-[14px] font-medium text-hub-danger-ink"
              >
                {error}
              </p>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setRetryKey((k) => k + 1);
                }}
                className="inline-flex h-10 items-center rounded-full bg-hub-ink px-4 text-[13px] font-semibold whitespace-nowrap text-hub-surface transition-colors duration-150 hover:bg-hub-ink-hover active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus"
              >
                Coba lagi
              </button>
            </div>
          ) : !result ? (
            <div className="divide-y divide-hub-rule" aria-label="Memuat laporan">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="space-y-2">
                    <div className="h-4 w-52 animate-pulse rounded bg-hub-sidebar" />
                    <div className="h-3.5 w-32 animate-pulse rounded bg-hub-subtle" />
                  </div>
                  <div className="h-7 w-20 animate-pulse rounded-full bg-hub-sidebar" />
                </div>
              ))}
            </div>
          ) : result.data.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <h2 className="font-display text-[16px] font-semibold text-hub-ink">
                Tidak ada laporan moderasi
              </h2>
              <p className="mx-auto mt-1 max-w-md text-[14px] text-hub-ink-subtle [text-wrap:pretty]">
                {hasActiveFilters
                  ? "Ubah kata kunci pencarian atau pilih tab status lain untuk melihat antrean laporan."
                  : "Antrean laporan pelanggaran saat ini bersih."}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-5 inline-flex h-10 items-center rounded-full border border-hub-border-strong bg-hub-surface px-4 text-[13px] font-semibold whitespace-nowrap text-hub-ink transition-colors duration-150 hover:bg-hub-subtle active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus"
                >
                  Tampilkan semua laporan
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-hub-rule bg-hub-subtle text-[13px] font-medium text-hub-ink-subtle">
                      <th className="w-10 py-3.5 pr-2 pl-4">
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={toggleAllOnPage}
                          aria-label="Pilih semua laporan di halaman ini"
                          className="h-4 w-4 cursor-pointer rounded border-hub-border-strong accent-hub-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus"
                        />
                      </th>
                      <th className="px-3 py-3.5 font-medium whitespace-nowrap">
                        Objek Terlapor
                      </th>
                      <th className="hidden px-3 py-3.5 font-medium whitespace-nowrap md:table-cell">
                        Alasan
                      </th>
                      <th className="hidden px-3 py-3.5 font-medium whitespace-nowrap sm:table-cell">
                        Status
                      </th>
                      <th className="py-3.5 pr-4 pl-3 text-right font-medium whitespace-nowrap">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hub-rule text-[14px]">
                    {result.data.map((item) => {
                      const meta = statusPresentation(item.status);
                      const isInspected = inspectedReport?.id === item.id;
                      const isChecked = visibleSelectedIds.includes(item.id);
                      const isPending = item.status === "pending";

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors duration-150 ${
                            isInspected
                              ? "bg-hub-subtle"
                              : "hover:bg-hub-subtle/70"
                          }`}
                        >
                          <td className="py-4 pr-2 pl-4 align-middle">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleRowSelection(item.id)}
                              aria-label={`Pilih laporan #${item.id}`}
                              className="h-4 w-4 cursor-pointer rounded border-hub-border-strong accent-hub-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus"
                            />
                          </td>

                          <td className="px-3 py-4 align-middle">
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => openInspectorFor(item)}
                                className="block max-w-56 truncate text-left text-[14px] font-semibold text-hub-ink transition-colors duration-150 hover:text-hub-ink-muted hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus sm:max-w-64"
                              >
                                {targetDisplay(item)}
                              </button>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <span className="rounded-md bg-hub-sidebar px-2 py-0.5 text-[13px] font-medium text-hub-ink-muted">
                                  {moduleLabel(item.reportable_type)}
                                </span>
                                <span className="text-[13px] tabular-nums text-hub-ink-subtle">
                                  #{item.reportable_id}
                                </span>
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[13px] font-medium sm:hidden ${meta.chipClass}`}
                                >
                                  {meta.label}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="hidden max-w-52 px-3 py-4 align-middle md:table-cell">
                            <p className="truncate font-medium text-hub-ink">
                              {REASON_LABELS[item.reason] ?? item.reason}
                            </p>
                            <p className="mt-0.5 truncate text-[13px] text-hub-ink-subtle">
                              {item.reporter?.name ?? `User #${item.reporter_id}`}
                            </p>
                          </td>

                          <td className="hidden px-3 py-4 align-middle sm:table-cell">
                            <span
                              className={`inline-block rounded-md px-2.5 py-0.5 text-[13px] font-medium whitespace-nowrap ${meta.chipClass}`}
                            >
                              {meta.label}
                            </span>
                            <p className="mt-1 text-[13px] whitespace-nowrap text-hub-ink-subtle">
                              {timeAgo(item.created_at)}
                            </p>
                          </td>

                          <td className="py-4 pr-4 pl-3 text-right align-middle">
                            <button
                              type="button"
                              onClick={() => openInspectorFor(item)}
                              className={`inline-flex h-9 items-center rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors duration-150 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus ${
                                isInspected
                                  ? "bg-hub-ink text-hub-surface"
                                  : isPending
                                    ? "border border-hub-border-strong bg-hub-surface text-hub-ink hover:bg-hub-subtle"
                                    : "border border-hub-border bg-hub-subtle text-hub-ink-muted hover:bg-hub-surface-tint hover:text-hub-ink"
                              }`}
                            >
                              {isPending ? "Tinjau" : "Detail"}
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
                onPage={(nextPage) => {
                  setSelectedIds([]);
                  updateQuery({ page: nextPage });
                }}
              />
            </>
          )}
        </div>

        <aside
          aria-label="Panel keputusan moderasi"
          className="hidden overflow-hidden rounded-[20px] border border-hub-border bg-hub-surface xl:sticky xl:top-[92px] xl:col-span-5 xl:block"
        >
          {!result && !error ? (
            <div className="space-y-4 p-5" aria-label="Memuat detail laporan">
              <div className="h-6 w-1/2 animate-pulse rounded bg-hub-sidebar" />
              <div className="h-24 w-full animate-pulse rounded-xl bg-hub-subtle" />
              <div className="h-44 w-full animate-pulse rounded-xl bg-hub-sidebar" />
            </div>
          ) : inspectedReport ? (
            <ReportDecisionPanel
              key={`${inspectedReport.id}-${inspectedReport.status}`}
              report={inspectedReport}
              busy={busy}
              onSubmitDecision={handleDecisionRequest}
            />
          ) : (
            <div className="p-6 text-center">
              <h2 className="font-display text-[15px] font-semibold text-hub-ink">
                Keputusan Moderasi
              </h2>
              <p className="mt-1.5 text-[14px] text-hub-ink-subtle [text-wrap:pretty]">
                Pilih salah satu laporan di sebelah kiri untuk memeriksa konteks
                pelanggaran dan menerapkan tindakan.
              </p>
            </div>
          )}
        </aside>
      </section>

      {mobileDrawerOpen && inspectedReport && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-hub-ink/35 backdrop-blur-[1px] xl:hidden"
          onClick={() => {
            if (!busy) setMobileDrawerOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Tinjau laporan #${inspectedReport.id}`}
            className="h-full w-full max-w-md overflow-y-auto border-l border-hub-border bg-hub-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <ReportDecisionPanel
              key={`${inspectedReport.id}-${inspectedReport.status}`}
              report={inspectedReport}
              busy={busy}
              onSubmitDecision={handleDecisionRequest}
              onCloseDrawer={() => {
                if (!busy) setMobileDrawerOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {confirm && confirmDialogProps && (
        <ConfirmDialog
          title={confirmDialogProps.title}
          message={confirmDialogProps.message}
          confirmLabel={confirmDialogProps.confirmLabel}
          danger={confirmDialogProps.danger}
          busy={busy}
          onConfirm={handleConfirm}
          onCancel={() => {
            if (!busy) setConfirm(null);
          }}
        />
      )}
    </main>
  );
}

export default function ReportsAdminPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-8 sm:py-8">
          <div className="h-12 w-72 animate-pulse rounded-xl bg-hub-sidebar" />
          <div className="h-28 w-full animate-pulse rounded-[20px] bg-hub-surface" />
          <div className="h-96 w-full animate-pulse rounded-[20px] bg-hub-surface" />
        </main>
      }
    >
      <ReportsWorkbench />
    </Suspense>
  );
}
