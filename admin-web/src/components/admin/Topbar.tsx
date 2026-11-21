"use client";

import Link from "next/link";

export default function Topbar({
  adminName,
  onMenu,
  onLogout,
}: {
  adminName: string;
  onMenu: () => void;
  onLogout: () => void;
}) {
  const initial = adminName.trim().charAt(0).toUpperCase() || "A";

  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[#E5E0DA] bg-[#F4F1EE]/95 px-4 backdrop-blur-md sm:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Buka navigasi"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E0DA] bg-white text-[#141416] transition-colors hover:bg-[#FAF8F6] lg:hidden"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M4 6h16M4 12h16M4 18h16"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.7}
            />
          </svg>
        </button>
        <span className="font-display text-base font-semibold tracking-tight text-[#141416]">
          Administrasi Platform
        </span>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        <Link
          href="/notifications"
          aria-label="Pemberitahuan"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E0DA] bg-white text-[#57534E] transition-colors hover:border-[#CFC8BF] hover:bg-[#FAF8F6] hover:text-[#141416]"
        >
          <svg
            className="h-[18px] w-[18px]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.7}
            />
          </svg>
        </Link>

        <div className="flex h-10 items-center gap-2.5 rounded-full border border-[#E5E0DA] bg-white py-1 pl-1.5 pr-3.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#141416] text-xs font-semibold text-white">
            {initial}
          </div>
          <span className="max-w-32 truncate text-[13px] font-semibold text-[#141416]">
            {adminName}
          </span>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="hidden h-10 items-center gap-1.5 rounded-full border border-[#DFD9D2] bg-white px-4 text-xs font-semibold text-[#141416] transition-all duration-150 hover:border-[#CFC8BF] hover:bg-[#FAF8F6] sm:inline-flex"
        >
          Keluar
        </button>
      </div>
    </header>
  );
}
