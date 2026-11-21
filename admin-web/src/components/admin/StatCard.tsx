import Link from "next/link";

export default function StatCard({
  label,
  value,
  sub,
  href,
  linkLabel,
  footnote,
  icon,
  iconClass,
}: {
  label: string;
  value: string;
  sub: string;
  href: string;
  linkLabel: string;
  footnote: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="card-transition flex flex-col justify-between rounded-2xl border border-[#E5E0DA] bg-white p-5">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#6E6A66]">
            {label}
          </span>
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconClass}`}
          >
            {icon}
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-display text-3xl font-bold tracking-tight text-[#141416]">
            {value}
          </span>
        </div>
        <p className="mt-1 text-xs text-[#787470]">{sub}</p>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-[#F2EEEA] pt-3 text-xs">
        <Link
          href={href}
          className="flex items-center gap-1 font-semibold text-[#141416] transition-colors hover:text-[#57534E]"
        >
          {linkLabel} <span aria-hidden="true">→</span>
        </Link>
        <span className="font-medium text-[#787470]">{footnote}</span>
      </div>
    </div>
  );
}
