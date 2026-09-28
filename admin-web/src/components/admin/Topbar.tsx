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
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200/90 bg-white px-4 shadow-xs sm:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Buka navigasi"
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
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
              strokeWidth={2}
            />
          </svg>
        </button>
        <span className="text-base font-bold tracking-tight text-slate-800">
          Administrasi Platform
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <Link
          href="/notifications"
          aria-label="Pemberitahuan"
          className="relative rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </Link>

        <div className="hidden h-6 w-px bg-slate-200 sm:block" />

        <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-slate-50/70 px-3 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
            {initial}
          </div>
          <span className="max-w-28 truncate pr-1 text-sm font-semibold text-slate-700">
            {adminName}
          </span>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="hidden items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-2xs transition hover:border-slate-400 hover:bg-white sm:inline-flex"
        >
          Keluar
        </button>
      </div>
    </header>
  );
}
