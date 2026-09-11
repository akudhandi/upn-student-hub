// PHASE 2.10 — Kost Detail UI (Frontend only, static mock).
// Production data will come from GET /api/v1/kost/:id with the same shape.

type KostImage = {
  label: string;
  tone: string;
  caption?: string;
};

type KeyFeature = {
  eyebrow: string;
  value: string;
  icon: "bath" | "snow" | "bolt" | "size";
};

type DistanceItem = {
  place: string;
  distance: string;
  note: string;
};

type Review = {
  name: string;
  meta: string;
  rating: number;
  text: string;
};

const KOST_DETAIL = {
  id: "mawar-putih",
  breadcrumb: ["Beranda", "Kost Sekitar UPN", "Kost Mawar Putih"],
  badges: [
    { label: "Campur (Gedung & Akses Terpisah)", tone: "green" as const },
    { label: "5 menit ke Kampus UPN Condongcatur", tone: "blue" as const },
  ],
  title: "Kost Mawar Putih (Tipe Kamar AC & Kamar Mandi Dalam)",
  address:
    "Jl. Delima No. 14, Condongcatur, Sleman (Belakang Kampus 1 UPN Veteran Yogyakarta)",
  images: [
    { label: "Kamar Tidur Utama", tone: "#E7ECF2", caption: "Kamar Tidur Utama (3×4 m) dengan Meja Belajar" },
    { label: "Kamar", tone: "#EFE9DF" },
    { label: "K. Mandi", tone: "#E8F0E9" },
    { label: "Meja Belajar", tone: "#E9EAF3" },
    { label: "Dapur", tone: "#F0E8E4" },
  ] as KostImage[],
  keyFeatures: [
    { eyebrow: "Fasilitas Utama", value: "K. Mandi Dalam", icon: "bath" },
    { eyebrow: "Pendingin & Net", value: "AC & WiFi Cepat", icon: "snow" },
    { eyebrow: "Sistem Listrik", value: "Token Mandiri", icon: "bolt" },
    { eyebrow: "Luas Kamar", value: "Ukuran 3 × 4 m", icon: "size" },
  ] as KeyFeature[],
  description: [
    "Kost Mawar Putih dirancang khusus untuk mahasiswa dan mahasiswi yang menginginkan suasana hunian tenang, bersih, dan nyaman di sekitar kampus UPN Condongcatur. Lokasi sangat strategis, hanya 5 menit jalan kaki santai ke Gerbang Timur UPN Veteran Yogyakarta sehingga hemat ongkos bensin dan tidak perlu repot cari parkir motor saat kuliah pagi.",
    "Lingkungan kost sangat kondusif untuk istirahat malam dan fokus belajar skripsi atau tugas kuliah. Antara lantai putra dan putri memiliki koridor tangga dan pintu akses yang terpisah. Bapak dan Ibu kost tinggal tepat di depan paviliun sehingga bantuan teknis serta keamanan lingkungan selalu terpantau dengan baik.",
  ],
  roomFacilities: [
    "Kasur Springbed single (100×200) + Bantal",
    "AC Daikin 1/2 PK (dingin & hemat listrik)",
    "Meja belajar luas & kursi busa sandaran",
    "Lemari pakaian 2 pintu + cermin",
    "Kamar mandi dalam (Kloset duduk, shower & ember)",
    "Jendela luar dengan sirkulasi udara & gorden",
  ],
  sharedFacilities: [
    "WiFi Indihome fiber 100 Mbps (router tiap lantai)",
    "Dapur bersama: kompor gas, wastafel & kulkas 2 pintu",
    "Dispenser air minum galon gratis isi ulang",
    "Parkiran motor luas & beratap (bebas hujan)",
    "CCTV 24 Jam di koridor & pintu gerbang",
    "Akses kunci pagar mandiri 24 jam",
  ],
  distances: [
    {
      place: "Gerbang Utama UPN",
      distance: "400 meter",
      note: "Sekitar 5 menit jalan kaki",
    },
    {
      place: "Fakultas Teknik Industri (FTI)",
      distance: "500 meter",
      note: "Sekitar 6 menit jalan santai",
    },
    {
      place: "Indomaret & ATM Center",
      distance: "150 meter",
      note: "2 menit jalan kaki keluar gang",
    },
  ] as DistanceItem[],
  mapArea: "Condongcatur, Depok, Sleman",
  mapAddress: "Jl. Delima No. 14, Condongcatur",
  ratingSummary: { score: "4.8", count: "(10 ulasan)" },
  reviews: [
    {
      name: "Dimas Hendarto",
      meta: "Teknik Informatika '22",
      rating: 5,
      text: "\u201CWiFinya kenceng banget, sangat membantu buat saya yang sering ngerjain project koding sampai malam. Ke kampus FTI cuma jalan kaki gak sampai 7 menit. Pak Bambang juga ramah banget kalau ada lampu kamar putus langsung dibantuin ganti.\u201D",
    },
    {
      name: "Salma Azzahra",
      meta: "Hubungan Internasional '21",
      rating: 5,
      text: "\u201CKamarnya bersih pas serah terima kunci. Ventilasi jendelanya dapat sinar matahari pagi jadi gak pengap sama sekali. Suasananya tenang, cocok buat yang butuh ketenangan nyusun skripsi.\u201D",
    },
  ] as Review[],
  price: { amount: "Rp 1.500.000", per: "/ bulan", note: "Sudah termasuk air & WiFi (listrik token per kamar)" },
  availability: "Tersedia 2 Kamar Siap Huni",
  owner: { initials: "PB", name: "Pak Bambang", role: "Pemilik Kost (Tinggal Dekat Kost)" },
  disclaimers: ["Bebas biaya administrasi atau perantara", "Bisa bayar per 3 bulan atau per tahun"],
};

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-green-700">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5.5 8.2L7.3 10L10.6 6.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarRow({ rating, label }: { rating: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width="11"
          height="11"
          viewBox="0 0 16 16"
          aria-hidden="true"
          fill={i < rating ? "currentColor" : "none"}
          className={i < rating ? "text-amber-500" : "text-slate-300"}
        >
          <path
            d="M8 1.5L9.7 5.9H14.2L10.5 8.6L11.5 13.1L8 10.6L4.5 13.1L5.5 8.6L1.8 5.9H6.3L8 1.5Z"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}

function KeyFeatureIcon({ icon }: { icon: KeyFeature["icon"] }) {
  const cls = "text-slate-600";
  if (icon === "bath") {
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={cls}>
        <path d="M4 3H12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M5.5 3V4.5C5.5 5.5 6.5 6 8 6C9.5 6 10.5 5.5 10.5 4.5V3" stroke="currentColor" strokeWidth="1.2" />
        <path d="M4.5 8.5H11.5V12.5C11.5 13 11 13.5 10.5 13.5H5.5C5 13.5 4.5 13 4.5 12.5V8.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    );
  }
  if (icon === "snow") {
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-blue-600">
        <path d="M8 2V14M3 5L13 11M13 5L3 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  if (icon === "bolt") {
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-amber-600">
        <path d="M9 1.5L3.5 9H7.5L6.8 14.5L12.5 6.5H8.5L9 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-indigo-600">
      <rect x="2.5" y="2.5" width="11" height="11" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2.5 6H13.5M6 2.5V13.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function GalleryPlaceholder({ label, tone, large }: { label: string; tone: string; large?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center ${large ? "aspect-[16/9]" : "aspect-[4/3]"}`}
      style={{ backgroundColor: tone }}
      role="img"
      aria-label={`Foto ${label} Kost Mawar Putih`}
    >
      <svg
        width={large ? "56" : "32"}
        height={large ? "56" : "32"}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="text-slate-500/70"
      >
        <rect x="3" y="7" width="18" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M3 11H21" stroke="currentColor" strokeWidth="1.3" />
        <path d="M6 7V5.5C6 4.7 6.7 4 7.5 4H11V7" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M5 17V18.5M19 17V18.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <rect x="14.5" y="12.5" width="4" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.1" />
      </svg>
    </div>
  );
}

function PricingCard() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <p className="text-xs text-slate-500">Harga Sewa Kamar</p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="text-[22px] font-bold tracking-tight text-slate-900">{KOST_DETAIL.price.amount}</span>
        <span className="text-xs font-medium text-slate-500">{KOST_DETAIL.price.per}</span>
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{KOST_DETAIL.price.note}</p>

      <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-800 ring-1 ring-inset ring-green-200">
        <span className="h-1.5 w-1.5 rounded-full bg-green-600" aria-hidden="true" />
        {KOST_DETAIL.availability}
      </p>

      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#002147] text-xs font-bold text-white" aria-hidden="true">
          {KOST_DETAIL.owner.initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-900">{KOST_DETAIL.owner.name}</span>
          <span className="block truncate text-xs text-slate-500">{KOST_DETAIL.owner.role}</span>
        </span>
      </div>

      <div className="mt-4 space-y-2.5">
        <a
          href="#kontak-pemilik"
          className="flex w-full items-center justify-center gap-2 rounded-md bg-[#16a34a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 1.8C4.7 1.8 2 4.4 2 7.6C2 8.9 2.5 10 3.2 11L2.5 14L5.6 13.3C6.3 13.7 7.1 13.9 8 13.9C11.3 13.9 14 11.3 14 8C14 4.7 11.3 1.8 8 1.8Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M6.2 5.4C6 5.4 5.8 5.6 5.8 6C5.8 7.7 7.1 9.5 8.9 10.2C9.3 10.4 9.6 10.2 9.7 9.9L10 9.2L8.9 8.6L8.5 9C7.7 8.6 7 8 6.7 7.3L7.1 6.9L6.7 5.9L6.2 5.4Z" fill="currentColor" />
          </svg>
          Hubungi via WhatsApp
        </a>
        <a
          href="#survei"
          className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-slate-500">
            <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M2 6.5H14M5.5 1.8V3.5M10.5 1.8V3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M5.5 9.5L7 11L10.5 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Jadwalkan Survei Lokasi
        </a>
      </div>

      <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-4">
        {KOST_DETAIL.disclaimers.map((item) => (
          <li key={item} className="flex items-start gap-1.5 text-[11px] leading-4 text-slate-500">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-green-700">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M5.5 8.2L7.3 10L10.6 6.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function KostDetailPage() {
  const [mainImage, ...thumbnails] = KOST_DETAIL.images;

  return (
    <div className="mx-auto max-w-[1180px]">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          {KOST_DETAIL.breadcrumb.map((crumb, i) => {
            const isLast = i === KOST_DETAIL.breadcrumb.length - 1;
            return (
              <li key={crumb} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span aria-hidden="true" className="text-slate-300">
                    /
                  </span>
                )}
                {isLast ? (
                  <span aria-current="page" className="font-medium text-slate-700">
                    {crumb}
                  </span>
                ) : (
                  <a href={i === 0 ? "/dashboard" : "/kost"} className="hover:text-slate-800 hover:underline">
                    {crumb}
                  </a>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Title + actions */}
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            {KOST_DETAIL.badges.map((badge) => (
              <span
                key={badge.label}
                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium ring-1 ring-inset ${
                  badge.tone === "green"
                    ? "bg-green-50 text-green-800 ring-green-200"
                    : "bg-blue-50 text-blue-800 ring-blue-200"
                }`}
              >
                {badge.tone === "green" ? (
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M2 7L8 2L14 7V13H10V9.5H6V13H2V7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M8 14C8 14 3.5 9.3 3.5 6C3.5 3.5 5.5 1.5 8 1.5C10.5 1.5 12.5 3.5 12.5 6C12.5 9.3 8 14 8 14Z" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="8" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                )}
                {badge.label}
              </span>
            ))}
          </div>
          <h1 className="mt-2 text-[22px] font-bold leading-7 tracking-tight text-[#002147] sm:text-2xl sm:leading-8">
            {KOST_DETAIL.title}
          </h1>
          <p className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-5 text-slate-500">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-green-700">
              <path d="M8 14C8 14 3.5 9.3 3.5 6C3.5 3.5 5.5 1.5 8 1.5C10.5 1.5 12.5 3.5 12.5 6C12.5 9.3 8 14 8 14Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              <circle cx="8" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            {KOST_DETAIL.address}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 13.2L3.4 8.9C2.1 7.7 2.1 5.7 3.4 4.4C4.6 3.1 6.5 3.1 7.7 4.4L8 4.7L8.3 4.4C9.5 3.1 11.4 3.1 12.6 4.4C13.9 5.7 13.9 7.7 12.6 8.9L8 13.2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
            Simpan
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="12" cy="3.5" r="1.8" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="4" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="12" cy="12.5" r="1.8" stroke="currentColor" strokeWidth="1.2" />
              <path d="M5.6 7.1L10.4 4.3M5.6 8.9L10.4 11.7" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            Bagikan
          </button>
        </div>
      </div>

      {/* Main 2-column layout. Pricing sits below gallery on mobile via order. */}
      <div className="mt-5 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_350px] lg:gap-8">
        {/* Gallery + key features */}
        <section aria-label="Galeri foto kost" className="order-1 min-w-0 lg:col-start-1 lg:row-start-1">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="relative">
              <GalleryPlaceholder label={mainImage.label} tone={mainImage.tone} large />
              {mainImage.caption && (
                <p className="absolute bottom-3 left-3 rounded bg-slate-900/85 px-2.5 py-1 text-[11px] font-medium text-white">
                  {mainImage.caption}
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {thumbnails.map((img) => (
              <figure key={img.label} className="overflow-hidden rounded-md border border-gray-200 bg-white">
                <GalleryPlaceholder label={img.label} tone={img.tone} />
                <figcaption className="border-t border-gray-100 bg-slate-900/85 px-1 py-1 text-center text-[10px] font-medium text-white">
                  {img.label}
                </figcaption>
              </figure>
            ))}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {KOST_DETAIL.keyFeatures.map((feature) => (
              <div key={feature.value} className="flex flex-col rounded-lg border border-gray-200 bg-white p-3 text-center">
                <dt className="order-2 mt-2 text-[13px] font-bold leading-4 text-slate-900">
                  <span className="mb-1 block text-[10px] font-medium leading-3 text-slate-500">{feature.eyebrow}</span>
                  {feature.value}
                </dt>
                <dd className="order-1 flex justify-center" aria-hidden="true">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-50 ring-1 ring-inset ring-slate-100">
                    <KeyFeatureIcon icon={feature.icon} />
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Sticky pricing card */}
        <aside aria-label="Harga sewa dan kontak pemilik" className="order-2 min-w-0 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <PricingCard />
        </aside>

        {/* Remaining detail sections */}
        <div className="order-3 min-w-0 space-y-6 lg:col-start-1 lg:row-start-2">
          <section aria-labelledby="deskripsi-kost" className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
            <h2 id="deskripsi-kost" className="text-[15px] font-bold text-[#002147]">
              Deskripsi Kost
            </h2>
            <div className="mt-3 space-y-3">
              {KOST_DETAIL.description.map((paragraph, i) => (
                <p key={i} className="text-[13px] leading-6 text-slate-600">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>

          <section aria-labelledby="fasilitas-kost" className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
            <h2 id="fasilitas-kost" className="text-[15px] font-bold text-[#002147]">
              Fasilitas yang Didapat
            </h2>
            <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Fasilitas Kamar
            </h3>
            <ul className="mt-2.5 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {KOST_DETAIL.roomFacilities.map((facility) => (
                <li key={facility} className="flex items-start gap-2 text-[13px] leading-5 text-slate-700">
                  <CheckIcon />
                  {facility}
                </li>
              ))}
            </ul>
            <h3 className="mt-5 border-t border-slate-100 pt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Fasilitas Bersama &amp; Gedung
            </h3>
            <ul className="mt-2.5 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {KOST_DETAIL.sharedFacilities.map((facility) => (
                <li key={facility} className="flex items-start gap-2 text-[13px] leading-5 text-slate-700">
                  <CheckIcon />
                  {facility}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="jarak-kost" className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="jarak-kost" className="text-[15px] font-bold text-[#002147]">
                Jarak ke Kampus &amp; Fasilitas Umum
              </h2>
              <p className="hidden shrink-0 text-[11px] text-slate-400 sm:block">{KOST_DETAIL.mapArea}</p>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {KOST_DETAIL.distances.map((item) => (
                <div key={item.place} className="rounded-md border border-slate-100 bg-slate-50 p-3">
                  <p className="flex items-start gap-1.5 text-[11px] font-medium leading-4 text-slate-600">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-green-700">
                      <path d="M8 14C8 14 3.5 9.3 3.5 6C3.5 3.5 5.5 1.5 8 1.5C10.5 1.5 12.5 3.5 12.5 6C12.5 9.3 8 14 8 14Z" stroke="currentColor" strokeWidth="1.2" />
                      <circle cx="8" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                    {item.place}
                  </p>
                  <p className="mt-1.5 text-[15px] font-bold text-slate-900">{item.distance}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{item.note}</p>
                </div>
              ))}
            </div>
            {/* Map placeholder: production uses Leaflet.js + OpenStreetMap. */}
            <div
              className="relative mt-4 flex aspect-[21/9] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-[#E5E7EB]"
              role="img"
              aria-label={`Peta lokasi ${KOST_DETAIL.mapAddress}`}
            >
              <span className="flex flex-col items-center gap-2 text-slate-500">
                <svg width="28" height="28" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M5.5 3L2 4.5V13L5.5 11.5L10.5 13L14 11.5V3L10.5 4.5L5.5 3Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  <path d="M5.5 3V11.5M10.5 4.5V13" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                <span className="text-xs font-semibold">Peta Lokasi</span>
              </span>
              <span className="absolute bottom-3 left-3 rounded bg-slate-900/80 px-2 py-1 text-[11px] font-medium text-white">
                {KOST_DETAIL.mapAddress}
              </span>
              <span className="absolute bottom-3 right-3 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700">
                Buka Peta
              </span>
            </div>
          </section>

          <section aria-labelledby="ulasan-kost" className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="ulasan-kost" className="text-[15px] font-bold text-[#002147]">
                  Ulasan Teman Mahasiswa
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Penilaian dari mahasiswa UPN yang pernah/sedang tinggal di sini
                </p>
              </div>
              <p className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-slate-900 ring-1 ring-inset ring-amber-200">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="text-amber-500">
                  <path d="M8 1.5L9.7 5.9H14.2L10.5 8.6L11.5 13.1L8 10.6L4.5 13.1L5.5 8.6L1.8 5.9H6.3L8 1.5Z" />
                </svg>
                {KOST_DETAIL.ratingSummary.score}
                <span className="font-medium text-slate-500">{KOST_DETAIL.ratingSummary.count}</span>
              </p>
            </div>
            <ul className="mt-4 divide-y divide-slate-100">
              {KOST_DETAIL.reviews.map((review) => (
                <li key={review.name} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[13px] font-semibold text-slate-900">
                      {review.name}
                      <span className="ml-2 text-[11px] font-normal text-slate-400">• {review.meta}</span>
                    </p>
                    <StarRow rating={review.rating} label={`${review.rating} dari 5 bintang oleh ${review.name}`} />
                  </div>
                  <p className="mt-1.5 text-[13px] leading-6 text-slate-600">{review.text}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
