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
    title: "Marketplace Preloved",
    description:
      "Jual beli buku kuliah, alat praktik, dan perlengkapan kampus antar sesama mahasiswa UPN secara aman.",
  },
  {
    title: "Jasa & Layanan Mahasiswa",
    description:
      "Temukan atau tawarkan keahlian seperti les privat, desain grafis, pengetikan, dan servis perangkat.",
  },
  {
    title: "Lost & Found Kampus",
    description:
      "Laporkan barang hilang atau temuan di lingkungan kampus agar cepat kembali kepada pemiliknya.",
  },
  {
    title: "Event & Informasi Resmi",
    description:
      "Akses jadwal seminar, kompetisi, agenda UKM, dan pengumuman kemahasiswaan dalam satu pintu.",
  },
];

export default function HomePage() {
  const hasSession = useSyncExternalStore(
    subscribeNoop,
    getClientHasSession,
    getServerHasSession
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F9FB] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#002147] text-xs font-bold text-white">
              UPN
            </span>
            <div>
              <p className="text-sm font-bold leading-none text-slate-900">
                UPN Student Hub
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                UPN &ldquo;Veteran&rdquo; Jawa Timur
              </p>
            </div>
          </Link>

          <nav aria-label="Akses akun" className="flex items-center gap-2.5">
            {hasSession ? (
              <Link
                href="/dashboard"
                className="rounded-lg bg-[#002147] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0a2f5c]"
              >
                Buka Beranda →
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-[#002147] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0a2f5c]"
                >
                  Daftar Mahasiswa
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-14 sm:px-6">
        <section className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#002147]">
            Portal Ekosistem Kampus
          </p>
          <h1 className="mt-2.5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Satu ruang digital terpadu untuk kebutuhan mahasiswa UPN &ldquo;Veteran&rdquo; Jawa Timur.
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">
            Terhubung khusus menggunakan email institusi{" "}
            <code className="rounded bg-slate-200/70 px-1.5 py-0.5 text-xs font-semibold text-slate-800">
              @student.upnjatim.ac.id
            </code>{" "}
            untuk transaksi preloved, jasa mahasiswa, pelaporan barang hilang, komunikasi 1-on-1, dan informasi agenda kampus.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {hasSession ? (
              <Link
                href="/dashboard"
                className="rounded-lg bg-[#002147] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0a2f5c]"
              >
                Lanjut ke Beranda
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg bg-[#002147] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0a2f5c]"
                >
                  Masuk dengan Akun Mahasiswa
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Buat Akun Baru
                </Link>
              </>
            )}
          </div>
        </section>

        <section
          aria-label="Layanan utama"
          className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {FEATURES.map((feature, index) => (
            <div
              key={feature.title}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-[#002147]">
                0{index + 1}
              </span>
              <h2 className="mt-3 text-sm font-semibold text-slate-900">
                {feature.title}
              </h2>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">
                {feature.description}
              </p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:px-6">
          <p>© 2026 UPN Student Hub — UPN &ldquo;Veteran&rdquo; Jawa Timur.</p>
          <p>Khusus komunitas sivitas akademika terdaftar.</p>
        </div>
      </footer>
    </div>
  );
}
