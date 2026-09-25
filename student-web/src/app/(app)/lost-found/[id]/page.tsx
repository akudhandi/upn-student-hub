"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch, type ApiError } from "@/lib/api";
import { useFavorite } from "@/lib/interactions";
import ReportModal from "@/components/ReportModal";

// ---------------------------------------------------------------------------
// API types — shape of GET /api/v1/lost-found/{id} (standard { message, data }
// JSON envelope, detail of a single lost & found report).
// ---------------------------------------------------------------------------
type ApiLostFoundDetail = {
  id: number;
  type: "lost" | "found";
  title: string;
  location: string;
  date_event: string | null;
  description: string | null;
  contact_info: string | null;
  reward: string | null;
  status: string;
  created_at: string;
  user?: { id: number; name: string } | null;
  category?: { id: number; name: string; slug: string } | null;
};

type LostFoundDetailResponse = {
  message: string;
  data: ApiLostFoundDetail;
};

type LostFoundListResponse = {
  message: string;
  data: {
    current_page: number;
    last_page: number;
    total: number;
    data: ApiLostFoundDetail[];
  };
};

function formatEventDate(isoDate: string | null): string {
  if (!isoDate) return "-";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

function StatusPill({ type, status }: { type: "lost" | "found"; status: string }) {
  if (status === "resolved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden="true" />
        Selesai
      </span>
    );
  }
  if (type === "lost") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
        Hilang (Dicari)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-bold text-indigo-700">
      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" aria-hidden="true" />
      Ditemukan (Belum Diambil)
    </span>
  );
}

function DetailSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Memuat detail laporan"
      className="mx-auto max-w-[1180px]"
    >
      <div className="h-3 w-72 animate-pulse rounded bg-slate-100" />
      <div className="mt-4 aspect-[16/8] animate-pulse rounded-xl bg-slate-100" />
      <div className="mt-4 h-7 w-2/3 animate-pulse rounded bg-slate-100" />
      <div className="mt-5 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
          <div className="h-10 w-full animate-pulse rounded-md bg-slate-100" />
          <div className="mt-2 h-10 w-full animate-pulse rounded-md bg-slate-100" />
        </div>
      </div>
      <span className="sr-only">Memuat detail laporan…</span>
    </div>
  );
}

export default function LostFoundDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [item, setItem] = useState<ApiLostFoundDetail | null>(null);
  const [related, setRelated] = useState<ApiLostFoundDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isFavorite, toggle: toggleFavorite } = useFavorite("lostfound", id);
  const [reportOpen, setReportOpen] = useState(false);
  const [claimNotice, setClaimNotice] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const loadDetail = useCallback(async (itemId: string, signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setIsNotFound(false);
      setError(null);
      const res = await apiFetch<LostFoundDetailResponse>(
        `/v1/lost-found/${encodeURIComponent(itemId)}`
      );
      if (signal?.aborted) return;
      setItem(res.data);
      try {
        const list = await apiFetch<LostFoundListResponse>("/v1/lost-found");
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
        setError("Gagal memuat detail laporan. Periksa koneksi ke backend lalu coba lagi.");
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
      setShareNotice("Tautan laporan disalin.");
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
        <div role="alert" className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-900">Laporan tidak ditemukan</p>
          <p className="mx-auto mt-1 max-w-[380px] text-xs leading-5 text-slate-500">
            Laporan yang kamu cari tidak tersedia atau sudah dihapus. Kembali ke daftar untuk menjelajahi laporan lain.
          </p>
          <Link
            href="/lost-found"
            className="mt-4 inline-block rounded-lg bg-[#002147] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#001a38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
          >
            Kembali ke Lost &amp; Found
          </Link>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="mx-auto max-w-[1180px]">
        <div role="alert" className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-900">Gagal memuat detail laporan</p>
          <p className="mt-1 text-xs text-slate-500">{error}</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => id && void loadDetail(id)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
            >
              Coba lagi
            </button>
            <Link
              href="/lost-found"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
            >
              Kembali ke Daftar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const reporterName = item.user?.name ?? "Mahasiswa UPN";
  const categoryName = item.category?.name ?? null;
  const postedYear = new Date(item.created_at).getFullYear();
  const reportCode = Number.isNaN(postedYear)
    ? `LNF-${item.id}`
    : `LNF-${postedYear}-${String(item.id).padStart(4, "0")}`;
  const waNumber = item.contact_info?.trim() ? normalizeWaNumber(item.contact_info.trim()) : null;
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
            <Link href="/lost-found" className="hover:text-slate-800 hover:underline">
              Lost &amp; Found
            </Link>
          </li>
          <li aria-hidden="true" className="text-slate-300">/</li>
          <li>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">
              {item.type === "lost" ? "Hilang" : "Ditemukan"}
            </span>
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
        <div className="min-w-0 space-y-5">
          <section aria-labelledby="laporan-title" className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-500">
              <StatusPill type={item.type} status={item.status} />
              <span>ID: {reportCode}</span>
              <span className="inline-flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M8 4.5V8L10.5 9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                {formatTimeAgo(item.created_at) || formatEventDate(item.date_event)}
              </span>
            </div>

            <h1 id="laporan-title" className="mt-2 text-xl font-bold leading-7 tracking-tight text-slate-900 sm:text-2xl">
              {item.title}
            </h1>

            <p className="mt-3 flex items-start gap-2 text-[13px] leading-5 text-slate-600">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-indigo-500">
                <path d="M8 14C8 14 3.5 9.3 3.5 6C3.5 3.5 5.5 1.5 8 1.5C10.5 1.5 12.5 3.5 12.5 6C12.5 9.3 8 14 8 14Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                <circle cx="8" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              <span>
                <span className="font-semibold text-slate-900">
                  {item.type === "lost" ? "Lokasi Terakhir: " : "Lokasi Penemuan: "}
                </span>
                {item.location}
              </span>
            </p>

            {/* Photo placeholder */}
            <div
              className="relative mt-4 flex aspect-[16/8] items-center justify-center overflow-hidden rounded-xl bg-[#E9EDF2]"
              role="img"
              aria-label={`Foto dokumentasi ${item.title}`}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-slate-400">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.3" />
                <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.3" />
                <path d="M3 16L8.5 11L13 15.5L16 13L21 18" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
              <span className="absolute bottom-3 left-3 rounded-md bg-slate-900/80 px-2 py-1 text-[11px] font-semibold text-white">
                Foto Dokumentasi Barang {item.type === "lost" ? "Hilang" : "Temuan"}
              </span>
            </div>

            {item.reward && (
              <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-[13px] font-bold text-amber-800 ring-1 ring-inset ring-amber-200" role="note">
                Imbalan: {item.reward} — bagi yang menemukan dan mengembalikan barang ini.
              </p>
            )}

            <h2 className="mt-5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Deskripsi Barang {item.type === "lost" ? "Hilang" : "Temuan"}
            </h2>
            <div className="mt-2 space-y-3">
              {descriptionParagraphs.length > 0 ? (
                descriptionParagraphs.map((paragraph, i) => (
                  <p key={i} className="text-[13px] leading-6 text-slate-600">
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="text-[13px] leading-6 text-slate-500">
                  Pelapor belum menambahkan deskripsi untuk laporan ini.
                </p>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {[
                { label: "Tanggal Kejadian", value: formatEventDate(item.date_event) },
                { label: "Kategori", value: categoryName ?? "-" },
                { label: "Status", value: item.status === "resolved" ? "Selesai" : item.type === "lost" ? "Dicari" : "Belum Diambil" },
              ].map((spec) => (
                <div key={spec.label} className="rounded-lg bg-slate-50 px-3 py-2.5 text-center ring-1 ring-inset ring-slate-100">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{spec.label}</dt>
                  <dd className="mt-1 truncate text-[12px] font-bold text-slate-900">{spec.value}</dd>
                </div>
              ))}
            </div>
          </section>

          {/* Prosedur */}
          <section aria-labelledby="prosedur-heading" className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="prosedur-heading" className="text-[15px] font-bold text-slate-900">
                Lokasi &amp; Prosedur {item.type === "lost" ? "Pencarian" : "Pengambilan"}
              </h2>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                {item.type === "lost" ? "Bantu Pantau" : "Tersimpan Aman"}
              </span>
            </div>
            <ul className="mt-3 space-y-2 rounded-lg bg-slate-50 p-4 ring-1 ring-inset ring-slate-100">
              <li className="flex items-start gap-2 text-[12px] leading-5 text-slate-600">
                <span className="mt-0.5 text-emerald-600" aria-hidden="true">✓</span>
                Bawa <strong>KTM UPN aktif</strong> sebagai identitas saat serah terima
              </li>
              <li className="flex items-start gap-2 text-[12px] leading-5 text-slate-600">
                <span className="mt-0.5 text-emerald-600" aria-hidden="true">✓</span>
                Sebutkan <strong>ciri khusus barang</strong> untuk verifikasi kepemilikan
              </li>
              <li className="flex items-start gap-2 text-[12px] leading-5 text-slate-600">
                <span className="mt-0.5 text-emerald-600" aria-hidden="true">✓</span>
                Bertemu di <strong>tempat ramai kampus</strong> atau titipkan via pos satpam
              </li>
            </ul>
          </section>

          {/* Arsip Terkini */}
          {related.length > 0 && (
            <section aria-labelledby="arsip-heading" className="pt-1">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Arsip Terkini</p>
                  <h2 id="arsip-heading" className="mt-0.5 text-[17px] font-bold text-slate-900">
                    Laporan Barang Hilang &amp; Ditemukan Sekitar Kampus
                  </h2>
                </div>
                <Link href="/lost-found" className="shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline">
                  Lihat Semua Laporan →
                </Link>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((entry) => (
                  <article
                    key={entry.id}
                    className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-colors hover:border-slate-300 focus-within:ring-2 focus-within:ring-[#002147] focus-within:ring-offset-2"
                  >
                    <Link href={`/lost-found/${entry.id}`} aria-label={`Lihat detail ${entry.title}`}>
                      <span className={`relative flex aspect-[16/9] items-center justify-center ${entry.type === "lost" ? "bg-[#F3E8C8]" : "bg-[#DDE7F0]"}`}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-slate-400">
                          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.3" />
                          <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.3" />
                          <path d="M3 16L8.5 11L13 15.5L16 13L21 18" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
                        </svg>
                        <span className={`absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${entry.type === "lost" ? "bg-amber-500" : "bg-indigo-500"}`}>
                          {entry.type === "lost" ? "Hilang (Dicari)" : "Ditemukan"}
                        </span>
                        <span className="absolute bottom-2 right-2 rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {formatTimeAgo(entry.created_at)}
                        </span>
                      </span>
                    </Link>
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="line-clamp-1 text-[13px] font-bold text-slate-900">
                        <Link href={`/lost-found/${entry.id}`} className="hover:underline focus:outline-none">
                          {entry.title}
                        </Link>
                      </h3>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">
                        {entry.description ?? "Tidak ada deskripsi."}
                      </p>
                      <p className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                        <span className="truncate">◎ {entry.location}</span>
                        <span className={`shrink-0 font-bold ${entry.status === "resolved" ? "text-slate-400" : entry.type === "lost" ? "text-amber-700" : "text-emerald-700"}`}>
                          {entry.status === "resolved" ? "Selesai" : entry.type === "lost" ? "Klaim Aktif" : "Tersimpan"}
                        </span>
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right column */}
        <div className="min-w-0 space-y-5 lg:sticky lg:top-24">
          <aside aria-label="Klaim kepemilikan" className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-[14px] font-bold text-slate-900">Klaim Kepemilikan</h2>
            <p className="mt-1 text-[12px] leading-5 text-slate-500">
              {item.type === "lost"
                ? "Melihat barang ini? Hubungi pelapor agar barang kembali ke pemiliknya."
                : "Apakah ini barang Anda? Ajukan klaim dan hubungi pelapor untuk verifikasi."}
            </p>
            <button
              type="button"
              onClick={() => setClaimNotice(true)}
              className="mt-3 w-full rounded-lg bg-indigo-500 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              {item.type === "lost" ? "Saya Melihat Barang Ini" : "Klaim Barang Ini"}
            </button>
            {claimNotice && (
              <p role="status" className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-4 text-slate-500">
                Fitur klaim online segera hadir. Sementara waktu, hubungi kontak di bawah untuk koordinasi.
              </p>
            )}
            {waNumber ? (
              <a
                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Halo, saya menanggapi laporan "${item.title}" di UPN Student Hub.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-emerald-600">
                  <path d="M8 1.5C4.4 1.5 1.5 4.4 1.5 8C1.5 9.4 1.9 10.7 2.6 11.8L1.5 14.5L4.3 13.4C5.4 14.1 6.6 14.5 8 14.5C11.6 14.5 14.5 11.6 14.5 8C14.5 4.4 11.6 1.5 8 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
                Hubungi via WhatsApp
              </a>
            ) : (
              item.contact_info && (
                <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[12px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-100">
                  Kontak: {item.contact_info}
                </p>
              )
            )}
            <p className="mt-3 text-center text-[10px] font-medium text-slate-400">
              🛡 Verifikasi Aman Terpadu UPN
            </p>
          </aside>

          <aside aria-label="Pelapor" className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {item.type === "lost" ? "Pelapor" : "Penemu / Pelapor"}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white" aria-hidden="true">
                {ownerInitials(reporterName)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-900">{reporterName}</span>
                <span className="block truncate text-xs text-slate-500">Mahasiswa UPN</span>
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void toggleFavorite()}
                aria-pressed={isFavorite}
                aria-label={isFavorite ? `Hapus ${item.title} dari favorit` : `Simpan ${item.title} ke favorit`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill={isFavorite ? "currentColor" : "none"} aria-hidden="true" className={isFavorite ? "text-red-600" : ""}>
                  <path d="M8 13.2L3.4 8.9C2.1 7.7 2.1 5.7 3.4 4.4C4.6 3.1 6.5 3.1 7.7 4.4L8 4.7L8.3 4.4C9.5 3.1 11.4 3.1 12.6 4.4C13.9 5.7 13.9 7.7 12.6 8.9L8 13.2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
                {isFavorite ? "Tersimpan" : "Simpan"}
              </button>
              <button
                type="button"
                onClick={() => void handleShare()}
                aria-label={`Bagikan ${item.title}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
              >
                Bagikan
              </button>
            </div>
            {shareNotice && (
              <p role="status" className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-4 text-slate-500">
                {shareNotice}
              </p>
            )}
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="mt-2 w-full text-center text-[11px] font-medium text-slate-400 hover:text-red-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
            >
              Laporkan postingan ini
            </button>
          </aside>
        </div>
      </div>

      <ReportModal
        open={reportOpen}
        title={item.title}
        type="lostfound"
        id={item.id}
        onClose={() => setReportOpen(false)}
      />
    </div>
  );
}
