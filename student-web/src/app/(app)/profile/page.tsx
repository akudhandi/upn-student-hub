"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Mock data statis untuk preview UI Profil Saya.
// TODO: Ganti dengan GET /api/v1/profile saat backend siap. Bentuk data
// dipertahankan agar penukaran ke fetch API tetap mudah.
// ---------------------------------------------------------------------------

type MyListing = {
  id: string;
  category: string;
  categoryTone: string;
  status: string;
  title: string;
  description: string;
  priceLabel: string;
  price: string;
  priceSuffix?: string;
  actions: string[];
  primaryAction?: string;
  meta?: string;
  footerNote?: string;
};

const USER_PROFILE = {
  name: "Alex Rivera",
  status: "Mahasiswa Aktif",
  program: "S1 Informatika",
  faculty: "Fakultas Ilmu Komputer",
  angkatan: "Angkatan 2022",
  nim: "19482914",
  email: "alex.rivera@upn.ac.id",
  campus: "Kampus Condongcatur, Sleman",
  initials: "AR",
  stats: [
    { label: "Listing Aktif", value: "3", hint: "barang & jasa" },
    { label: "Transaksi Sukses", value: "18", hint: "transaksi selesai" },
    { label: "Rating Ulasan", value: "4.9", hint: "/ 5.0 (24 ulasan)" },
  ],
};

const MY_LISTINGS: MyListing[] = [
  {
    id: "listing-1",
    category: "Buku & Materi Kuliah",
    categoryTone: "border-amber-200 bg-amber-50 text-amber-800",
    status: "Tersedia",
    title: "Buku Engineering Mechanics Edisi ke-4 (Hibbeler)",
    description:
      "Kondisi sangat mulus 90%, hanya sedikit coretan pensil di bab 1–2. Kertas bersih dan jilid masih sangat rapi. Cocok untuk matkul…",
    priceLabel: "Harga",
    price: "Rp 150.000",
    actions: ["Edit Iklan", "Tandai Terjual"],
  },
  {
    id: "listing-2",
    category: "Jasa & Mentoring",
    categoryTone: "border-emerald-200 bg-emerald-50 text-emerald-800",
    status: "Buka Slot",
    title: "Mentoring Koding Pemrograman Dasar (Python & Java)",
    description:
      "Bimbingan tugas praktikum pemrograman dasar, struktur data, dan OOP. Bisa tatap muka di perpustakaan UPN atau via Google Meet.",
    priceLabel: "Tarif Belajar",
    price: "Rp 50.000",
    priceSuffix: "/ sesi (90 mnt)",
    actions: ["Atur Jadwal", "Edit Iklan"],
  },
  {
    id: "listing-3",
    category: "Barang Hilang • Dicari Pemilik",
    categoryTone: "border-indigo-200 bg-indigo-50 text-indigo-800",
    status: "Diposting 2 hari lalu",
    title: "Ditemukan: Botol Minum Tumbler Stainless Biru",
    description:
      "Tertinggal di Lab Komputer Gedung Pattimura Lt. 3 setelah kuliah Basis Data sekitar jam 15:30. Ada stiker Fakultas Ilmu Komputer…",
    priceLabel: "",
    price: "",
    actions: [],
    primaryAction: "Sudah Diambil Pemilik",
    footerNote: "Dititipkan di Lab Komputer 302",
  },
];

const COD_LOCATIONS = [
  { label: "Perpustakaan Pusat UPN (Lantai 1)" },
  { label: "Lobi Gedung Pattimura (Fak. Ilmu Komputer)" },
  { label: "Kantin Pusat / Gazebo Mahasiswa" },
];

const RECENT_REVIEWS = [
  {
    quote: "Buku mekanika-nya masih bagus banget sesuai deskripsi. COD tepat waktu di perpus kampus.",
    author: "Rian (Teknik Perminyakan ’23)",
    time: "Kemarin",
  },
  {
    quote: "Mentor yang sabar buat tugas praktikum struktur data. Penjelasannya gampang dipahami.",
    author: "Dita (Informatika ’23)",
    time: "5 hari lalu",
  },
];

const TABS = [
  { id: "listing", label: "Listing Saya", count: "3" },
  { id: "riwayat", label: "Riwayat Transaksi", count: "18" },
  { id: "ulasan", label: "Ulasan Teman Kampus", count: "24" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function ListingThumb({ id }: { id: string }) {
  return (
    <div
      className="flex h-28 w-full shrink-0 items-center justify-center rounded-lg bg-[#EEF2F7] text-slate-400 sm:h-[104px] sm:w-36"
      aria-hidden="true"
    >
      {id === "listing-1" ? (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15.5H6.7A1.7 1.7 0 0 0 5 20.2V4.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M5 19.5A1.5 1.5 0 0 1 6.5 18H19V20.5H6.5A1.5 1.5 0 0 1 5 19.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M9 7.5h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ) : id === "listing-2" ? (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M9 20h6M12 16v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M9 4h6v3H9V4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M8 7h8l-1 13H9L8 7Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

function StatIcon({ index }: { index: number }) {
  if (index === 0) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2 5.5L8 2L14 5.5V13H2V5.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M6 13V7H10V13" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    );
  }
  if (index === 1) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
        <path d="M5.5 8.2L7.4 10L10.6 6.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2.5L9.8 6.1L13.7 6.6L10.8 9.3L11.6 13.2L8 11.2L4.4 13.2L5.2 9.3L2.3 6.6L6.2 6.1L8 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

const STAT_STYLES = [
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-blue-100 text-blue-700",
];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<TabId>("listing");

  return (
    <div className="mx-auto max-w-[1180px]">
      {/* ===== Header profil ===== */}
      <section
        aria-labelledby="profile-heading"
        className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="relative shrink-0">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#002147] text-xl font-bold text-white">
                {USER_PROFILE.initials}
              </div>
              <span
                className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 id="profile-heading" className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  {USER_PROFILE.name}
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                  {USER_PROFILE.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-700">
                {USER_PROFILE.program} • {USER_PROFILE.faculty} • {USER_PROFILE.angkatan}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>
                  NIM: <span className="font-semibold text-slate-700">{USER_PROFILE.nim}</span>
                </span>
                <span className="hidden text-slate-300 sm:inline" aria-hidden="true">•</span>
                <span className="inline-flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="2" y="3.5" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M2.5 4L8 8.5L13.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                  {USER_PROFILE.email}
                </span>
                <span className="hidden text-slate-300 sm:inline" aria-hidden="true">•</span>
                <span className="inline-flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M8 14s4.5-4 4.5-7.5A4.5 4.5 0 0 0 3.5 6.5C3.5 10 8 14 8 14Z" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="8" cy="6.5" r="1.6" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  {USER_PROFILE.campus}
                </span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-[#002147] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a2f5c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M11.5 2.5L13.5 4.5L5.5 12.5L2.5 13.5L3.5 10.5L11.5 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
              Edit Profil
            </button>
            <button
              type="button"
              aria-label="Pengaturan profil"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
                <path d="M8 1.8v1.7M8 12.5v1.7M1.8 8h1.7M12.5 8h1.7M3.6 3.6l1.2 1.2M11.2 11.2l1.2 1.2M12.4 3.6l-1.2 1.2M4.8 11.2l-1.2 1.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Statistik */}
        <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
          {USER_PROFILE.stats.map((stat, i) => (
            <div key={stat.label} className="flex items-center gap-3 rounded-lg bg-[#F8F9FB] px-4 py-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${STAT_STYLES[i]}`}>
                <StatIcon index={i} />
              </span>
              <div className="min-w-0">
                <dt className="text-xs text-slate-500">{stat.label}</dt>
                <dd className="text-sm text-slate-900">
                  <span className="text-lg font-bold">{stat.value}</span>{" "}
                  <span className="text-xs text-slate-500">{stat.hint}</span>
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </section>

      {/* ===== Tab + sortir ===== */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Konten profil" className="flex gap-1 overflow-x-auto border-b border-slate-200 sm:gap-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-3 pb-2.5 pt-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2 ${
                  isActive
                    ? "border-b-2 border-slate-900 font-semibold text-slate-900"
                    : "font-medium text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label} <span className="ml-1.5 text-xs text-slate-400">{tab.count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
          <label htmlFor="sort-listing">Urutkan:</label>
          <select
            id="sort-listing"
            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-[#002147] focus:outline-none"
          >
            <option>Terbaru</option>
            <option>Harga Terendah</option>
            <option>Harga Tertinggi</option>
          </select>
        </div>
      </div>

      {/* ===== Isi 2 kolom ===== */}
      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_350px] lg:items-start">
        {/* Kolom kiri: listing */}
        <div className="space-y-4">
          {activeTab === "listing" ? (
            MY_LISTINGS.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  <ListingThumb id={item.id} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`rounded border px-2 py-0.5 text-[11px] font-medium ${item.categoryTone}`}>
                        {item.category}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                        {item.id !== "listing-3" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                        )}
                        {item.status}
                      </span>
                    </div>
                    <h2 className="mt-2 text-[15px] font-semibold leading-6 text-slate-900">
                      {item.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                      {item.description}
                    </p>
                    {item.price ? (
                      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <p className="text-[11px] text-slate-400">{item.priceLabel}</p>
                          <p className="text-base font-bold text-slate-900">
                            {item.price}{" "}
                            {item.priceSuffix && (
                              <span className="text-xs font-normal text-slate-400">{item.priceSuffix}</span>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {item.actions.map((action) => (
                            <button
                              key={action}
                              type="button"
                              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]"
                            >
                              {action}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M8 14s4.5-4 4.5-7.5A4.5 4.5 0 0 0 3.5 6.5C3.5 10 8 14 8 14Z" stroke="currentColor" strokeWidth="1.2" />
                            <circle cx="8" cy="6.5" r="1.6" stroke="currentColor" strokeWidth="1.2" />
                          </svg>
                          {item.footerNote}
                        </p>
                        <span className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                          {item.primaryAction}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
              <p className="text-sm font-semibold text-slate-900">
                {activeTab === "riwayat" ? "Riwayat transaksi" : "Ulasan teman kampus"}
              </p>
              <p className="mx-auto mt-1 max-w-[360px] text-xs leading-5 text-slate-500">
                Tab ini memakai data statis untuk preview UI. Isi daftar akan dihubungkan ke API pada
                tahap integrasi backend.
              </p>
            </div>
          )}
        </div>

        {/* Kolom kanan: widget */}
        <aside className="space-y-5">
          {/* Digital KTM */}
          <section aria-labelledby="ktm-heading" className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 id="ktm-heading" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-slate-600">
                  <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="6" cy="7" r="1.6" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M3.5 11.5C3.5 10 4.6 9 6 9s2.5 1 2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M10.5 6.5H12.5M10.5 8.5H12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                Kartu Tanda Mahasiswa
              </h2>
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Digital KTM</span>
            </div>

            <div className="mt-3 overflow-hidden rounded-xl bg-[#002147] p-4 text-white">
              <div className="flex items-start gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#002147]">
                  UPN
                </span>
                <div>
                  <p className="text-[9px] font-semibold uppercase leading-3 tracking-wide text-amber-300">
                    Kementerian Pendidikan dan Kebudayaan
                  </p>
                  <p className="mt-0.5 text-[11px] font-bold leading-4">UPN “VETERAN” YOGYAKARTA</p>
                  <p className="text-[9px] uppercase tracking-widest text-slate-300">Kartu Tanda Mahasiswa</p>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-md bg-slate-200 text-lg font-bold text-[#002147]">
                  AR
                </div>
                <dl className="min-w-0 text-[10px] leading-4">
                  <dt className="uppercase tracking-wide text-slate-400">Nama Lengkap</dt>
                  <dd className="text-xs font-semibold text-white">Alex Rivera</dd>
                  <dt className="mt-1.5 uppercase tracking-wide text-slate-400">Nomor Induk Mahasiswa</dt>
                  <dd className="text-xs font-bold text-amber-300">19482914</dd>
                  <dt className="mt-1.5 uppercase tracking-wide text-slate-400">Program Studi</dt>
                  <dd className="font-medium text-white">S1 Informatika</dd>
                  <dt className="mt-1.5 uppercase tracking-wide text-slate-400">Fakultas</dt>
                  <dd className="font-medium text-white">Ilmu Komputer</dd>
                </dl>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className="flex h-7 items-stretch gap-[2px]" aria-hidden="true">
                    {[3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1, 2, 1, 3, 1].map((w, i) => (
                      <span key={i} className="bg-white" style={{ width: `${w}px` }} />
                    ))}
                  </div>
                  <p className="mt-1 text-[9px] tracking-widest text-slate-300">19482914-2022</p>
                </div>
                <p className="text-right text-[9px] leading-3 text-slate-300">
                  Berlaku s/d
                  <span className="mt-0.5 block text-[10px] font-semibold text-white">Agustus 2026</span>
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 text-xs">
              <p className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M5.5 8.2L7.4 10L10.6 6.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Data terverifikasi SIAKAD
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]"
              >
                Perbarui data
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </section>

          {/* Titik Temu COD */}
          <section aria-labelledby="cod-heading" className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 id="cod-heading" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-slate-600">
                <path d="M8 2L13.5 5.5L8 9L2.5 5.5L8 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M2.5 8L8 11.5L13.5 8M2.5 10.5L8 14L13.5 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
              Titik Temu COD Kampus
            </h2>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">
              Lokasi umum yang biasa digunakan Alex untuk serah terima barang atau mentoring langsung
              di area kampus.
            </p>
            <ul className="mt-3 space-y-2">
              {COD_LOCATIONS.map((loc) => (
                <li
                  key={loc.label}
                  className="flex items-center gap-2.5 rounded-md bg-[#F8F9FB] px-3 py-2.5 text-xs text-slate-700"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-slate-400">
                    <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M5 6h6M5 8.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  {loc.label}
                </li>
              ))}
            </ul>
          </section>

          {/* Ulasan Terbaru */}
          <section aria-labelledby="reviews-heading" className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 id="reviews-heading" className="text-sm font-semibold text-slate-900">Ulasan Terbaru</h2>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 2.5L9.8 6.1L13.7 6.6L10.8 9.3L11.6 13.2L8 11.2L4.4 13.2L5.2 9.3L2.3 6.6L6.2 6.1L8 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
                4.9 (24)
              </span>
            </div>
            <ul className="mt-3 space-y-3">
              {RECENT_REVIEWS.map((review) => (
                <li key={review.author} className="rounded-lg bg-[#F8F9FB] p-3">
                  <blockquote className="text-xs italic leading-5 text-slate-600">
                    “{review.quote}”
                  </blockquote>
                  <p className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="font-medium text-slate-700">{review.author}</span>
                    <span className="text-slate-400">{review.time}</span>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
