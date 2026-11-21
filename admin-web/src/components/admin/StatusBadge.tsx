export type BadgeTone = "green" | "amber" | "blue" | "slate" | "rose";

const TONE_CLASSES: Record<BadgeTone, string> = {
  green: "bg-[#E4F2EA] text-[#226A46]",
  amber: "bg-[#FBEAD8] text-[#8E581A]",
  blue: "bg-[#E7EEF9] text-[#35518C]",
  slate: "bg-[#EFECE8] text-[#57534E]",
  rose: "bg-[#FDECEC] text-[#A62D2D]",
};

const DOT_CLASSES: Record<BadgeTone, string> = {
  green: "bg-[#226A46]",
  amber: "bg-[#B45309]",
  blue: "bg-[#35518C]",
  slate: "bg-[#787470]",
  rose: "bg-[#C53939]",
};

export default function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[tone]}`} />
      {label}
    </span>
  );
}
