import { ActionIcon } from "@/components/admin/ActionIcons";

export default function ExportCsvButton({
  exporting,
  onClick,
  className = "",
}: {
  exporting: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={exporting}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-60 ${className}`.trim()}
    >
      <ActionIcon name="download" className="h-4 w-4 text-slate-500" />
      {exporting ? "Mengekspor…" : "Ekspor CSV"}
    </button>
  );
}
