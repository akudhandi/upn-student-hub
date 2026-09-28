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
    <div className="card-transition flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </span>
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconClass}`}
          >
            {icon}
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900">
            {value}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400">{sub}</p>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <Link
          href={href}
          className="flex items-center gap-1 font-semibold text-slate-700 transition-all hover:text-sky-600"
        >
          {linkLabel} <span aria-hidden="true">→</span>
        </Link>
        <span className="font-medium text-slate-400">{footnote}</span>
      </div>
    </div>
  );
}
