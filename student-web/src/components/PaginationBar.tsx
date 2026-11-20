"use client";

export type PaginationBarProps = {
  ariaLabel: string;
  page: number;
  lastPage: number;
  total: number;
  unitLabel: string;
  onPageChange: (nextPage: number) => void;
};

export function PaginationBar({
  ariaLabel,
  page,
  lastPage,
  total,
  unitLabel,
  onPageChange,
}: PaginationBarProps) {
  if (lastPage <= 1) return null;

  return (
    <nav
      aria-label={ariaLabel}
      className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#E5E0DA] bg-white px-5 py-4 text-[14px] text-[#57534E]"
    >
      <span role="status">
        Halaman <strong className="font-semibold text-[#141416]">{page}</strong> dari{" "}
        <strong className="font-semibold text-[#141416]">{lastPage}</strong> ({total} {unitLabel})
      </span>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="inline-flex h-11 items-center justify-center rounded-full border border-[#E5E0DA] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-40"
        >
          Sebelumnya
        </button>
        <button
          type="button"
          disabled={page >= lastPage}
          onClick={() => onPageChange(Math.min(lastPage, page + 1))}
          className="inline-flex h-11 items-center justify-center rounded-full border border-[#E5E0DA] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-40"
        >
          Berikutnya
        </button>
      </div>
    </nav>
  );
}

export default PaginationBar;
