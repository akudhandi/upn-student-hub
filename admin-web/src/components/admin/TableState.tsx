import EmptyState from "@/components/admin/EmptyState";

export default function TableState({
  error,
  onRetry,
  loading,
  loadingLabel,
  skeletonRows = 5,
  skeletonHeightClass = "h-16",
  empty,
  emptyTitle,
  emptyMessage,
  children,
}: {
  error: string | null;
  onRetry: () => void;
  loading: boolean;
  loadingLabel: string;
  skeletonRows?: number;
  skeletonHeightClass?: string;
  empty: boolean;
  emptyTitle: string;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 px-5 py-12">
        <p role="alert" className="text-sm font-medium text-rose-700">
          {error}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3 p-4" aria-label={loadingLabel}>
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <div
            key={i}
            className={`${skeletonHeightClass} animate-pulse rounded-lg bg-slate-100`}
          />
        ))}
      </div>
    );
  }

  if (empty) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return <>{children}</>;
}
