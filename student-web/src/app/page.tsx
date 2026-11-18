"use client";

import { useState, useSyncExternalStore } from "react";
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

type PreviewTabId = "marketplace" | "services" | "lostfound" | "events";

interface PreviewItem {
  title: string;
  meta: string;
  tag: string;
  tagClass: string;
  rightText: string;
}

const PREVIEW_TABS: {
  id: PreviewTabId;
  label: string;
  shortLabel: string;
  heading: string;
  subheading: string;
  highlightTitle: string;
  highlightMeta: string;
  highlightNote: string;
  items: PreviewItem[];
}[] = [
  {
    id: "marketplace",
    label: "Marketplace",
    shortLabel: "Marketplace",
    heading: "Katalog Preloved Mahasiswa",
    subheading: "Barang kuliah dan perlengkapan kos langsung dari sesama mahasiswa UPN.",
    highlightTitle: "Transaksi Langsung di Kampus",
    highlightMeta: "Chat 1-on-1 terintegrasi",
    highlightNote:
      "Diskusikan kondisi barang dan tentukan titik temu langsung di lingkungan kampus melalui ruang pesan internal.",
    items: [
      {
        title: "Kalkulus Purcell Edisi 9 (Jilid 1 & 2)",
        meta: "Fakultas Ilmu Komputer · Kondisi Baik",
        tag: "Tersedia",
        tagClass: "bg-[#E4F2EA] text-[#226A46]",
        rightText: "Rp 85.000",
      },
      {
        title: "Jas Lab Kimia Ukuran L — Baru 1 Semester",
        meta: "Fakultas Teknik · Seperti Baru",
        tag: "Tersedia",
        tagClass: "bg-[#E4F2EA] text-[#226A46]",
        rightText: "Rp 60.000",
      },
      {
        title: "Kalkulator Ilmiah Casio FX-991EX",
        meta: "Fakultas Ekonomi & Bisnis · Lengkap Dus",
        tag: "Preloved",
        tagClass: "bg-[#E7EEF9] text-[#35518C]",
        rightText: "Rp 195.000",
      },
    ],
  },
  {
    id: "services",
    label: "Jasa & Layanan",
    shortLabel: "Layanan",
    heading: "Layanan Sebaya Mahasiswa",
    subheading: "Tawarkan keahlian atau temukan bantuan akademik & kreatif terpercaya.",
    highlightTitle: "Portofolio & Ulasan Transparan",
    highlightMeta: "Estimasi waktu & rentang tarif jelas",
    highlightNote:
      "Setiap layanan menampilkan estimasi pengerjaan, metode pembayaran, dan ulasan dari mahasiswa pengguna sebelumnya.",
    items: [
      {
        title: "Desain Poster Acara, Feed IG & Slide Sidang",
        meta: "Estimasi 2 hari · Fakultas Arsitektur & Desain",
        tag: "Aktif",
        tagClass: "bg-[#E4F2EA] text-[#226A46]",
        rightText: "Mulai Rp 35.000",
      },
      {
        title: "Privat Pemrograman Web & Basis Data",
        meta: "Per sesi 90 menit · Fakultas Ilmu Komputer",
        tag: "Populer",
        tagClass: "bg-[#ECEAF9] text-[#53469B]",
        rightText: "Rp 50.000 / sesi",
      },
      {
        title: "Install Ulang Laptop & Maintenance Hardware",
        meta: "Area Rungkut & Sekitar Kampus · Cepat",
        tag: "Aktif",
        tagClass: "bg-[#E4F2EA] text-[#226A46]",
        rightText: "Rp 45.000",
      },
    ],
  },
  {
    id: "lostfound",
    label: "Barang Hilang",
    shortLabel: "Temuan",
    heading: "Papan Kehilangan & Temuan",
    subheading: "Pelaporan cepat barang hilang atau temuan di gedung fakultas dan area umum.",
    highlightTitle: "Bantu Kembali ke Pemiliknya",
    highlightMeta: "Lokasi & foto terverifikasi",
    highlightNote:
      "Lampirkan lokasi terakhir terlihat atau titik penemuan agar pemilik dapat langsung menghubungi lewat chat 1-on-1.",
    items: [
      {
        title: "KTM a.n. Mahasiswa FIK — Ditemukan di Gazebo",
        meta: "Area Gedung FIK · Dilaporkan 2 jam lalu",
        tag: "Ditemukan",
        tagClass: "bg-[#E4F2EA] text-[#226A46]",
        rightText: "Gedung FIK",
      },
      {
        title: "Tumbler Hitam Matte di Ruang Seminar Lt. 2",
        meta: "Gedung Giri Loka · Dilaporkan hari ini",
        tag: "Hilang",
        tagClass: "bg-[#FBEAD8] text-[#8E581A]",
        rightText: "Giri Loka",
      },
      {
        title: "Kunci Motor Honda dengan Gantungan Biru",
        meta: "Parkiran Fakultas Teknik · Pagi ini",
        tag: "Ditemukan",
        tagClass: "bg-[#E4F2EA] text-[#226A46]",
        rightText: "Parkiran FT",
      },
    ],
  },
  {
    id: "events",
    label: "Event & Info",
    shortLabel: "Agenda",
    heading: "Agenda & Pengumuman Kampus",
    subheading: "Jadwal seminar, kompetisi, open recruitment UKM, dan info resmi terkurasi.",
    highlightTitle: "Terkurasi Sebelum Tayang",
    highlightMeta: "Moderasi admin kemahasiswaan",
    highlightNote:
      "Mahasiswa dan organisasi dapat mengajukan publikasi acara dengan poster, daftar pembicara, dan tautan pendaftaran resmi.",
    items: [
      {
        title: "Seminar Nasional Rekayasa Perangkat Lunak 2026",
        meta: "Auditorium Giri Loka · 09.00 WIB",
        tag: "Seminar",
        tagClass: "bg-[#E7EEF9] text-[#35518C]",
        rightText: "Terbuka",
      },
      {
        title: "Open Recruitment Panitia Dies Natalis UPN",
        meta: "Seluruh Fakultas · Pendaftaran Online",
        tag: "UKM",
        tagClass: "bg-[#ECEAF9] text-[#53469B]",
        rightText: "Aktif",
      },
      {
        title: "Workshop Persiapan Proposal PKM & Pendanaan",
        meta: "Ruang Seminar Gedung Kuliah Bersama",
        tag: "Akademik",
        tagClass: "bg-[#E4F2EA] text-[#226A46]",
        rightText: "Gratis",
      },
    ],
  },
];

const CORE_PILLARS = [
  {
    title: "Marketplace Preloved",
    summary:
      "Jual beli buku kuliah, jas praktikum, alat teknik, hingga perabot kos antar sesama mahasiswa dengan filter kategori dan pencarian cepat.",
    points: ["Upload hingga 6 foto produk", "Simpan ke daftar favorit", "Chat 1-on-1 langsung ke penjual"],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
    title: "Jasa & Layanan Mahasiswa",
    summary:
      "Wadah bagi mahasiswa untuk mempromosikan keahlian seperti desain grafis, bimbingan belajar, pengetikan, dan servis perangkat.",
    points: ["Rentang harga & estimasi transparan", "Tautan WhatsApp & Chat internal", "Sistem ulasan terverifikasi"],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
    title: "Barang Hilang & Temuan",
    summary:
      "Pusat informasi kehilangan dan penemuan barang di area kampus agar proses pengembalian berlangsung lebih cepat dan terarah.",
    points: ["Filter khusus Hilang / Ditemukan", "Detail lokasi & kronologi singkat", "Status pembaruan hingga selesai"],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
    title: "Event & Info Kampus",
    summary:
      "Pantau agenda seminar, lomba, kegiatan UKM, serta pengumuman resmi tanpa tertimbun di grup percakapan yang ramai.",
    points: ["Pengajuan event dikurasi admin", "Poster, jadwal, & link pendaftaran", "Notifikasi pengumuman di topbar"],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

const WORKFLOW_STEPS = [
  {
    number: "01",
    title: "Daftar dengan Email Kampus",
    description:
      "Buat akun memakai alamat @student.upnjatim.ac.id, nama lengkap, fakultas, dan NPM 11 digit untuk menjaga ekosistem tetap eksklusif.",
  },
  {
    number: "02",
    title: "Jelajahi atau Publikasikan",
    description:
      "Cari barang kuliah, jasa sebaya, laporan temuan, atau unggah listing dan pengajuan event langsung dari satu portal.",
  },
  {
    number: "03",
    title: "Terhubung Lewat Pesan 1-on-1",
    description:
      "Mulai percakapan 1-on-1 terikat konteks listing untuk menyepakati detail barang, jasa, atau pengembalian temuan dengan nyaman.",
  },
] as const;

const TRUST_POINTS = [
  {
    title: "Eksklusif Sivitas UPN Jatim",
    description:
      "Validasi domain @student.upnjatim.ac.id dan identitas NPM memastikan setiap akun berasal dari lingkungan kampus.",
  },
  {
    title: "Moderasi & Pelaporan Terstruktur",
    description:
      "Setiap konten dapat dilaporkan apabila melanggar ketentuan, dan admin memiliki kendali moderasi serta kurasi pengajuan event.",
  },
  {
    title: "Profil & Digital KTM Terintegrasi",
    description:
      "Kelola profil mahasiswa, riwayat listing, daftar tersimpan, dan ulasan masuk dalam satu halaman profil yang rapi.",
  },
] as const;

const FAQ_ITEMS = [
  {
    question: "Siapa saja yang dapat mendaftar di UPN Student Hub?",
    answer:
      "Portal ini diperuntukkan khusus bagi mahasiswa aktif UPN \"Veteran\" Jawa Timur yang memiliki alamat email institusi @student.upnjatim.ac.id dan NPM 11 digit.",
  },
  {
    question: "Apakah memasang iklan barang atau jasa dikenakan biaya?",
    answer:
      "Tidak. Seluruh fitur publikasi marketplace preloved, penawaran jasa mahasiswa, laporan barang hilang, dan komunikasi 1-on-1 dapat digunakan secara gratis.",
  },
  {
    question: "Bagaimana cara menghubungi penjual atau penemu barang?",
    answer:
      "Pada setiap halaman detail listing terdapat tombol untuk langsung membuka ruang pesan 1-on-1 yang terhubung ke item terkait, sehingga konteks percakapan tetap jelas.",
  },
  {
    question: "Bagaimana mekanisme pengajuan event dari mahasiswa atau UKM?",
    answer:
      "Mahasiswa dapat mengisi formulir pengajuan event beserta poster dan informasi acara. Pengajuan akan masuk berstatus menunggu peninjauan dan tayang ke publik setelah disetujui admin.",
  },
] as const;

export default function HomePage() {
  const hasSession = useSyncExternalStore(
    subscribeNoop,
    getClientHasSession,
    getServerHasSession
  );
  const [activePreview, setActivePreview] = useState<PreviewTabId>("marketplace");
  const [openFaq, setOpenFaq] = useState<number>(0);

  const activePreviewIndex = PREVIEW_TABS.findIndex((t) => t.id === activePreview);
  const currentPreview = PREVIEW_TABS[activePreviewIndex] ?? PREVIEW_TABS[0];

  return (
    <div className="min-h-screen bg-[#F4F1EE] text-[#141416] selection:bg-[#141416] selection:text-white">
      {/* Sticky Minimal Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-[#E5E0DA]/80 bg-[#F4F1EE]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 text-sm font-semibold tracking-tight text-[#141416]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#141416] text-white transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M8 1.5L9.8 6.2L14.5 8L9.8 9.8L8 14.5L6.2 9.8L1.5 8L6.2 6.2L8 1.5Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span className="font-display">UPN Student Hub</span>
          </Link>

          <nav
            aria-label="Navigasi halaman utama"
            className="hidden items-center gap-7 text-[13px] font-medium text-[#6E6A66] md:flex"
          >
            <a href="#pratinjau" className="transition-colors hover:text-[#141416]">
              Pratinjau
            </a>
            <a href="#layanan" className="transition-colors hover:text-[#141416]">
              Layanan
            </a>
            <a href="#cara-kerja" className="transition-colors hover:text-[#141416]">
              Cara Kerja
            </a>
            <a href="#faq" className="transition-colors hover:text-[#141416]">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2">
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
                  className="inline-flex h-9 items-center justify-center rounded-full px-3.5 text-xs font-medium text-[#3F3D3A] transition-colors hover:bg-[#EAE6E2] hover:text-[#141416]"
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
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="mx-auto max-w-[1120px] px-4 pt-14 pb-12 sm:px-6 sm:pt-20 sm:pb-16 lg:px-8">
          <div className="auth-shell-enter mx-auto max-w-[760px] text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E2DDD7] bg-white px-3.5 py-1.5 text-xs font-medium text-[#57534E] shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[#141416]" aria-hidden="true" />
              <span>Portal Resmi Mahasiswa · UPN &ldquo;Veteran&rdquo; Jawa Timur</span>
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-[1.12] tracking-[-0.03em] text-[#141416] sm:text-5xl lg:text-[56px]">
              Satu ruang digital yang rapi untuk seluruh aktivitas kampus.
            </h1>

            <p className="mx-auto mt-5 max-w-[600px] text-[15px] leading-relaxed text-[#6E6A66] sm:text-base">
              Jual beli perlengkapan kuliah, tawarkan jasa sebaya, laporkan barang hilang,
              hingga pantau agenda resmi UPN — eksklusif menggunakan akun{" "}
              <code className="rounded-md bg-[#EAE6E2] px-1.5 py-0.5 text-[13px] font-medium text-[#141416]">
                @student.upnjatim.ac.id
              </code>
              .
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {hasSession ? (
                <Link
                  href="/dashboard"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#141416] px-7 text-sm font-medium text-white transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#242428] hover:shadow-[0_14px_28px_-12px_rgba(20,20,22,0.42)] active:translate-y-0 active:scale-[0.99]"
                >
                  Lanjut ke Beranda →
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="inline-flex h-12 items-center justify-center rounded-full bg-[#141416] px-7 text-sm font-medium text-white transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#242428] hover:shadow-[0_14px_28px_-12px_rgba(20,20,22,0.42)] active:translate-y-0 active:scale-[0.99]"
                  >
                    Daftar Akun Mahasiswa
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-[#DFD9D2] bg-white px-7 text-sm font-medium text-[#141416] transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:border-[#CFC8BF] hover:bg-[#FAF8F6] active:translate-y-0 active:scale-[0.99]"
                  >
                    Masuk ke Portal
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Interactive Warm-Alabaster Workspace Preview */}
          <div
            id="pratinjau"
            className="auth-shell-enter mt-12 scroll-mt-24 rounded-[28px] border border-[#E4DFDA] bg-[#EAE6E2] p-3 shadow-[0_32px_70px_-36px_rgba(20,20,22,0.22)] sm:mt-16 sm:p-4"
          >
            <div className="rounded-[22px] border border-[#E7E2DD] bg-[#F4F1EE] p-4 sm:p-6">
              {/* Preview Topbar */}
              <div className="flex flex-col justify-between gap-4 border-b border-[#E6E1DC] pb-5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#141416] text-white">
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="M8 1.5L9.8 6.2L14.5 8L9.8 9.8L8 14.5L6.2 9.8L1.5 8L6.2 6.2L8 1.5Z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  <span className="text-xs font-semibold text-[#141416]">
                    Pratinjau Workspace
                  </span>
                  <span className="hidden text-xs text-[#8C8782] sm:inline">
                    · Pilih modul untuk melihat contoh tampilan
                  </span>
                </div>

                {/* Sliding Tab Switcher */}
                <div
                  role="tablist"
                  aria-label="Pilih pratinjau modul"
                  className="relative grid grid-cols-2 gap-1 rounded-2xl bg-[#E8E4DF] p-1 sm:inline-grid sm:grid-cols-4 sm:gap-0 sm:rounded-full"
                >
                  <span
                    aria-hidden="true"
                    style={{
                      transform: `translateX(${activePreviewIndex * 100}%)`,
                    }}
                    className="pointer-events-none hidden sm:block absolute top-1 bottom-1 left-1 w-[calc(25%-2px)] rounded-full bg-white shadow-[0_2px_10px_-2px_rgba(20,20,22,0.12)] transition-transform duration-380 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  />
                  {PREVIEW_TABS.map((tab) => {
                    const selected = tab.id === activePreview;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => setActivePreview(tab.id)}
                        className={`relative z-10 rounded-xl px-3.5 py-1.5 text-center text-xs font-medium transition-colors duration-250 sm:min-w-[104px] sm:rounded-full ${
                          selected
                            ? "bg-white text-[#141416] shadow-2xs sm:bg-transparent sm:shadow-none"
                            : "text-[#6E6A66] hover:text-[#141416]"
                        }`}
                      >
                        {tab.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview Body */}
              <div
                key={currentPreview.id}
                className="auth-panel-slide-right mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_0.65fr]"
              >
                {/* List Card */}
                <div className="rounded-2xl border border-[#E7E2DD] bg-white p-5">
                  <div className="flex items-start justify-between gap-4 border-b border-[#F2EEEA] pb-4">
                    <div>
                      <h2 className="text-base font-semibold tracking-tight text-[#141416]">
                        {currentPreview.heading}
                      </h2>
                      <p className="mt-0.5 text-xs text-[#787470]">
                        {currentPreview.subheading}
                      </p>
                    </div>
                    <Link
                      href={hasSession ? "/dashboard" : "/login"}
                      className="shrink-0 rounded-full bg-[#141416] px-3.5 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-[#27272A]"
                    >
                      Lihat Semua
                    </Link>
                  </div>

                  <ul className="divide-y divide-[#F3EFEA]">
                    {currentPreview.items.map((item) => (
                      <li
                        key={item.title}
                        className="flex flex-col justify-between gap-2 py-3.5 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-[#141416]">
                            {item.title}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-[#85817C]">
                            {item.meta}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${item.tagClass}`}
                          >
                            {item.tag}
                          </span>
                          <span className="min-w-[84px] text-right text-xs font-semibold text-[#141416]">
                            {item.rightText}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Companion Info Card */}
                <div className="flex flex-col justify-between rounded-2xl border border-[#E7E2DD] bg-white p-5">
                  <div>
                    <p className="text-[11px] font-medium text-[#85817C]">
                      Sorotan Fitur
                    </p>
                    <h3 className="mt-1.5 text-base font-semibold tracking-tight text-[#141416]">
                      {currentPreview.highlightTitle}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-[#57534E]">
                      {currentPreview.highlightMeta}
                    </p>
                    <p className="mt-3 text-xs leading-relaxed text-[#6E6A66]">
                      {currentPreview.highlightNote}
                    </p>
                  </div>

                  <div className="mt-6 rounded-xl bg-[#F6F4F1] p-3.5">
                    <p className="text-[11px] font-medium text-[#787470]">
                      Akses Cepat Portal
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-[#141416]">
                        {currentPreview.label}
                      </span>
                      <Link
                        href={hasSession ? "/dashboard" : "/register"}
                        className="text-xs font-semibold text-[#141416] underline-offset-4 hover:underline"
                      >
                        {hasSession ? "Buka →" : "Coba Sekarang →"}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Services Bento Section */}
        <section
          id="layanan"
          className="mx-auto max-w-[1120px] scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
        >
          <div className="max-w-xl">
            <p className="text-xs font-medium text-[#787470]">Empat Pilar Utama</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#141416] sm:text-[32px] sm:leading-[1.2]">
              Dirancang khusus mengikuti ritme keseharian mahasiswa.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#6E6A66]">
              Tidak perlu berpindah antar grup atau platform berbeda — semua kebutuhan
              kampus tersusun rapi dalam satu ekosistem.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
            {CORE_PILLARS.map((pillar) => (
              <article
                key={pillar.title}
                className="group flex flex-col justify-between rounded-[24px] border border-[#E7E2DD] bg-white p-6 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-[#D5CEC6] hover:shadow-[0_18px_36px_-22px_rgba(20,20,22,0.18)] sm:p-7"
              >
                <div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4F1EE] text-[#141416] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 group-hover:bg-[#141416] group-hover:text-white">
                    {pillar.icon}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight text-[#141416]">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6E6A66]">
                    {pillar.summary}
                  </p>
                </div>

                <ul className="mt-6 space-y-2 border-t border-[#F2EEEA] pt-5">
                  {pillar.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-center gap-2.5 text-xs text-[#57534E]"
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#141416]"
                        aria-hidden="true"
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* How It Works Band */}
        <section
          id="cara-kerja"
          className="mx-auto max-w-[1120px] scroll-mt-20 px-4 py-8 sm:px-6 lg:px-8"
        >
          <div className="rounded-[28px] border border-[#E4DFDA] bg-[#ECE8E4] px-6 py-12 sm:px-10 sm:py-16">
            <div className="max-w-xl">
              <p className="text-xs font-medium text-[#787470]">Cara Kerja</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#141416] sm:text-[32px] sm:leading-[1.2]">
                Tiga langkah sederhana untuk mulai terhubung.
              </h2>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
              {WORKFLOW_STEPS.map((step) => (
                <div
                  key={step.number}
                  className="rounded-2xl border border-[#E5E0DA] bg-white p-6 shadow-[0_8px_20px_-14px_rgba(20,20,22,0.1)]"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#F4F1EE] font-display text-xs font-semibold text-[#141416]">
                    {step.number}
                  </span>
                  <h3 className="mt-5 text-base font-semibold tracking-tight text-[#141416]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#6E6A66]">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust & Interactive FAQ Section */}
        <section
          id="faq"
          className="mx-auto max-w-[1120px] scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
        >
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
            {/* Left Trust Column */}
            <div>
              <p className="text-xs font-medium text-[#787470]">
                Keamanan &amp; Pertanyaan Umum
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#141416] sm:text-[30px] sm:leading-[1.22]">
                Dibangun untuk rasa aman di lingkungan kampus.
              </h2>

              <div className="mt-8 space-y-5">
                {TRUST_POINTS.map((item) => (
                  <div
                    key={item.title}
                    className="border-l-2 border-[#DDD6CE] pl-4"
                  >
                    <h3 className="text-sm font-semibold text-[#141416]">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#6E6A66]">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Accordion FAQ */}
            <div className="space-y-3">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={item.question}
                    className="rounded-2xl border border-[#E7E2DD] bg-white transition-colors hover:border-[#D6CFC7]"
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <span className="font-display text-sm font-semibold text-[#141416]">
                        {item.question}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F4F1EE] text-[#141416] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          isOpen ? "rotate-45 bg-[#141416] text-white" : ""
                        }`}
                      >
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M8 3v10M3 8h10"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                    </button>

                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isOpen
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="px-5 pb-4 text-xs leading-relaxed text-[#6E6A66]">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Closing Obsidian CTA Band */}
        <section className="mx-auto max-w-[1120px] px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
          <div className="rounded-[28px] bg-[#141416] px-6 py-12 text-center text-white sm:px-12 sm:py-16">
            <p className="text-xs font-medium text-[#A8A39E]">
              UPN &ldquo;Veteran&rdquo; Jawa Timur
            </p>
            <h2 className="mx-auto mt-3 max-w-xl text-2xl font-semibold tracking-tight sm:text-4xl sm:leading-[1.15]">
              Mulai gunakan ruang kampus Anda yang lebih rapi hari ini.
            </h2>
            <p className="mx-auto mt-3.5 max-w-md text-sm leading-relaxed text-[#B8B4AF]">
              Daftar dalam kurang dari satu menit dengan email mahasiswa resmi Anda.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {hasSession ? (
                <Link
                  href="/dashboard"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-medium text-[#141416] transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#F4F1EE]"
                >
                  Buka Beranda →
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="inline-flex h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-medium text-[#141416] transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#F4F1EE]"
                  >
                    Buat Akun Mahasiswa
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-7 text-sm font-medium text-white transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:border-white/40 hover:bg-white/5"
                  >
                    Masuk ke Akun
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Clean Multi-Column Footer */}
      <footer className="border-t border-[#E5E0DA] bg-[#EFECE8]">
        <div className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-2.5 text-sm font-semibold tracking-tight text-[#141416]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#141416] text-white">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M8 1.5L9.8 6.2L14.5 8L9.8 9.8L8 14.5L6.2 9.8L1.5 8L6.2 6.2L8 1.5Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                <span className="font-display">UPN Student Hub</span>
              </Link>
              <p className="mt-3 max-w-xs text-xs leading-relaxed text-[#6E6A66]">
                Portal ekosistem mahasiswa UPN &ldquo;Veteran&rdquo; Jawa Timur untuk
                marketplace preloved, layanan sebaya, barang hilang, dan informasi kampus.
              </p>
            </div>

            <div>
              <p className="font-display text-xs font-semibold text-[#141416]">
                Navigasi
              </p>
              <ul className="mt-3 space-y-2 text-xs text-[#6E6A66]">
                <li>
                  <a href="#pratinjau" className="transition-colors hover:text-[#141416]">
                    Pratinjau Portal
                  </a>
                </li>
                <li>
                  <a href="#layanan" className="transition-colors hover:text-[#141416]">
                    Layanan Utama
                  </a>
                </li>
                <li>
                  <a href="#cara-kerja" className="transition-colors hover:text-[#141416]">
                    Cara Kerja
                  </a>
                </li>
                <li>
                  <a href="#faq" className="transition-colors hover:text-[#141416]">
                    Pertanyaan Umum
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-display text-xs font-semibold text-[#141416]">
                Akses Portal
              </p>
              <ul className="mt-3 space-y-2 text-xs text-[#6E6A66]">
                <li>
                  <Link href="/login" className="transition-colors hover:text-[#141416]">
                    Masuk Mahasiswa
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="transition-colors hover:text-[#141416]">
                    Daftar Akun Baru
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="transition-colors hover:text-[#141416]">
                    Beranda Portal
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-[#E2DDD7] pt-6 text-xs text-[#787470] sm:flex-row">
            <p>© 2026 UPN Student Hub — UPN &ldquo;Veteran&rdquo; Jawa Timur.</p>
            <p>Khusus komunitas sivitas akademika terdaftar.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
