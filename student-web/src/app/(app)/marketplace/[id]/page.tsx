"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch, type ApiError } from "@/lib/api";

// ---------------------------------------------------------------------------
// API types — shape of GET /api/v1/marketplace/{id} (standard { message, data }
// JSON envelope, detail of a single marketplace listing).
// ---------------------------------------------------------------------------
type ApiMarketplaceDetail = {
  id: number;
  title: string;
  description: string | null;
  price: number | string;
  condition: string;
  status: string;
  created_at: string;
  user?: { id: number; name: string } | null;
  category?: { id: number; name: string; slug: string } | null;
};

type MarketplaceDetailResponse = {
  message: string;
  data: ApiMarketplaceDetail;
};

type MarketplaceListResponse = {
  message: string;
  data: {
    current_page: number;
    last_page: number;
    total: number;
    data: ApiMarketplaceDetail[];
  };
};

const CONDITION_LABELS: Record<string, string> = {
  new: "Baru",
  "like-new": "Bekas Seperti Baru",
  good: "Layak Pakai",
  fair: "Perlu Perbaikan",
};

function formatRupiah(value: number | string): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value));
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

function GalleryImage({ title, large }: { title: string; large?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center bg-[#EEF2F7] ${large ? "aspect-[16/10]" : "aspect-[4/3]"}`}
      role="img"
      aria-label={`Foto ${title}`}
    >
      <svg
        width={large ? "64" : "32"}
        height={large ? "64" : "32"}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="text-slate-400"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.3" />
        <path d="M3 16L8.5 11L13 15.5L16 13L21 18" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Memuat detail barang"
      className="mx-auto max-w-[1180px]"
    >
      <div className="h-3 w-72 animate-pulse rounded bg-slate-100" />
      <div className="mt-5 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div className="aspect-[16/10] animate-pulse rounded-xl bg-slate-100" />
          <div className="mt-3 grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
          <div className="mt-5 space-y-3 rounded-xl border border-gray-200 bg-white p-5">
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="h-6 w-40 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-5">
          <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-3 h-4 w-32 animate-pulse rounded bg-slate-100" />
          <div className="mt-4 h-10 w-full animate-pulse rounded-md bg-slate-100" />
          <div className="mt-2 h-10 w-full animate-pulse rounded-md bg-slate-100" />
        </div>
      </div>
      <span className="sr-only">Memuat detail barang…</span>
    </div>
  );
}

export default function MarketplaceDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [item, setItem] = useState<ApiMarketplaceDetail | null>(null);
  const [related, setRelated] = useState<ApiMarketplaceDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [chatNotice, setChatNotice] = useState(false);

  const loadDetail = useCallback(async (itemId: string, signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setIsNotFound(false);
      setError(null);
      const res = await apiFetch<MarketplaceDetailResponse>(
        `/v1/marketplace/${encodeURIComponent(itemId)}`
      );
      if (signal?.aborted) return;
      setItem(res.data);
      try {
        const list = await apiFetch<MarketplaceListResponse>("/v1/marketplace");
        if (signal?.aborted) return;
        setRelated(list.data.data.filter((entry) => entry.id !== res.data.id).slice(0, 3));
      } catch {
        if (!signal?.aborted) setRelated([]);
      }
    } catch (err) {
      if (signal?.aborted) return;
      setItem(null);
      if ((err as ApiError).status === 404) {
        setIsNotFound(true);
      } else {
        setError("Gagal memuat detail barang. Periksa koneksi ke backend lalu coba lagi.");
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

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (isNotFound || (!error && !item)) {
    return (
      <div className="mx-auto max-w-[1180px]">
        <div role="alert" className="rounded-xl border border-gray-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-900">Barang tidak ditemukan</p>
          <p className="mx-auto mt-1 max-w-[380px] text-xs leading-5 text-slate-500">
            Iklan yang kamu cari tidak tersedia atau sudah dihapus. Kembali ke daftar untuk menjelajahi barang lain.
          </p>
          <Link
            href="/marketplace"
            className="mt-4 inline-block rounded-lg bg-[#0A2342] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#12325e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
          >
            Kembali ke Marketplace
          </Link>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="mx-auto max-w-[1180px]">
        <div role="alert" className="rounded-xl border border-gray-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-900">Gagal memuat detail barang</p>
          <p className="mt-1 text-xs text-slate-500">{error}</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => id && void loadDetail(id)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
            >
              Coba lagi
            </button>
            <Link
              href="/marketplace"
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
            >
              Kembali ke Daftar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const categoryName = item.category?.name ?? "Lainnya";
  const sellerName = item.user?.name ?? "Mahasiswa UPN";
  const conditionLabel = CONDITION_LABELS[item.condition] ?? item.condition;
  const isAvailable = item.status === "active";
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
            <Link href="/marketplace" className="hover:text-slate-800 hover:underline">
              Marketplace
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
          {/* Gallery card */}
          <section aria-label="Galeri foto barang" className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="relative">
              <GalleryImage title={item.title} large />
              <div className="absolute left-3 top-3 flex gap-1.5">
                <span
                  className={`rounded-md px-2 py-1 text-[11px] font-bold ${
                    isAvailable ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {isAvailable ? "Tersedia" : "Terjual"}
                </span>
                <span className="rounded-md bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-900">
                  Bisa Nego
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 p-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-lg border border-slate-100">
                  <GalleryImage title={`${item.title} ${i + 1}`} />
                </div>
              ))}
            </div>
          </section>

          {/* Title + price card */}
          <section aria-labelledby="barang-title" className="mt-5 rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
            <p className="text-[11px] font-medium text-slate-500">
              {categoryName} <span className="mx-1 text-slate-300">•</span>{" "}
              <span className="text-green-700">{isAvailable ? "Tersedia" : "Terjual"}</span>
            </p>
            <h1 id="barang-title" className="mt-1.5 text-xl font-bold leading-7 tracking-tight text-slate-900 sm:text-[22px]">
              {item.title}
            </h1>
            <p className="mt-2 text-[22px] font-bold tracking-tight text-slate-900">
              {formatRupiah(item.price)}
            </p>

            {/* Spec grid */}
            <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                { label: "Kondisi", value: conditionLabel },
                { label: "Kategori", value: categoryName },
                { label: "Target", value: "Semua Fakultas" },
                { label: "Dipasang", value: formatTimeAgo(item.created_at) || "-" },
              ].map((spec) => (
                <div key={spec.label} className="rounded-lg bg-slate-50 px-3 py-2.5 text-center ring-1 ring-inset ring-slate-100">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{spec.label}</dt>
                  <dd className="mt-1 truncate text-[12px] font-bold text-slate-900">{spec.value}</dd>
                </div>
              ))}
            </dl>

            {/* Description */}
            <h2 className="mt-6 text-[14px] font-bold text-slate-900">Deskripsi &amp; Catatan Penjual</h2>
            <div className="mt-2 space-y-3">
              {descriptionParagraphs.length > 0 ? (
                descriptionParagraphs.map((paragraph, i) => (
                  <p key={i} className="text-[13px] leading-6 text-slate-600">
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="text-[13px] leading-6 text-slate-500">
                  Penjual belum menambahkan deskripsi untuk barang ini.
                </p>
              )}
            </div>

            {/* COD point */}
            <h2 className="mt-6 text-[14px] font-bold text-slate-900">Titik COD / Pertemuan</h2>
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[12px] leading-5 text-slate-600 ring-1 ring-inset ring-slate-100">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-1 shrink-0 text-slate-400">
                <path d="M8 14C8 14 3.5 9.3 3.5 6C3.5 3.5 5.5 1.5 8 1.5C10.5 1.5 12.5 3.5 12.5 6C12.5 9.3 8 14 8 14Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                <circle cx="8" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              COD di area kampus UPN (mis. Perpustakaan Pusat / Gazebo fakultas) sesuai kesepakatan dengan penjual demi keamanan bersama.
            </div>
          </section>
        </div>

        {/* Seller card */}
        <aside aria-label="Profil penjual" className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 lg:sticky lg:top-24">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white" aria-hidden="true">
              {ownerInitials(sellerName)}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                <span className="truncate">{sellerName}</span>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-sky-500">
                  <circle cx="8" cy="8" r="6.5" fill="currentColor" opacity="0.15" />
                  <path d="M5.5 8.2L7.3 10L10.6 6.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="block truncate text-xs text-slate-500">Mahasiswa UPN</span>
            </span>
          </div>
          <div className="mt-4 space-y-2.5">
            <button
              type="button"
              onClick={() => setChatNotice(true)}
              className="w-full rounded-lg bg-[#0A2342] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#12325e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
            >
              Chat &amp; Tawar Harga
            </button>
            {chatNotice && (
              <p role="status" className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-4 text-slate-500">
                Fitur chat 1-on-1 segera hadir. Simpan barang ke favorit lalu atur COD dengan penjual.
              </p>
            )}
            <button
              type="button"
              onClick={() => setIsFavorite((v) => !v)}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? `Hapus ${item.title} dari favorit` : `Simpan ${item.title} ke favorit`}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill={isFavorite ? "currentColor" : "none"} aria-hidden="true" className={isFavorite ? "text-red-600" : ""}>
                <path d="M8 13.2L3.4 8.9C2.1 7.7 2.1 5.7 3.4 4.4C4.6 3.1 6.5 3.1 7.7 4.4L8 4.7L8.3 4.4C9.5 3.1 11.4 3.1 12.6 4.4C13.9 5.7 13.9 7.7 12.6 8.9L8 13.2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
              {isFavorite ? "Tersimpan ke Favorit" : "Simpan ke Favorit"}
            </button>
          </div>
        </aside>
      </div>

      {/* Related items */}
      {related.length > 0 && (
        <section aria-labelledby="terkait-heading" className="mt-8">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="terkait-heading" className="text-[15px] font-bold text-slate-900">
              Barang Terkait Lainnya dari Mahasiswa UPN
            </h2>
            <Link href="/marketplace" className="shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline">
              Lihat Semua Barang
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((entry) => {
              const entrySeller = entry.user?.name ?? "Mahasiswa UPN";
              return (
                <article
                  key={entry.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors hover:border-slate-300 focus-within:ring-2 focus-within:ring-[#002147] focus-within:ring-offset-2"
                >
                  <Link href={`/marketplace/${entry.id}`} aria-label={`Lihat detail ${entry.title}`}>
                    <GalleryImage title={entry.title} />
                  </Link>
                  <div className="flex flex-1 flex-col px-4 py-3">
                    <h3 className="line-clamp-2 text-[13px] font-semibold leading-5 text-slate-900">
                      <Link href={`/marketplace/${entry.id}`} className="hover:underline focus:outline-none">
                        {entry.title}
                      </Link>
                    </h3>
                    <p className="mt-1 text-[15px] font-bold text-slate-900">{formatRupiah(entry.price)}</p>
                    <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white" aria-hidden="true">
                        {ownerInitials(entrySeller)}
                      </span>
                      <span className="truncate text-xs font-medium text-slate-700">{entrySeller}</span>
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
