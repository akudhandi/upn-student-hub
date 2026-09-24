"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch, type ApiError } from "@/lib/api";

// ---------------------------------------------------------------------------
// API types — shape of GET /api/v1/services/{id} (standard { message, data }
// JSON envelope, detail of a single service listing). pricing_type is
// optional: the backend schema (SYSTEM_ANALYSIS §10.2) stores price_min /
// price_max, so the pricing-model badge falls back to the price shape.
// ---------------------------------------------------------------------------
type ApiServiceDetail = {
  id: number;
  title: string;
  description: string | null;
  price_min: number | string;
  price_max: number | string | null;
  pricing_type?: string | null;
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
  fixed: "Tetap",
  per_hour: "Per Jam",
  starting_from: "Mulai dari",
  negotiable: "Negosiasi",
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
  return hasPriceRange(item.price_min, item.price_max) ? "Mulai dari" : "Tetap";
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

function ServiceHeroIcon({ category }: { category: string }) {
  const name = category.toLowerCase();
  const path = name.includes("desain") || name.includes("media") || name.includes("foto") ? (
    <>
      <path d="M14 34L32 10L50 34H14Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M24 34H40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ) : name.includes("servis") || name.includes("service") || name.includes("laptop") ? (
    <path d="M38 10L46 18L22 42L12 44L14 34L38 10Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  ) : (
    <>
      <path d="M32 12L12 20L32 28L52 20L32 12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 34L32 43L50 34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 24V34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  );
  return (
    <div
      className="flex aspect-[16/8] items-center justify-center bg-teal-50"
      role="img"
      aria-label={`Ilustrasi jasa ${category}`}
    >
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true" className="text-teal-600">
        {path}
      </svg>
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
      <div className="mt-5 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-3 rounded-xl border border-gray-200 bg-white p-5">
          <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
          <div className="h-6 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="h-7 w-48 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-5">
          <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
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
  const descriptionParagraphs = (item.description ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-[1180px]">
      {/* Breadcrumb */}
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
            <span className="hover:text-slate-800">{categoryName}</span>
          </li>
          <li aria-hidden="true" className="text-slate-300">/</li>
          <li>
            <span aria-current="page" className="max-w-[280px] truncate font-medium text-slate-700">
              {item.title}
            </span>
          </li>
        </ol>
      </nav>

      <div className="mt-4 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main column */}
        <div className="min-w-0">
          <section aria-labelledby="jasa-title" className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="relative">
              <ServiceHeroIcon category={categoryName} />
              <div className="absolute left-3 top-3 flex gap-1.5">
                <span
                  className={`rounded-md px-2 py-1 text-[11px] font-bold ${
                    isAvailable ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {isAvailable ? "Tersedia" : "Tidak Aktif"}
                </span>
                <span className="rounded-md bg-teal-100 px-2 py-1 text-[11px] font-bold text-teal-800">
                  {categoryName}
                </span>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <h1 id="jasa-title" className="text-xl font-bold leading-7 tracking-tight text-slate-900 sm:text-[22px]">
                {item.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-[22px] font-bold tracking-tight text-slate-900">
                  {formatPriceRange(item.price_min, item.price_max)}
                </p>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700">
                  {modelLabel}
                </span>
              </div>

              {/* Spec grid */}
              <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  { label: "Kategori", value: categoryName },
                  { label: "Model Harga", value: modelLabel },
                  { label: "Penyedia", value: providerName },
                  { label: "Dipasang", value: formatTimeAgo(item.created_at) || "-" },
                ].map((spec) => (
                  <div key={spec.label} className="rounded-lg bg-slate-50 px-3 py-2.5 text-center ring-1 ring-inset ring-slate-100">
                    <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{spec.label}</dt>
                    <dd className="mt-1 truncate text-[12px] font-bold text-slate-900">{spec.value}</dd>
                  </div>
                ))}
              </dl>

              {/* Description */}
              <h2 className="mt-6 text-[14px] font-bold text-slate-900">Deskripsi Layanan</h2>
              <div className="mt-2 space-y-3">
                {descriptionParagraphs.length > 0 ? (
                  descriptionParagraphs.map((paragraph, i) => (
                    <p key={i} className="text-[13px] leading-6 text-slate-600">
                      {paragraph}
                    </p>
                  ))
                ) : (
                  <p className="text-[13px] leading-6 text-slate-500">
                    Penyedia belum menambahkan deskripsi untuk layanan ini.
                  </p>
                )}
              </div>

              {/* Ordering note */}
              <h2 className="mt-6 text-[14px] font-bold text-slate-900">Cara Pemesanan</h2>
              <div className="mt-2 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[12px] leading-5 text-slate-600 ring-1 ring-inset ring-slate-100">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-1 shrink-0 text-slate-400">
                  <path d="M8 1.8C4.7 1.8 2 4.4 2 7.6C2 8.9 2.5 10 3.2 11L2.5 14L5.6 13.3C6.3 13.7 7.1 13.9 8 13.9C11.3 13.9 14 11.3 14 8C14 4.7 11.3 1.8 8 1.8Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
                Hubungi penyedia via chat untuk menyepakati lingkup pekerjaan, jadwal pengerjaan, dan lokasi (online / sekitar kampus UPN) sebelum memesan.
              </div>
            </div>
          </section>
        </div>

        {/* Provider card */}
        <aside aria-label="Profil penyedia jasa" className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 lg:sticky lg:top-24">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white" aria-hidden="true">
              {ownerInitials(providerName)}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                <span className="truncate">{providerName}</span>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-sky-500">
                  <circle cx="8" cy="8" r="6.5" fill="currentColor" opacity="0.15" />
                  <path d="M5.5 8.2L7.3 10L10.6 6.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="block truncate text-xs text-slate-500">Penyedia Jasa • Mahasiswa UPN</span>
            </span>
          </div>
          <div className="mt-4 space-y-2.5">
            <button
              type="button"
              onClick={() => setChatNotice(true)}
              className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              Chat &amp; Pesan Jasa
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
                {isFavorite ? "Tersimpan" : "Favorit"}
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
