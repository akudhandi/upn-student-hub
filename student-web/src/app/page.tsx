"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { getToken } from "@/lib/auth";

function subscribeNoop(): () => void {
  return () => {};
}

function getClientHasSession(): boolean {
  return Boolean(getToken());
}

function getServerHasSession(): boolean {
  return false;
}

const FEATURES = [
  {
    title: "Marketplace",
    description: "Jual beli buku kuliah & perlengkapan antar mahasiswa.",
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
    title: "Layanan",
    description: "Temukan jasa desain, les privat, dan bantuan sebaya.",
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
    title: "Temuan",
    description: "Laporkan dan cari barang hilang di lingkungan kampus.",
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
    title: "Agenda",
    description: "Ikuti jadwal seminar, UKM, dan info resmi kemahasiswaan.",
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

export default function HomePage() {
  const hasSession = useSyncExternalStore(
    subscribeNoop,
    getClientHasSession,
    getServerHasSession
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#DFDBD7] px-3 py-5 text-[#141416] sm:px-6 sm:py-8">
      <div className="auth-shell-enter w-full max-w-[1040px] rounded-[28px] border border-[#E7E2DD] bg-[#F4F1EE] p-4 shadow-[0_24px_60px_-28px_rgba(20,20,22,0.18)] sm:p-6 lg:p-8">
        {/* Top Bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 pb-6 sm:pb-8">
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 text-sm font-semibold tracking-tight text-[#141416] transition-opacity hover:opacity-85"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#141416] text-white transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M8 1.5L9.8 6.2L14.5 8L9.8 9.8L8 14.5L6.2 9.8L1.5 8L6.2 6.2L8 1.5Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span>UPN Student Hub</span>
          </Link>

          <nav aria-label="Akses akun" className="flex items-center gap-2">
            {hasSession ? (
              <Link
                href="/dashboard"
                className="inline-flex h-9 items-center justify-center rounded-full bg-[#141416] px-4 text-xs font-medium text-white transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#242428] hover:shadow-[0_10px_22px_-10px_rgba(20,20,22,0.35)]"
              >
                Buka Beranda →
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex h-9 items-center justify-center rounded-full border border-[#E2DDD7] bg-white px-4 text-xs font-medium text-[#3F3D3A] transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#FAF8F6] hover:text-[#141416]"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-9 items-center justify-center rounded-full bg-[#141416] px-4 text-xs font-medium text-white transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#242428] hover:shadow-[0_10px_22px_-10px_rgba(20,20,22,0.35)]"
                >
                  Daftar Mahasiswa
                </Link>
              </>
            )}
          </nav>
        </header>

        {/* Main Workspace Split */}
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
          {/* Left Hero Copy */}
          <section className="rounded-[22px] border border-[#E7E2DD] bg-white px-6 py-8 sm:px-9 sm:py-10">
            <p className="text-xs font-medium text-[#787470]">
              UPN &ldquo;Veteran&rdquo; Jawa Timur
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-[1.2] tracking-tight text-[#141416] sm:text-[34px]">
              Satu ruang digital yang rapi untuk kebutuhan kampus.
            </h1>
            <p className="mt-4 max-w-[460px] text-sm leading-relaxed text-[#6E6A66]">
              Terhubung lewat email resmi{" "}
              <code className="rounded-md bg-[#F4F1EE] px-1.5 py-0.5 text-xs font-medium text-[#141416]">
                @student.upnjatim.ac.id
              </code>{" "}
              untuk jual beli barang kuliah, layanan sebaya, pelaporan barang hilang, komunikasi
              1-on-1, dan informasi acara kampus.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              {hasSession ? (
                <Link
                  href="/dashboard"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-sm font-medium text-white transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#242428] hover:shadow-[0_10px_22px_-10px_rgba(20,20,22,0.38)] active:translate-y-0 active:scale-[0.99]"
                >
                  Lanjut ke Beranda
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-sm font-medium text-white transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#242428] hover:shadow-[0_10px_22px_-10px_rgba(20,20,22,0.38)] active:translate-y-0 active:scale-[0.99]"
                  >
                    Masuk ke Portal
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[#EFECE8] px-6 text-sm font-medium text-[#27272A] transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#E5E1DC] active:translate-y-0 active:scale-[0.99]"
                  >
                    Buat Akun Baru
                  </Link>
                </>
              )}
            </div>

            <div className="mt-8 flex items-center gap-2 border-t border-[#F1EDE9] pt-5 text-xs text-[#787470]">
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
              <span>Khusus komunitas mahasiswa UPN terverifikasi dengan chat 1-on-1.</span>
            </div>
          </section>

          {/* Right Spacious 2x2 Feature Grid */}
          <section
            aria-label="Layanan utama"
            className="rounded-[22px] bg-[#ECE8E4] p-5 sm:p-6"
          >
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="group flex flex-col justify-between rounded-2xl border border-[#E5E0DA] bg-white p-5 shadow-[0_8px_20px_-14px_rgba(20,20,22,0.12)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-[#D5CEC6] hover:shadow-[0_14px_28px_-14px_rgba(20,20,22,0.18)]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F4F1EE] text-[#141416] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 group-hover:bg-[#141416] group-hover:text-white">
                    {feature.icon}
                  </span>
                  <div className="mt-5">
                    <h2 className="text-sm font-semibold text-[#141416]">
                      {feature.title}
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-[#6E6A66]">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Minimal Footer */}
        <footer className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-[#E5E0DA] pt-4 text-xs text-[#787470] sm:flex-row">
          <p>© 2026 UPN Student Hub — UPN &ldquo;Veteran&rdquo; Jawa Timur.</p>
          <p>Khusus komunitas sivitas akademika terdaftar.</p>
        </footer>
      </div>
    </main>
  );
}
