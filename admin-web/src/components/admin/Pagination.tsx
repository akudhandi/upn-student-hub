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
    <div className="flex flex-col items-center justify-between gap-3 border-t border-[#F2EEEA] bg-white px-5 py-3.5 sm:flex-row">
      <p className="text-xs text-[#6E6A66]">
        Halaman {page} dari {lastPage} · {total} data
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="rounded-full border border-[#DFD9D2] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#141416] transition hover:border-[#CFC8BF] hover:bg-[#FAF8F6] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sebelumnya
        </button>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= lastPage}
          className="rounded-full border border-[#DFD9D2] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#141416] transition hover:border-[#CFC8BF] hover:bg-[#FAF8F6] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}
