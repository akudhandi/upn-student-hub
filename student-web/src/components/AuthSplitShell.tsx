"use client";

import React from "react";
import Link from "next/link";

const WORKSPACE_MODULES = [
  {
    name: "Marketplace Mahasiswa",
    detail: "Jual beli kebutuhan kuliah antar mahasiswa",
    tag: "Aktif",
    tagClass: "bg-[#E4F2EA] text-[#226A46]",
  },
  {
    name: "Jasa & Layanan",
    detail: "Les privat, desain, dan layanan kampus",
    tag: "Terverifikasi",
    tagClass: "bg-[#E7EEF9] text-[#35518C]",
  },
  {
    name: "Barang Hilang",
    detail: "Pelaporan temuan dan kehilangan di area kampus",
    tag: "Prioritas",
    tagClass: "bg-[#FBEAD8] text-[#8E581A]",
  },
  {
    name: "Event & Info",
    detail: "Agenda seminar, UKM, dan pengumuman resmi",
    tag: "Terjadwal",
    tagClass: "bg-[#ECEAF9] text-[#53469B]",
  },
] as const;

export function AuthSplitShell({
  activeTab,
  title,
  subtitle,
  children,
  footer,
}: {
  activeTab: "login" | "register";
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#DFDBD7] px-3 py-5 text-[#141416] sm:px-6 sm:py-8">
      <div className="w-full max-w-[1040px] rounded-[28px] border border-[#E7E2DD] bg-[#F4F1EE] p-4 shadow-[0_24px_60px_-28px_rgba(20,20,22,0.18)] sm:p-6 lg:p-7">
        {/* Top Bar (Planex-inspired header) */}
        <header className="flex flex-wrap items-center justify-between gap-3 pb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-sm font-semibold tracking-tight text-[#141416] transition-opacity hover:opacity-80"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#141416] text-white">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M8 1.5L9.8 6.2L14.5 8L9.8 9.8L8 14.5L6.2 9.8L1.5 8L6.2 6.2L8 1.5Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span>UPN Student Hub</span>
          </Link>

          <div className="flex items-center gap-2">
            <nav
              aria-label="Navigasi autentikasi"
              className="inline-flex items-center rounded-full bg-[#EAE6E2] p-1"
            >
              <Link
                href="/login"
                aria-current={activeTab === "login" ? "page" : undefined}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "login"
                    ? "bg-white text-[#141416] shadow-xs"
                    : "text-[#6E6A66] hover:text-[#141416]"
                }`}
              >
                Masuk
              </Link>
              <Link
                href="/register"
                aria-current={activeTab === "register" ? "page" : undefined}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "register"
                    ? "bg-white text-[#141416] shadow-xs"
                    : "text-[#6E6A66] hover:text-[#141416]"
                }`}
              >
                Daftar
              </Link>
            </nav>

            <Link
              href="/"
              className="hidden rounded-full border border-[#E2DDD7] bg-white px-3.5 py-1.5 text-xs font-medium text-[#3F3D3A] transition-colors hover:bg-[#FAF8F6] sm:inline-flex"
            >
              Beranda
            </Link>
          </div>
        </header>

        {/* Main Workspace Split */}
        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          {/* Left Warm-Stone Bento Preview Panel */}
          <aside className="hidden flex-col justify-between rounded-[22px] bg-[#ECE8E4] p-6 lg:flex">
            <div>
              <p className="text-[11px] font-medium tracking-wide text-[#787470] uppercase">
                Portal Mahasiswa UPN Veteran Jawa Timur
              </p>
              <h2 className="mt-2 text-[22px] font-semibold leading-snug tracking-tight text-[#141416]">
                Satu ruang terpadu untuk aktivitas kampus Anda.
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-[#6E6A66]">
                Akses marketplace mahasiswa, penawaran jasa, laporan barang hilang, hingga agenda
                kampus dengan akun email resmi UPN.
              </p>

              {/* Overview Card mimicking Planex clean table/list surface */}
              <div className="mt-6 rounded-2xl border border-[#E6E1DC] bg-white p-4">
                <div className="flex items-center justify-between border-b border-[#F1EDE9] pb-3">
                  <div>
                    <p className="text-xs font-semibold text-[#141416]">Modul Portal</p>
                    <p className="text-[11px] text-[#7D7974]">Tersedia setelah login mahasiswa</p>
                  </div>
                  <span className="rounded-full bg-[#F4F1EE] px-2.5 py-1 text-[11px] font-medium text-[#57534E]">
                    4 Layanan
                  </span>
                </div>

                <ul className="divide-y divide-[#F3EFEA]">
                  {WORKSPACE_MODULES.map((item) => (
                    <li
                      key={item.name}
                      className="flex items-center justify-between gap-3 py-3 first:pt-3 last:pb-0.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-[#141416]">{item.name}</p>
                        <p className="truncate text-[11px] text-[#85817C]">{item.detail}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${item.tagClass}`}
                      >
                        {item.tag}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bottom Verification Policy Card */}
            <div className="mt-5 rounded-2xl border border-[#E6E1DC] bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#141416]">Standar Akun Terverifikasi</p>
                <span className="rounded-full bg-[#141416] px-2.5 py-0.5 text-[10px] font-medium text-white">
                  UPN Jatim
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-[#F6F3F0] p-3">
                <div>
                  <p className="text-[10px] font-medium text-[#85817C]">Domain Email</p>
                  <p className="mt-0.5 truncate text-xs font-medium text-[#141416]">
                    @student.upnjatim.ac.id
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-[#85817C]">Identitas NPM</p>
                  <p className="mt-0.5 text-xs font-medium text-[#141416]">11 Digit Numerik</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Form Card */}
          <section className="flex flex-col justify-center rounded-[22px] border border-[#E7E2DD] bg-white px-5 py-6 sm:px-9 sm:py-8">
            <div className="mx-auto w-full max-w-[420px]">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-[#141416] sm:text-[26px]">
                  {title}
                </h1>
                <p className="mt-1.5 text-xs leading-relaxed text-[#787470]">{subtitle}</p>
              </div>

              <div className="mt-6">{children}</div>

              <div className="mt-6 border-t border-[#F1EDE9] pt-5 text-center text-xs text-[#787470]">
                {footer}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export function PasswordEyeButton({
  shown,
  onToggle,
  ariaLabel,
}: {
  shown: boolean;
  onToggle: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={ariaLabel ?? (shown ? "Sembunyikan password" : "Tampilkan password")}
      title={ariaLabel ?? (shown ? "Sembunyikan password" : "Tampilkan password")}
      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#85817C] transition-colors hover:bg-[#EAE6E2] hover:text-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
    >
      {shown ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 3l18 18M10.58 10.58a2 2 0 002.83 2.83M9.88 4.24A10.94 10.94 0 0112 4c5.5 0 9.5 4.2 10.7 8-.5 1.56-1.45 3.1-2.74 4.37M6.61 6.61C4.55 8 3.06 10.02 2.3 12c1.2 3.8 5.2 8 9.7 8 1.58 0 3.07-.37 4.4-1.02"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M2.3 12C3.5 8.2 7.5 4 12 4s8.5 4.2 9.7 8c-1.2 3.8-5.2 8-9.7 8s-8.5-4.2-9.7-8z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      )}
    </button>
  );
}

export function FieldErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 text-[11px] leading-4 font-medium text-[#C53939]">
      {message}
    </p>
  );
}
