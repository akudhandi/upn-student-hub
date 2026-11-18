"use client";

export function isVerifiedEventOrganizer(event: {
  is_verified?: boolean | null;
  user?: { account_type?: string | null } | null;
}): boolean {
  if (event.is_verified === true) return true;
  const t = event.user?.account_type;
  return t === "hima" || t === "ormawa" || t === "faculty";
}

export default function VerifiedBadge({
  showLabel = false,
  label = "Terverifikasi",
  title = "Penyelenggara resmi terverifikasi UPN",
  size = "sm",
}: {
  showLabel?: boolean;
  label?: string;
  title?: string;
  size?: "xs" | "sm";
}) {
  const iconDim = size === "xs" ? 13 : 15;

  const icon = (
    <svg
      width={iconDim}
      height={iconDim}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-[#0284C7]"
    >
      <circle cx="10" cy="10" r="9" fill="currentColor" />
      <path
        d="M6.4 10.3L8.8 12.7L13.8 7.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (showLabel) {
    return (
      <span
        title={title}
        className="inline-flex items-center gap-1 rounded-full bg-[#E8F4FC] px-2 py-0.5 text-[11px] font-semibold text-[#0369A1]"
      >
        {icon}
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span
      title={title}
      aria-label={title}
      className="inline-flex shrink-0 items-center align-middle"
    >
      {icon}
    </span>
  );
}
