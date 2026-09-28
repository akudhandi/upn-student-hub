export default function Pagination({
  page,
  lastPage,
  total,
  onPage,
}: {
  page: number;
  lastPage: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-3 sm:flex-row">
      <p className="text-xs text-slate-500">
        Halaman {page} dari {lastPage} · {total} data
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sebelumnya
        </button>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= lastPage}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}
