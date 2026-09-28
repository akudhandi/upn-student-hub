export function formatNumber(n: number | string): string {
  const num = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(num)) return String(n);
  return new Intl.NumberFormat("id-ID").format(num);
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes}m lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}h lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function shortReportableType(type: string): string {
  const parts = type.split("\\");
  return parts[parts.length - 1] ?? type;
}
