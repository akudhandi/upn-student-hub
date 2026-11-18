"use client";

import React from "react";
import Link from "next/link";

const HUB_PILLARS = [
  {
    label: "Marketplace",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 8h12l-1 11H7L6 8z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 8V6.5a2.5 2.5 0 015 0V8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    label: "Layanan",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3l2.2 5.3L19.5 10l-5.3 1.8L12 17l-2.2-5.2L4.5 10l5.3-1.7L12 3z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Temuan",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M15.5 15.5L20 20"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    label: "Agenda",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="4"
          y="5.5"
          width="16"
          height="14.5"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M8 3.5v3M16 3.5v3M4 10h16"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
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
        {/* Top Bar */}
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
          {/* Left Calm Editorial Showcase */}
          <aside className="hidden flex-col justify-between rounded-[22px] bg-[#ECE8E4] p-8 lg:flex">
            <div className="space-y-3">
              <p className="text-xs font-medium text-[#787470]">
                UPN &ldquo;Veteran&rdquo; Jawa Timur
              </p>
              <h2 className="text-[26px] font-semibold leading-[1.24] tracking-tight text-[#141416]">
                Semua aktivitas kampus dalam satu ruang yang rapi.
              </h2>
              <p className="max-w-[330px] text-[13px] leading-relaxed text-[#6E6A66]">
                Ruang khusus mahasiswa untuk jual beli, layanan sebaya, dan info acara kampus.
              </p>
            </div>

            {/* Spacious Minimal 2x2 Visual Grid */}
            <div className="my-auto py-8">
              <div className="grid grid-cols-2 gap-3.5">
                {HUB_PILLARS.map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col items-start justify-between rounded-2xl border border-[#E5E0DA] bg-white p-4 shadow-[0_8px_20px_-14px_rgba(20,20,22,0.12)]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F4F1EE] text-[#141416]">
                      {item.icon}
                    </span>
                    <span className="mt-5 text-xs font-medium text-[#141416]">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quiet Verification Line */}
            <div className="flex items-center gap-2 border-t border-[#DFDAD4] pt-4 text-xs text-[#6E6A66]">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="shrink-0 text-[#141416]"
              >
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M8.5 12.2l2.3 2.3 4.7-4.8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Khusus email mahasiswa @student.upnjatim.ac.id</span>
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
