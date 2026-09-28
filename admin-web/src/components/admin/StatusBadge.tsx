type BadgeTone = "green" | "amber" | "blue" | "slate" | "rose";

const TONE_CLASSES: Record<BadgeTone, string> = {
  green: "bg-emerald-500/15 text-emerald-700",
  amber: "bg-amber-500/15 text-amber-700",
  blue: "bg-sky-500/15 text-sky-700",
  slate: "bg-slate-500/15 text-slate-600",
  rose: "bg-rose-500/15 text-rose-700",
};

const DOT_CLASSES: Record<BadgeTone, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  blue: "bg-sky-500",
  slate: "bg-slate-400",
  rose: "bg-rose-500",
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
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[tone]}`} />
      {label}
    </span>
  );
}
