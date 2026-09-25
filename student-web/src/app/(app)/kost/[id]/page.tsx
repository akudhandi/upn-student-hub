"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch, type ApiError } from "@/lib/api";
import { useFavorite } from "@/lib/interactions";
import ReportModal from "@/components/ReportModal";

// ---------------------------------------------------------------------------
// API types — shape of GET /api/v1/kost/{id} (standard { message, data }
// JSON envelope, detail of a single kost listing).
// ---------------------------------------------------------------------------
type ApiKostDetail = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  address: string;
  latitude: string | number;
  longitude: string | number;
  price: number | string;
  facilities: string[] | null;
  gender_type: string;
  status: string;
  created_at: string;
  user?: { id: number; name: string } | null;
};

type KostDetailResponse = {
  message: string;
  data: ApiKostDetail;
};

const GENDER_LABELS: Record<string, string> = {
  putra: "Putra",
  putri: "Putri",
  campur: "Campur",
};

const GALLERY_TONES = ["#E7ECF2", "#EFE9DF", "#E8F0E9", "#E9EAF3", "#F0E8E4"];

function formatRupiah(value: number | string): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value));
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

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-green-700">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5.5 8.2L7.3 10L10.6 6.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GalleryPlaceholder({ label, tone, large }: { label: string; tone: string; large?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center ${large ? "aspect-[16/9]" : "aspect-[4/3]"}`}
      style={{ backgroundColor: tone }}
      role="img"
      aria-label={label}
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

function DetailSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Memuat detail kost" className="mx-auto max-w-[1180px]">
      <div className="h-3 w-64 animate-pulse rounded bg-slate-100" />
      <div className="mt-3 h-7 w-2/3 animate-pulse rounded bg-slate-100" />
      <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-slate-100" />
      <div className="mt-5 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_350px] lg:gap-8">
        <div className="min-w-0">
          <div className="aspect-[16/9] animate-pulse rounded-lg bg-slate-100" />
          <div className="mt-3 grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-md bg-slate-100" />
            ))}
          </div>
          <div className="mt-6 space-y-3 rounded-lg border border-gray-200 bg-white p-5">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
        <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-5">
          <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-7 w-44 animate-pulse rounded bg-slate-100" />
          <div className="mt-4 h-10 w-full animate-pulse rounded-md bg-slate-100" />
          <div className="mt-2 h-10 w-full animate-pulse rounded-md bg-slate-100" />
        </div>
      </div>
      <span className="sr-only">Memuat detail kost…</span>
    </div>
  );
}

function PricingCard({ kost }: { kost: ApiKostDetail }) {
  const ownerName = kost.user?.name ?? "Pemilik Kost";
  const isAvailable = kost.status === "available";
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <p className="text-xs text-slate-500">Harga Sewa Kamar</p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="text-[22px] font-bold tracking-tight text-slate-900">{formatRupiah(kost.price)}</span>
        <span className="text-xs font-medium text-slate-500">/ bulan</span>
      </p>

      <p
        className={`mt-3 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold ring-1 ring-inset ${
          isAvailable
            ? "bg-green-50 text-green-800 ring-green-200"
            : "bg-slate-100 text-slate-600 ring-slate-200"
        }`}
      >
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${isAvailable ? "bg-green-600" : "bg-slate-400"}`}
        />
        {isAvailable ? "Tersedia - Siap Huni" : "Saat Ini Penuh"}
      </p>

      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#002147] text-xs font-bold text-white" aria-hidden="true">
          {ownerInitials(ownerName)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-900">{ownerName}</span>
          <span className="block truncate text-xs text-slate-500">Pemilik Kost</span>
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
    </div>
  );
}

export default function KostDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [kost, setKost] = useState<ApiKostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isFavorite, toggle: toggleFavorite } = useFavorite("kost", id);
  const [reportOpen, setReportOpen] = useState(false);

  const loadDetail = useCallback(async (kostId: string, signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setIsNotFound(false);
      setError(null);
      const res = await apiFetch<KostDetailResponse>(`/v1/kost/${encodeURIComponent(kostId)}`);
      if (signal?.aborted) return;
      setKost(res.data);
    } catch (err) {
      if (signal?.aborted) return;
      setKost(null);
      if ((err as ApiError).status === 404) {
        setIsNotFound(true);
      } else {
        setError("Gagal memuat detail kost. Periksa koneksi ke backend lalu coba lagi.");
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

  if (isNotFound || (!error && !kost)) {
    return (
      <div className="mx-auto max-w-[1180px]">
        <div role="alert" className="rounded-lg border border-gray-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-900">Kost tidak ditemukan</p>
          <p className="mx-auto mt-1 max-w-[380px] text-xs leading-5 text-slate-500">
            Data kost yang kamu cari tidak tersedia atau sudah dihapus. Kembali ke daftar untuk menjelajahi kost lain.
          </p>
          <Link
            href="/kost"
            className="mt-4 inline-block rounded-md bg-green-700 px-4 py-2 text-[13px] font-semibold text-white hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"
          >
            Kembali ke Daftar Kost
          </Link>
        </div>
      </div>
    );
  }

  if (error || !kost) {
    return (
      <div className="mx-auto max-w-[1180px]">
        <div role="alert" className="rounded-lg border border-gray-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-900">Gagal memuat detail kost</p>
          <p className="mt-1 text-xs text-slate-500">{error}</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => id && void loadDetail(id)}
              className="rounded-md border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
            >
              Coba lagi
            </button>
            <Link
              href="/kost"
              className="rounded-md border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
            >
              Kembali ke Daftar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const facilities = kost.facilities ?? [];
  const genderLabel = GENDER_LABELS[kost.gender_type] ?? kost.gender_type;
  const descriptionParagraphs = (kost.description ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const lat = Number(kost.latitude);
  const lng = Number(kost.longitude);
  const hasCoords = !Number.isNaN(lat) && !Number.isNaN(lng);
  const osmUrl = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
    : "https://www.openstreetmap.org/";

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
          <li aria-hidden="true" className="text-slate-300">
            /
          </li>
          <li>
            <Link href="/kost" className="hover:text-slate-800 hover:underline">
              Kost Sekitar UPN
            </Link>
          </li>
          <li aria-hidden="true" className="text-slate-300">
            /
          </li>
          <li>
            <span aria-current="page" className="font-medium text-slate-700">
              {kost.title}
            </span>
          </li>
        </ol>
      </nav>

      {/* Title + actions */}
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-green-50 px-2 py-1 text-[11px] font-medium text-green-800 ring-1 ring-inset ring-green-200">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2 7L8 2L14 7V13H10V9.5H6V13H2V7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
              Kost {genderLabel}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium ring-1 ring-inset ${
                kost.status === "available"
                  ? "bg-blue-50 text-blue-800 ring-blue-200"
                  : "bg-slate-100 text-slate-600 ring-slate-200"
              }`}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 14C8 14 3.5 9.3 3.5 6C3.5 3.5 5.5 1.5 8 1.5C10.5 1.5 12.5 3.5 12.5 6C12.5 9.3 8 14 8 14Z" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="8" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              {kost.status === "available" ? "Tersedia - Siap Huni" : "Saat Ini Penuh"}
            </span>
          </div>
          <h1 className="mt-2 text-[22px] font-bold leading-7 tracking-tight text-[#002147] sm:text-2xl sm:leading-8">
            {kost.title}
          </h1>
          <p className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-5 text-slate-500">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-green-700">
              <path d="M8 14C8 14 3.5 9.3 3.5 6C3.5 3.5 5.5 1.5 8 1.5C10.5 1.5 12.5 3.5 12.5 6C12.5 9.3 8 14 8 14Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              <circle cx="8" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            {kost.address}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleFavorite()}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? `Hapus ${kost.title} dari favorit` : `Simpan ${kost.title} ke favorit`}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill={isFavorite ? "currentColor" : "none"} aria-hidden="true" className={isFavorite ? "text-red-600" : ""}>
              <path d="M8 13.2L3.4 8.9C2.1 7.7 2.1 5.7 3.4 4.4C4.6 3.1 6.5 3.1 7.7 4.4L8 4.7L8.3 4.4C9.5 3.1 11.4 3.1 12.6 4.4C13.9 5.7 13.9 7.7 12.6 8.9L8 13.2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
            {isFavorite ? "Tersimpan" : "Simpan"}
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
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-red-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
          >
            Laporkan
          </button>
        </div>
      </div>

      <ReportModal
        open={reportOpen}
        title={kost.title}
        type="kost"
        id={kost.id}
        onClose={() => setReportOpen(false)}
      />

      {/* Main 2-column layout. Pricing sits below gallery on mobile via order. */}
      <div className="mt-5 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_350px] lg:gap-8">
        {/* Gallery + facility highlights */}
        <section aria-label="Galeri foto kost" className="order-1 min-w-0 lg:col-start-1 lg:row-start-1">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <GalleryPlaceholder label={`Foto utama ${kost.title}`} tone={GALLERY_TONES[0]} large />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {GALLERY_TONES.slice(1).map((tone, i) => (
              <div key={tone} className="overflow-hidden rounded-md border border-gray-200 bg-white">
                <GalleryPlaceholder label={`Foto ${i + 2} ${kost.title}`} tone={tone} />
              </div>
            ))}
          </div>

          {facilities.length > 0 && (
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {facilities.map((facility) => (
                <div key={facility} className="flex flex-col rounded-lg border border-gray-200 bg-white p-3 text-center">
                  <dt className="order-2 mt-2 text-[13px] font-bold leading-4 text-slate-900">
                    <span className="mb-1 block text-[10px] font-medium leading-3 text-slate-500">Fasilitas</span>
                    {facility}
                  </dt>
                  <dd className="order-1 flex justify-center" aria-hidden="true">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-green-50 ring-1 ring-inset ring-green-100">
                      <CheckIcon />
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        {/* Sticky pricing card */}
        <aside aria-label="Harga sewa dan kontak pemilik" className="order-2 min-w-0 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <PricingCard kost={kost} />
        </aside>

        {/* Remaining detail sections */}
        <div className="order-3 min-w-0 space-y-6 lg:col-start-1 lg:row-start-2">
          <section aria-labelledby="deskripsi-kost" className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
            <h2 id="deskripsi-kost" className="text-[15px] font-bold text-[#002147]">
              Deskripsi Kost
            </h2>
            <div className="mt-3 space-y-3">
              {descriptionParagraphs.length > 0 ? (
                descriptionParagraphs.map((paragraph, i) => (
                  <p key={i} className="text-[13px] leading-6 text-slate-600">
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="text-[13px] leading-6 text-slate-500">
                  Pemilik belum menambahkan deskripsi untuk kost ini.
                </p>
              )}
            </div>
          </section>

          <section aria-labelledby="fasilitas-kost" className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
            <h2 id="fasilitas-kost" className="text-[15px] font-bold text-[#002147]">
              Fasilitas yang Didapat
            </h2>
            {facilities.length > 0 ? (
              <ul className="mt-2.5 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
                {facilities.map((facility) => (
                  <li key={facility} className="flex items-start gap-2 text-[13px] leading-5 text-slate-700">
                    <CheckIcon />
                    {facility}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2.5 text-[13px] leading-6 text-slate-500">
                Belum ada informasi fasilitas untuk kost ini.
              </p>
            )}
          </section>

          <section aria-labelledby="lokasi-kost" className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="lokasi-kost" className="text-[15px] font-bold text-[#002147]">
                Lokasi Kost
              </h2>
              {hasCoords && (
                <p className="hidden shrink-0 text-[11px] text-slate-400 sm:block">
                  {lat.toFixed(6)}, {lng.toFixed(6)}
                </p>
              )}
            </div>
            {/* Map placeholder: production uses Leaflet.js + OpenStreetMap. */}
            <div
              className="relative mt-4 flex aspect-[21/9] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-[#E5E7EB]"
              role="img"
              aria-label={`Peta lokasi ${kost.address}`}
            >
              <span className="flex flex-col items-center gap-2 text-slate-500">
                <svg width="28" height="28" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M5.5 3L2 4.5V13L5.5 11.5L10.5 13L14 11.5V3L10.5 4.5L5.5 3Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  <path d="M5.5 3V11.5M10.5 4.5V13" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                <span className="text-xs font-semibold">Peta Lokasi</span>
              </span>
              <span className="absolute bottom-3 left-3 max-w-[60%] truncate rounded bg-slate-900/80 px-2 py-1 text-[11px] font-medium text-white">
                {kost.address}
              </span>
              <a
                href={osmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-3 right-3 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]"
              >
                Buka di OpenStreetMap
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
