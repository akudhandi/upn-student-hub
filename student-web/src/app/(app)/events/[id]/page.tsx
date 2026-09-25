"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, type ApiError } from "@/lib/api";
import { useFavorite } from "@/lib/interactions";
import ReportModal from "@/components/ReportModal";

// ---------------------------------------------------------------------------
// API types — shape of GET /api/v1/events/{id} (standard { message, data }
// JSON envelope, detail of a single campus event).
// ---------------------------------------------------------------------------
type ApiSpeaker = {
  name: string;
  role?: string | null;
  organization?: string | null;
  topic?: string | null;
};

type ApiContactPic = {
  name: string;
  whatsapp?: string | null;
  email?: string | null;
};

type ApiDoc = { name: string; meta?: string | null };

type ApiEventDetail = {
  id: number;
  title: string;
  slug: string;
  event_code?: string | null;
  description: string | null;
  organizer_name: string;
  event_date: string;
  event_time?: string | null;
  location: string;
  registration_link?: string | null;
  speakers?: ApiSpeaker[] | null;
  benefits?: string[] | null;
  contact_pics?: ApiContactPic[] | null;
  documents?: ApiDoc[] | null;
  status: string;
  created_at: string;
  user?: { id: number; name: string } | null;
  category?: { id: number; name: string; slug: string } | null;
};

type EventDetailResponse = {
  message: string;
  data: ApiEventDetail;
};

type EventListResponse = {
  message: string;
  data: {
    current_page: number;
    last_page: number;
    total: number;
    data: ApiEventDetail[];
  };
};

function formatLongDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
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

function DetailSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Memuat detail event"
      className="mx-auto max-w-[1180px]"
    >
      <div className="h-3 w-72 animate-pulse rounded bg-slate-100" />
      <div className="mt-4 aspect-[16/7] animate-pulse rounded-xl bg-slate-100" />
      <div className="mt-4 h-7 w-2/3 animate-pulse rounded bg-slate-100" />
      <div className="mt-5 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-3 rounded-xl border border-gray-200 bg-white p-5">
          <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-5">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
          <div className="mt-3 h-10 w-full animate-pulse rounded-md bg-slate-100" />
        </div>
      </div>
      <span className="sr-only">Memuat detail event…</span>
    </div>
  );
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [item, setItem] = useState<ApiEventDetail | null>(null);
  const [related, setRelated] = useState<ApiEventDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isFavorite, toggle: toggleFavorite } = useFavorite("event", id);
  const [reportOpen, setReportOpen] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const loadDetail = useCallback(async (itemId: string, signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setIsNotFound(false);
      setError(null);
      const res = await apiFetch<EventDetailResponse>(
        `/v1/events/${encodeURIComponent(itemId)}`
      );
      if (signal?.aborted) return;
      setItem(res.data);
      try {
        const list = await apiFetch<EventListResponse>("/v1/events");
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
        setError("Gagal memuat detail event. Periksa koneksi ke backend lalu coba lagi.");
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

  async function handleShare(copyOnly: boolean) {
    const url = window.location.href;
    if (copyOnly) {
      try {
        await navigator.clipboard.writeText(url);
        setShareNotice("Tautan event disalin.");
      } catch {
        setShareNotice("Gagal menyalin. Salin URL dari address bar.");
      }
      return;
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`Info event UPN: ${item?.title} ${url}`)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (isNotFound || (!error && !item)) {
    return (
      <div className="mx-auto max-w-[1180px]">
        <div role="alert" className="rounded-xl border border-gray-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-900">Event tidak ditemukan</p>
          <p className="mx-auto mt-1 max-w-[380px] text-xs leading-5 text-slate-500">
            Event yang kamu cari tidak tersedia atau sudah dihapus.
          </p>
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4 inline-block rounded-lg bg-[#0A2342] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#12325e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="mx-auto max-w-[1180px]">
        <div role="alert" className="rounded-xl border border-gray-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-900">Gagal memuat detail event</p>
          <p className="mt-1 text-xs text-slate-500">{error}</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => id && void loadDetail(id)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
            >
              Coba lagi
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  const categoryName = item.category?.name ?? "Event Kampus";
  const speakers = (item.speakers ?? []).filter((s) => s.name?.trim());
  const benefits = (item.benefits ?? []).filter(Boolean);
  const pics = (item.contact_pics ?? []).filter((p) => p.name?.trim());
  const documents = (item.documents ?? []).filter((d) => d.name?.trim());
  const descriptionParagraphs = (item.description ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-[1180px]">
      {/* Breadcrumb + back */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <li><Link href="/dashboard" className="hover:text-slate-800 hover:underline">Beranda</Link></li>
            <li aria-hidden="true" className="text-slate-300">/</li>
            <li>Event &amp; Informasi</li>
            <li aria-hidden="true" className="text-slate-300">/</li>
            <li>{categoryName}</li>
            <li aria-hidden="true" className="text-slate-300">/</li>
            <li><span aria-current="page" className="font-medium text-slate-700">Detail Event</span></li>
          </ol>
        </nav>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
        >
          ← Kembali ke Daftar Event
        </button>
      </div>

      {/* Title block */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-md bg-teal-50 px-2 py-1 text-[11px] font-bold text-teal-700 ring-1 ring-inset ring-teal-100">
          Event Mahasiswa &amp; Umum
        </span>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
          {categoryName}
        </span>
      </div>
      <h1 className="mt-2 text-xl font-bold leading-7 tracking-tight text-slate-900 sm:text-2xl">
        {item.title}
      </h1>
      <p className="mt-1 text-[13px] text-slate-500">
        Diselenggarakan oleh {item.organizer_name}
      </p>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
        <span>🕒 Dipublikasikan: {formatShortDate(item.created_at)}</span>
        {item.event_code && <span># ID Event: {item.event_code}</span>}
      </p>

      <div className="mt-4 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main column */}
        <div className="min-w-0 space-y-5">
          {/* Hero */}
          <section aria-label="Banner acara" className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div
              className="relative flex aspect-[16/7] items-center justify-center bg-[#1F3A5F]"
              role="img"
              aria-label={`Banner ${item.title}`}
            >
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-white/40">
                <rect x="2" y="4" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
                <path d="M2 9H22" stroke="currentColor" strokeWidth="1.3" />
                <path d="M6 21H18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <span className="absolute bottom-3 left-3 rounded-md bg-slate-900/80 px-2 py-1 text-[11px] font-semibold text-white">
                📍 {item.location}
              </span>
            </div>
            {/* Fact grid */}
            <dl className="grid grid-cols-1 gap-2.5 p-4 sm:grid-cols-3 sm:p-5">
              {[
                { label: "Tanggal Pelaksanaan", value: formatLongDate(item.event_date) },
                { label: "Waktu Acara", value: item.event_time?.trim() || "-", note: item.event_time ? undefined : "Lihat deskripsi" },
                { label: "Lokasi Pelaksanaan", value: item.location },
              ].map((fact) => (
                <div key={fact.label} className="rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-100">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{fact.label}</dt>
                  <dd className="mt-1 text-[12px] font-bold text-slate-900">{fact.value}</dd>
                  {fact.note && <dd className="text-[10px] text-slate-400">{fact.note}</dd>}
                </div>
              ))}
            </dl>
          </section>

          {/* Description */}
          <section aria-labelledby="deskripsi-heading" className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
            <h2 id="deskripsi-heading" className="flex items-center gap-2 text-[15px] font-bold text-slate-900">
              <span className="h-4 w-1 rounded-full bg-[#0A2342]" aria-hidden="true" />
              Deskripsi &amp; Latar Belakang Acara
            </h2>
            <div className="mt-3 space-y-3">
              {descriptionParagraphs.length > 0 ? (
                descriptionParagraphs.map((paragraph, i) => (
                  <p key={i} className="text-[13px] leading-6 text-slate-600">{paragraph}</p>
                ))
              ) : (
                <p className="text-[13px] leading-6 text-slate-500">
                  Penyelenggara belum menambahkan deskripsi untuk acara ini.
                </p>
              )}
            </div>
            {benefits.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Benefit peserta">
                {benefits.map((b) => (
                  <span key={b} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
                    <span aria-hidden="true">✓</span> {b}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Speakers */}
          <section aria-labelledby="narasumber-heading" className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
            <h2 id="narasumber-heading" className="flex items-center gap-2 text-[15px] font-bold text-slate-900">
              <span className="h-4 w-1 rounded-full bg-[#0A2342]" aria-hidden="true" />
              Narasumber &amp; Moderator
            </h2>
            {speakers.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {speakers.map((speaker, i) => (
                  <div key={`${speaker.name}-${i}`} className="rounded-lg bg-slate-50 p-4 text-center ring-1 ring-inset ring-slate-100">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0A2342] text-sm font-bold text-white" aria-hidden="true">
                      {ownerInitials(speaker.name)}
                    </span>
                    <p className={`mt-2 text-[10px] font-bold uppercase tracking-wide ${speaker.role === "moderator" ? "text-indigo-600" : "text-amber-600"}`}>
                      {speaker.role === "moderator" ? "Moderator" : "Narasumber"}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[13px] font-bold text-slate-900">{speaker.name}</p>
                    {speaker.organization && (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{speaker.organization}</p>
                    )}
                    {speaker.topic && (
                      <p className="mt-1.5 line-clamp-3 text-[11px] italic leading-4 text-slate-500">
                        Topik: “{speaker.topic}”
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-[13px] text-slate-500">
                Belum ada informasi narasumber untuk acara ini.
              </p>
            )}
          </section>

          {/* Contacts */}
          <section aria-labelledby="kontak-heading" className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
            <h2 id="kontak-heading" className="flex items-center gap-2 text-[15px] font-bold text-slate-900">
              <span className="h-4 w-1 rounded-full bg-[#0A2342]" aria-hidden="true" />
              Kontak &amp; Narahubung Panitia
            </h2>
            {pics.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {pics.map((pic, i) => {
                  const wa = pic.whatsapp?.trim() ? normalizeWaNumber(pic.whatsapp.trim()) : null;
                  return (
                    <div key={`${pic.name}-${i}`} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-100">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700" aria-hidden="true">
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                          <path d="M8 1.5C4.4 1.5 1.5 4.4 1.5 8C1.5 9.4 1.9 10.7 2.6 11.8L1.5 14.5L4.3 13.4C5.4 14.1 6.6 14.5 8 14.5C11.6 14.5 14.5 11.6 14.5 8C14.5 4.4 11.6 1.5 8 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-bold text-slate-900">
                          {pic.whatsapp?.trim() || pic.name}
                        </span>
                        <span className="block truncate text-[11px] text-slate-500">{pic.name}</span>
                      </span>
                      {wa ? (
                        <a
                          href={`https://wa.me/${wa}?text=${encodeURIComponent(`Halo, saya ingin bertanya tentang event "${item.title}".`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded-md bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                        >
                          WhatsApp
                        </a>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-[13px] text-slate-500">
                Belum ada kontak panitia yang tercantum.
              </p>
            )}
          </section>

          {/* Related */}
          {related.length > 0 && (
            <section aria-labelledby="terkait-heading" className="pt-1">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="terkait-heading" className="flex items-center gap-2 text-[15px] font-bold text-slate-900">
                  <span className="h-4 w-1 rounded-full bg-amber-500" aria-hidden="true" />
                  Event &amp; Informasi Kampus Lainnya
                </h2>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline"
                >
                  Lihat Semua Event →
                </button>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((entry) => (
                  <article
                    key={entry.id}
                    className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-colors hover:border-slate-300 focus-within:ring-2 focus-within:ring-[#002147] focus-within:ring-offset-2"
                  >
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="max-w-[55%] truncate rounded-md bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-700">
                          {entry.category?.name ?? "Event Kampus"}
                        </span>
                        <span className="shrink-0 text-[10px] text-slate-400">{formatShortDate(entry.event_date)}</span>
                      </div>
                      <h3 className="mt-2 line-clamp-2 text-[13px] font-bold leading-5 text-slate-900">
                        <Link href={`/events/${entry.id}`} className="hover:underline focus:outline-none">
                          {entry.title}
                        </Link>
                      </h3>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">
                        {entry.description ?? "Tidak ada deskripsi."}
                      </p>
                      <p className="mt-2 flex items-center gap-1 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                        <span aria-hidden="true">◎</span>
                        <span className="truncate">{entry.location}</span>
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="min-w-0 space-y-5 lg:sticky lg:top-24">
          <aside aria-label="Dokumen dan lampiran" className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Dokumen &amp; Lampiran</p>
            {documents.length > 0 ? (
              <ul className="mt-2.5 space-y-2">
                {documents.map((doc, i) => (
                  <li key={`${doc.name}-${i}`} className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-100">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-50 text-[10px] font-bold text-red-600" aria-hidden="true">
                      PDF
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-semibold text-slate-900">{doc.name}</span>
                      {doc.meta && <span className="block text-[10px] text-slate-400">{doc.meta}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[12px] text-slate-500">Belum ada dokumen lampiran.</p>
            )}
          </aside>

          <aside aria-label="Kontak narahubung" className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Kontak Narahubung</p>
            {pics.length > 0 ? (
              <div className="mt-2.5 space-y-2">
                {pics.slice(0, 2).map((pic, i) => {
                  const wa = pic.whatsapp?.trim() ? normalizeWaNumber(pic.whatsapp.trim()) : null;
                  return (
                    <div key={`${pic.name}-${i}`} className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-100">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700" aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M8 1.5C4.4 1.5 1.5 4.4 1.5 8C1.5 9.4 1.9 10.7 2.6 11.8L1.5 14.5L4.3 13.4C5.4 14.1 6.6 14.5 8 14.5C11.6 14.5 14.5 11.6 14.5 8C14.5 4.4 11.6 1.5 8 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-bold text-slate-900">
                          {pic.whatsapp?.trim() || pic.name}
                        </span>
                        <span className="block truncate text-[10px] text-slate-500">{pic.name}</span>
                      </span>
                      {wa && (
                        <a
                          href={`https://wa.me/${wa}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-[12px] text-slate-500">Belum ada kontak panitia.</p>
            )}
          </aside>

          <aside aria-label="Bagikan info" className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Bagikan Info:</p>
              <div className="flex flex-1 gap-2">
                <button
                  type="button"
                  onClick={() => void handleShare(true)}
                  className="flex-1 rounded-md bg-slate-100 px-2 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]"
                >
                  Salin Tautan
                </button>
                <button
                  type="button"
                  onClick={() => void handleShare(false)}
                  className="flex-1 rounded-md bg-emerald-100 px-2 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  WhatsApp
                </button>
              </div>
            </div>
            {shareNotice && (
              <p role="status" className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-4 text-slate-500">
                {shareNotice}
              </p>
            )}
            <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
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
            </div>
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
        type="event"
        id={item.id}
        onClose={() => setReportOpen(false)}
      />
    </div>
  );
}
