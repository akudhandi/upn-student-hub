"use client";

import Link from "next/link";
import ListingImage from "@/components/ListingImage";
import VerifiedBadge from "@/components/VerifiedBadge";
import type { ApiImage } from "@/lib/images";
import {
  formatOptionalShortDate,
  formatTimeAgo,
  initialsOf,
} from "@/lib/formatters";

export type ApiLostFoundItem = {
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
  user?: {
    id: number;
    name: string;
    is_official_account?: boolean;
  } | null;
  images?: ApiImage[] | null;
  category?: { id: number; name: string; slug: string } | null;
};

export function StatusBadge({ type, status }: { type: "lost" | "found"; status: string }) {
  if (status === "resolved" || status === "closed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#EFECE8] px-2.5 py-1 text-[13px] font-medium text-[#3F3C39]">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M3 8.5L6.5 12L13 4.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {status === "closed" ? "Ditutup" : "Selesai"}
      </span>
    );
  }
  if (type === "lost") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#FCEAE9] px-2.5 py-1 text-[13px] font-medium text-[#9A3434]">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M8 2L14.5 13H1.5L8 2Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M8 6.5V9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="8" cy="11.3" r="0.8" fill="currentColor" />
        </svg>
        Hilang
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-[#E4F2EA] px-2.5 py-1 text-[13px] font-medium text-[#1E603E]">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M5.5 8.2L7.4 10L10.6 6.4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Ditemukan
    </span>
  );
}

export function ReportCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white">
      <div className="aspect-[4/3] animate-pulse bg-[#EFECE8]" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="h-6 w-24 animate-pulse rounded-md bg-[#F4F1EE]" />
          <div className="h-6 w-20 animate-pulse rounded-md bg-[#F4F1EE]" />
        </div>
        <div className="h-5 w-4/5 animate-pulse rounded-lg bg-[#F4F1EE]" />
        <div className="h-4 w-3/5 animate-pulse rounded-lg bg-[#EFECE8]" />
        <div className="h-4 w-full animate-pulse rounded-lg bg-[#F4F1EE]" />
        <div className="mt-auto flex items-center justify-between border-t border-[#F1EDE8] pt-4">
          <div className="h-7 w-28 animate-pulse rounded-full bg-[#F4F1EE]" />
          <div className="h-4 w-16 animate-pulse rounded-lg bg-[#F4F1EE]" />
        </div>
      </div>
    </div>
  );
}

export function ReportCard({
  item,
  eager = false,
  isFavorited,
  isTogglingFavorite,
  onToggleFavorite,
}: {
  item: ApiLostFoundItem;
  eager?: boolean;
  isFavorited: boolean;
  isTogglingFavorite: boolean;
  onToggleFavorite: (item: ApiLostFoundItem) => void;
}) {
  const categoryName = item.category?.name ?? "Lainnya";
  const reporterName = item.user?.name ?? "Mahasiswa UPN";
  const eventDateText =
    formatOptionalShortDate(item.date_event) ?? formatTimeAgo(item.created_at);
  const photoCount = item.images?.length ?? 0;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white transition-all duration-180 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[2px] hover:border-[#CFC8BF] hover:shadow-[0_14px_28px_-14px_rgba(20,20,22,0.10)] focus-within:ring-2 focus-within:ring-[#141416]">
      {/* Media Frame */}
      <div className="relative overflow-hidden bg-[#EFECE8]">
        <ListingImage
          module="lostfound"
          seed={item.id}
          eager={eager}
          width={800}
          height={600}
          hint={`${categoryName} ${item.title}`}
          images={item.images}
          alt={`Foto ${item.title}`}
          className="aspect-[4/3] w-full object-cover transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:scale-[1.03]"
        />

        <button
          type="button"
          onClick={() => onToggleFavorite(item)}
          disabled={isTogglingFavorite}
          aria-pressed={isFavorited}
          aria-label={
            isFavorited
              ? `Hapus ${item.title} dari favorit`
              : `Simpan ${item.title} ke favorit`
          }
          className={`absolute right-2.5 top-2.5 z-10 flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 disabled:opacity-60 ${
            isFavorited
              ? "border-[#141416] bg-[#141416] text-white"
              : "border-[#E5E0DA] bg-white text-[#141416] hover:border-[#141416]"
          }`}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 20 20"
            fill={isFavorited ? "currentColor" : "none"}
            aria-hidden="true"
          >
            <path
              d="M10 17.2l-1.15-1.05C4.7 12.4 2 9.95 2 6.95 2 4.5 3.92 2.6 6.35 2.6c1.38 0 2.7.65 3.65 1.66A4.9 4.9 0 0 1 13.65 2.6C16.08 2.6 18 4.5 18 6.95c0 3-2.7 5.45-6.85 9.2L10 17.2Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {photoCount > 1 && (
          <span className="pointer-events-none absolute bottom-2.5 right-2.5 rounded-md bg-[#141416]/85 px-2.5 py-1 text-[13px] font-medium text-white">
            {photoCount} foto
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-md bg-[#F4F1EE] px-2.5 py-1 text-[13px] font-medium text-[#57534E]">
            {categoryName}
          </span>
          <StatusBadge type={item.type} status={item.status} />
        </div>

        <h2 className="mt-3 line-clamp-2 break-words font-display text-[16px] font-semibold leading-snug text-[#141416]">
          <Link
            href={`/lost-found/${item.id}`}
            className="after:absolute after:inset-0 hover:underline focus:outline-none"
          >
            {item.title}
          </Link>
        </h2>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#57534E]">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className="shrink-0 text-[#6E6A66]"
            >
              <path
                d="M8 14C8 14 3.5 9.3 3.5 6C3.5 3.5 5.5 1.5 8 1.5C10.5 1.5 12.5 3.5 12.5 6C12.5 9.3 8 14 8 14Z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
              <circle cx="8" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            <span className="truncate">{item.location}</span>
          </span>
          {eventDateText && (
            <span className="shrink-0 text-[#6E6A66]">{eventDateText}</span>
          )}
        </div>

        {item.reward && (
          <p className="mt-2.5 w-fit rounded-md bg-[#FAF4E8] px-2.5 py-1 text-[13px] font-semibold text-[#78440E]">
            Imbalan: {item.reward}
          </p>
        )}

        <p className="mt-2.5 line-clamp-2 flex-1 break-words text-[14px] leading-relaxed text-[#57534E]">
          {item.description ?? "Tidak ada deskripsi tambahan."}
        </p>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#F1EDE8] pt-4">
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#141416] text-[13px] font-semibold text-white"
              aria-hidden="true"
            >
              {initialsOf(reporterName)}
            </span>
            <span className="truncate text-[13px] font-medium text-[#141416]">
              {reporterName}
            </span>
            {item.user?.is_official_account && (
              <VerifiedBadge size="xs" title="Akun resmi terverifikasi UPN" />
            )}
          </span>
          <span className="shrink-0 text-[13px] text-[#6E6A66]">
            {formatTimeAgo(item.created_at)}
          </span>
        </div>
      </div>
    </article>
  );
}
