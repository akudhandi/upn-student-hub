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
      className={`inline-flex items-center gap-1.5 rounded-full border border-[#DFD9D2] bg-white px-4 py-2 text-xs font-semibold text-[#141416] transition hover:border-[#CFC8BF] hover:bg-[#FAF8F6] disabled:opacity-60 ${className}`.trim()}
    >
      <ActionIcon name="download" className="h-4 w-4 text-[#57534E]" />
      {exporting ? "Mengekspor…" : "Ekspor CSV"}
    </button>
  );
}
