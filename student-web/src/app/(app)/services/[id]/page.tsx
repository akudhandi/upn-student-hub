"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch, type ApiError } from "@/lib/api";

// ---------------------------------------------------------------------------
// API types — shape of GET /api/v1/services/{id} (standard { message, data }
// JSON envelope, detail of a single service listing).
// ---------------------------------------------------------------------------
type ApiServiceDetail = {
  id: number;
  title: string;
  description: string | null;
  price_min: number | string;
  price_max: number | string | null;
  pricing_type?: string | null;
  estimated_time?: string | null;
  payment_method?: string | null;
  whatsapp_number?: string | null;
  target_faculties?: string[] | null;
  status: string;
  created_at: string;
  user?: { id: number; name: string } | null;
  category?: { id: number; name: string; slug: string } | null;
};

type ServiceDetailResponse = {
  message: string;
  data: ApiServiceDetail;
};

type ServiceListResponse = {
  message: string;
  data: {
    current_page: number;
    last_page: number;
    total: number;
    data: ApiServiceDetail[];
  };
};

const PRICING_TYPE_LABELS: Record<string, string> = {
  fixed: "Tarif Tetap",
  per_hour: "Per Jam",
  starting_from: "Mulai dari",
  negotiable: "Negosiasi",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  dp: "DP (Uang Muka)",
  full: "Bayar Lunas Selesai",
  flexible: "Fleksibel",
};

function formatRupiah(value: number | string): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function hasPriceRange(min: number | string, max: number | string | null): boolean {
  return (
    max !== null &&
    max !== undefined &&
    max !== "" &&
    Number(max) > 0 &&
    Number(max) !== Number(min)
  );
}

function formatPriceRange(min: number | string, max: number | string | null): string {
  if (!hasPriceRange(min, max)) {
    return formatRupiah(min);
  }
  return `${formatRupiah(min)} – ${formatRupiah(max as number | string)}`;
}

function pricingModelLabel(item: ApiServiceDetail): string {
  if (item.pricing_type && PRICING_TYPE_LABELS[item.pricing_type]) {
    return PRICING_TYPE_LABELS[item.pricing_type];
  }
  return hasPriceRange(item.price_min, item.price_max) ? "Mulai dari" : "Tarif Tetap";
}

function priceHeadline(item: ApiServiceDetail): { amount: string; suffix: string } {
  if (item.pricing_type === "per_hour") {
    return { amount: formatRupiah(item.price_min), suffix: "/ jam" };
  }
  if (item.pricing_type === "negotiable") {
    return { amount: formatPriceRange(item.price_min, item.price_max), suffix: "• Nego" };
  }
  if (item.pricing_type === "fixed" || !hasPriceRange(item.price_min, item.price_max)) {
    return { amount: formatRupiah(item.price_min), suffix: "Tarif Tetap" };
  }
  return { amount: formatPriceRange(item.price_min, item.price_max), suffix: "Mulai dari" };
}

function formatTimeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return "";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return new Date(isoDate).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ownerInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Normalize an Indonesian WA number to a wa.me-compatible digit string.
function normalizeWaNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9) return null;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return null;
}

function ServiceCover({ category, title }: { category: string; title: string }) {
  return (
    <div
      className="relative flex aspect-[16/7] items-center justify-center overflow-hidden bg-teal-700"
      role="img"
      aria-label={`Sampul portofolio ${title}`}
    >
      <svg width="72" height="72" viewBox="0 0 64 64" fill="none" aria-hidden="true" className="text-teal-100/70">
        <path d="M32 12L12 20L32 28L52 20L32 12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M14 34L32 43L50 34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M20 24V34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div className="absolute left-3 top-3 flex gap-1.5">
        <span className="rounded-md bg-white/95 px-2 py-1 text-[11px] font-bold text-teal-800">
          ✓ Jasa Terverifikasi
        </span>
        <span className="rounded-md bg-teal-950/60 px-2 py-1 text-[11px] font-bold text-white">
          {category}
        </span>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Memuat detail layanan"
      className="mx-auto max-w-[1180px]"
    >
      <div className="h-3 w-72 animate-pulse rounded bg-slate-100" />
      <div className="mt-4 aspect-[16/7] animate-pulse rounded-xl bg-slate-100" />
      <div className="mt-4 h-7 w-2/3 animate-pulse rounded bg-slate-100" />
      <div className="mt-5 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-3 rounded-xl border border-gray-200 bg-white p-5">
          <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-5">
          <div className="h-7 w-40 animate-pulse rounded bg-slate-100" />
          <div className="mt-3 h-4 w-32 animate-pulse rounded bg-slate-100" />
          <div className="mt-4 h-10 w-full animate-pulse rounded-md bg-slate-100" />
          <div className="mt-2 h-10 w-full animate-pulse rounded-md bg-slate-100" />
        </div>
      </div>
      <span className="sr-only">Memuat detail layanan…</span>
    </div>
  );
}

export default function ServiceDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [item, setItem] = useState<ApiServiceDetail | null>(null);
  const [related, setRelated] = useState<ApiServiceDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [chatNotice, setChatNotice] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const loadDetail = useCallback(async (itemId: string, signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setIsNotFound(false);
      setError(null);
      const res = await apiFetch<ServiceDetailResponse>(
        `/v1/services/${encodeURIComponent(itemId)}`
      );
      if (signal?.aborted) return;
      setItem(res.data);
      try {
        const list = await apiFetch<ServiceListResponse>("/v1/services");
        if (signal?.aborted) return;
        const others = list.data.data.filter((entry) => entry.id !== res.data.id);
        const sameCategory = others.filter(
          (entry) => entry.category?.id === res.data.category?.id
        );
        setRelated([...sameCategory, ...others.filter((e) => !sameCategory.includes(e))].slice(0, 3));
      } catch {
        if (!signal?.aborted) setRelated([]);
      }
    } catch (err) {
      if (signal?.aborted) return;
      setItem(null);
      if ((err as ApiError).status === 404) {
        setIsNotFound(true);
      } else {
        setError("Gagal memuat detail layanan. Periksa koneksi ke backend lalu coba lagi.");
      }
    } finally {
      if (signal?.aborted) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch must populate state when the route id resolves
    void loadDetail(id, controller.signal);
    return () => {
      controller.abort();
    };
  }, [id, loadDetail]);

  async function handleShare() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShareNotice("Tautan layanan disalin.");
    } catch {
      setShareNotice("Gagal menyalin. Salin URL dari address bar.");
    }
  }

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (isNotFound || (!error && !item)) {
    return (
      <div className="mx-auto max-w-[1180px]">
        <div role="alert" className="rounded-xl border border-gray-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-900">Layanan tidak ditemukan</p>
          <p className="mx-auto mt-1 max-w-[380px] text-xs leading-5 text-slate-500">
            Jasa yang kamu cari tidak tersedia atau sudah dihapus. Kembali ke daftar untuk menjelajahi layanan lain.
          </p>
          <Link
            href="/services"
            className="mt-4 inline-block rounded-lg bg-teal-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            Kembali ke Jasa &amp; Layanan
          </Link>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="mx-auto max-w-[1180px]">
        <div role="alert" className="rounded-xl border border-gray-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-900">Gagal memuat detail layanan</p>
          <p className="mt-1 text-xs text-slate-500">{error}</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => id && void loadDetail(id)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              Coba lagi
            </button>
            <Link
              href="/services"
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              Kembali ke Daftar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const categoryName = item.category?.name ?? "Lainnya";
  const providerName = item.user?.name ?? "Mahasiswa UPN";
  const isAvailable = item.status === "active";
  const modelLabel = pricingModelLabel(item);
  const price = priceHeadline(item);
  const estimatedTime = item.estimated_time?.trim() || null;
  const paymentLabel = (item.payment_method && PAYMENT_METHOD_LABELS[item.payment_method]) || null;
  const faculties = (item.target_faculties ?? []).filter(Boolean);
  const waNumber = item.whatsapp_number?.trim()
    ? normalizeWaNumber(item.whatsapp_number.trim())
    : null;
  const descriptionParagraphs = (item.description ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const postedYear = new Date(item.created_at).getFullYear();
  const serviceCode = Number.isNaN(postedYear)
    ? `SRV-${item.id}`
    : `SRV-${postedYear}-${String(item.id).padStart(4, "0")}`;

  return (
    <div className="mx-auto max-w-[1180px]">
      {/* Breadcrumb + status */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <li>
              <Link href="/dashboard" className="hover:text-slate-800 hover:underline">
                Beranda
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-300">/</li>
            <li>
              <Link href="/services" className="hover:text-slate-800 hover:underline">
                Jasa &amp; Layanan
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-300">/</li>
            <li>
              <span aria-current="page" className="max-w-[280px] truncate font-medium text-slate-700">
                {item.title}
              </span>
            </li>
          </ol>
        </nav>
        <p className="flex items-center gap-3 text-[11px] text-slate-400">
          {isAvailable && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              Menerima Sesi Baru
            </span>
          )}
          <span>ID: {serviceCode}</span>
        </p>
      </div>

      {/* Hero header card */}
      <section aria-labelledby="jasa-title" className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <ServiceCover category={categoryName} title={item.title} />
        <div className="p-5 sm:p-6">
          <p className="text-[11px] font-medium text-slate-500">
            <span className="font-bold text-teal-700">{categoryName}</span>
            <span className="mx-1.5 text-slate-300">•</span>
            Target: {faculties.length > 0 ? faculties.join(", ") : "Semua Fakultas"}
          </p>
          <h1 id="jasa-title" className="mt-1.5 text-xl font-bold leading-7 tracking-tight text-slate-900 sm:text-2xl">
            {item.title}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500">
            <span className={`inline-flex items-center gap-1 font-semibold ${isAvailable ? "text-green-700" : "text-slate-500"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isAvailable ? "bg-green-600" : "bg-slate-400"}`} aria-hidden="true" />
              {isAvailable ? "Tersedia" : "Tidak Aktif"}
            </span>
            {estimatedTime && (
              <span className="inline-flex items-center gap-1">
                <span aria-hidden="true">⚡</span> {estimatedTime}
              </span>
            )}
            <span>Dipasang {formatTimeAgo(item.created_at) || "-"}</span>
          </p>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main column */}
        <div className="min-w-0 space-y-5">
          {/* Ringkasan Layanan */}
          <section aria-labelledby="ringkasan-heading" className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
            <h2 id="ringkasan-heading" className="text-[15px] font-bold text-slate-900">Ringkasan Layanan</h2>
            <div className="mt-2 space-y-3">
              {descriptionParagraphs.length > 0 ? (
                <p className="text-[13px] leading-6 text-slate-600">{descriptionParagraphs[0]}</p>
              ) : (
                <p className="text-[13px] leading-6 text-slate-500">
                  Penyedia belum menambahkan deskripsi untuk layanan ini.
                </p>
              )}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                { label: "Model Tarif", value: modelLabel },
                { label: "Estimasi", value: estimatedTime ?? "-" },
                { label: "Pembayaran", value: paymentLabel ?? "-" },
                { label: "Kategori", value: categoryName },
              ].map((spec) => (
                <div key={spec.label} className="rounded-lg bg-slate-50 px-3 py-2.5 text-center ring-1 ring-inset ring-slate-100">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{spec.label}</dt>
                  <dd className="mt-1 truncate text-[12px] font-bold text-slate-900">{spec.value}</dd>
                </div>
              ))}
            </dl>
            {faculties.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Target fakultas">
                {faculties.map((f) => (
                  <span key={f} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    {f}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Skema Tarif & Jadwal */}
          <section aria-labelledby="skema-heading" className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
            <h2 id="skema-heading" className="text-[15px] font-bold text-slate-900">Skema Tarif &amp; Jadwal Sesi</h2>
            <p className="mt-0.5 text-[12px] text-slate-500">Sifat: {modelLabel} / {paymentLabel ?? "Sesuai kesepakatan"}</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-inset ring-slate-100">
                <p className="text-[12px] font-bold text-slate-900">Skema Tarif Transparan</p>
                <p className="mt-1.5 text-[12px] leading-5 text-slate-600">
                  {price.amount} {price.suffix === "Tarif Tetap" ? "" : price.suffix}
                  {paymentLabel ? ` — pembayaran ${paymentLabel.toLowerCase()}.` : "."}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-inset ring-slate-100">
                <p className="text-[12px] font-bold text-slate-900">Estimasi Pengerjaan</p>
                <p className="mt-1.5 text-[12px] leading-5 text-slate-600">
                  {estimatedTime
                    ? `${estimatedTime}. Konfirmasi jadwal spesifik via chat atau WhatsApp sebelum memesan.`
                    : "Fleksibel — konfirmasi jadwal via chat atau WhatsApp sebelum memesan."}
                </p>
              </div>
            </div>
          </section>

          {/* Deskripsi Lengkap + Catatan */}
          <section aria-labelledby="deskripsi-heading" className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
            <h2 id="deskripsi-heading" className="text-[15px] font-bold text-slate-900">Detail Layanan &amp; Ketentuan</h2>
            <div className="mt-2 space-y-3">
              {descriptionParagraphs.length > 1 ? (
                descriptionParagraphs.slice(1).map((paragraph, i) => (
                  <p key={i} className="text-[13px] leading-6 text-slate-600">
                    {paragraph}
                  </p>
                ))
              ) : descriptionParagraphs.length === 1 ? (
                <p className="text-[13px] leading-6 text-slate-600">{descriptionParagraphs[0]}</p>
              ) : (
                <p className="text-[13px] leading-6 text-slate-500">
                  Penyedia belum menambahkan deskripsi untuk layanan ini.
                </p>
              )}
            </div>
            <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5 text-[12px] leading-5 text-slate-600 ring-1 ring-inset ring-slate-100">
              <span className="font-bold text-slate-900">Catatan pemesanan: </span>
              Tarif {modelLabel.toLowerCase()} {formatPriceRange(item.price_min, item.price_max)}
              {paymentLabel ? ` dengan pembayaran ${paymentLabel.toLowerCase()}` : ""}
              {estimatedTime ? `, estimasi ${estimatedTime.toLowerCase()}` : ""}. Sepakati lingkup
              pekerjaan sebelum pembayaran.
            </div>
          </section>
        </div>

        {/* Tarif + provider card */}
        <aside aria-label="Tarif dan penyedia jasa" className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 lg:sticky lg:top-24">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tarif Sesi</p>
              <p className="mt-0.5 text-[22px] font-bold tracking-tight text-slate-900">
                {price.amount}{" "}
                <span className="text-[12px] font-semibold text-slate-500">{price.suffix}</span>
              </p>
            </div>
            <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-bold ${isAvailable ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"}`}>
              {isAvailable ? "Tersedia" : "Tidak Aktif"}
            </span>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white" aria-hidden="true">
                {ownerInitials(providerName)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-900">{providerName}</span>
                <span className="block truncate text-xs text-slate-500">Penyedia Jasa • Mahasiswa UPN</span>
              </span>
            </div>
            <div className="mt-4 space-y-2.5">
              {waNumber ? (
                <a
                  href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Halo, saya tertarik dengan jasa "${item.title}" di UPN Student Hub.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#16a34a] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"
                >
                  Hubungi via WhatsApp
                </a>
              ) : (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-4 text-slate-500">
                  Penyedia tidak mencantumkan nomor WhatsApp. Gunakan chat untuk menghubungi.
                </p>
              )}
              <button
                type="button"
                onClick={() => setChatNotice(true)}
                className="w-full rounded-lg bg-[#0A2342] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#12325e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
              >
                Chat Penyedia Jasa
              </button>
              {chatNotice && (
                <p role="status" className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-4 text-slate-500">
                  Fitur chat 1-on-1 segera hadir. Simpan layanan ke favorit sementara waktu.
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsFavorite((v) => !v)}
                  aria-pressed={isFavorite}
                  aria-label={isFavorite ? `Hapus ${item.title} dari favorit` : `Simpan ${item.title} ke favorit`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill={isFavorite ? "currentColor" : "none"} aria-hidden="true" className={isFavorite ? "text-red-600" : ""}>
                    <path d="M8 13.2L3.4 8.9C2.1 7.7 2.1 5.7 3.4 4.4C4.6 3.1 6.5 3.1 7.7 4.4L8 4.7L8.3 4.4C9.5 3.1 11.4 3.1 12.6 4.4C13.9 5.7 13.9 7.7 12.6 8.9L8 13.2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                  {isFavorite ? "Tersimpan" : "Simpan"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  aria-label={`Bagikan ${item.title}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="12" cy="3.5" r="1.8" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="4" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="12" cy="12.5" r="1.8" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M5.6 7.1L10.4 4.3M5.6 8.9L10.4 11.7" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  Bagikan
                </button>
              </div>
              {shareNotice && (
                <p role="status" className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-4 text-slate-500">
                  {shareNotice}
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Related services */}
      {related.length > 0 && (
        <section aria-labelledby="terkait-heading" className="mt-8">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="terkait-heading" className="text-[15px] font-bold text-slate-900">
              Jasa Terkait Lainnya dari Mahasiswa UPN
            </h2>
            <Link href="/services" className="shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline">
              Lihat Semua Jasa
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((entry) => {
              const entryProvider = entry.user?.name ?? "Mahasiswa UPN";
              const entryCategory = entry.category?.name ?? "Lainnya";
              return (
                <article
                  key={entry.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors hover:border-slate-300 focus-within:ring-2 focus-within:ring-teal-600 focus-within:ring-offset-2"
                >
                  <div className="flex flex-1 flex-col p-5">
                    <span className="w-fit max-w-full truncate rounded-md border border-teal-100 bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-700">
                      {entryCategory}
                    </span>
                    <h3 className="mt-3 line-clamp-2 text-[13px] font-bold leading-5 text-slate-900">
                      <Link href={`/services/${entry.id}`} className="hover:underline focus:outline-none">
                        {entry.title}
                      </Link>
                    </h3>
                    <p className="mt-1 text-[15px] font-bold text-slate-900">
                      {formatPriceRange(entry.price_min, entry.price_max)}
                    </p>
                    <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white" aria-hidden="true">
                        {ownerInitials(entryProvider)}
                      </span>
                      <span className="truncate text-xs font-medium text-slate-700">{entryProvider}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
