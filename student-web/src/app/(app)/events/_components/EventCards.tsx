"use client";

import Link from "next/link";
import ListingImage from "@/components/ListingImage";
import VerifiedBadge, { isVerifiedEventOrganizer } from "@/components/VerifiedBadge";
import { formatShortDate } from "@/lib/formatters";
import type { ApiImage } from "@/lib/images";

// API type for GET /api/v1/events (Laravel paginator in { message, data } envelope).
export type ApiEventItem = {
  id: number;
  title: string;
  slug: string;
  event_code?: string | null;
  description: string | null;
  organizer_name: string;
  event_date: string;
  event_time?: string | null;
  location: string;
  status: string;
  is_verified?: boolean;
  created_at: string;
  user?: { id: number; name: string; account_type?: string } | null;
  category?: { id: number; name: string; slug: string } | null;
  images?: ApiImage[] | null;
};

function isUpcomingEvent(isoDate: string): boolean {
  const ts = new Date(isoDate).getTime();
  if (Number.isNaN(ts)) return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return ts >= startOfToday.getTime();
}

function formatLongDateTime(item: ApiEventItem): string {
  const date = new Date(item.event_date);
  if (Number.isNaN(date.getTime())) return "-";
  const day = date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return item.event_time?.trim() ? `${day} · ${item.event_time.trim()}` : day;
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M5.5 1.8v2.4M10.5 1.8v2.4M2 6.5h12"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M8 14C8 14 3.5 9.3 3.5 6C3.5 3.5 5.5 1.5 8 1.5C10.5 1.5 12.5 3.5 12.5 6C12.5 9.3 8 14 8 14Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 20 20"
      fill={filled ? "currentColor" : "none"}
      aria-hidden="true"
    >
      <path
        d="M10 17.2l-1.15-1.05C4.7 12.4 2 9.95 2 6.95 2 4.5 3.92 2.6 6.35 2.6c1.38 0 2.7.65 3.65 1.66A4.9 4.9 0 0 1 13.65 2.6C16.08 2.6 18 4.5 18 6.95c0 3-2.7 5.45-6.85 9.2L10 17.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white">
      <div className="aspect-[16/9] animate-pulse bg-[#EFECE8]" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="h-6 w-24 animate-pulse rounded-md bg-[#F4F1EE]" />
          <div className="h-6 w-20 animate-pulse rounded-md bg-[#F4F1EE]" />
        </div>
        <div className="h-5 w-4/5 animate-pulse rounded-lg bg-[#F4F1EE]" />
        <div className="h-4 w-1/2 animate-pulse rounded-lg bg-[#F4F1EE]" />
        <div className="h-4 w-full animate-pulse rounded-lg bg-[#F4F1EE]" />
        <div className="mt-auto space-y-2 border-t border-[#F1EDE8] pt-4">
          <div className="h-4 w-2/3 animate-pulse rounded-lg bg-[#F4F1EE]" />
          <div className="h-4 w-1/2 animate-pulse rounded-lg bg-[#F4F1EE]" />
        </div>
      </div>
    </div>
  );
}

export function FeaturedEventCard({
  item,
  isFavorited,
  isTogglingFavorite,
  onToggleFavorite,
}: {
  item: ApiEventItem;
  isFavorited: boolean;
  isTogglingFavorite: boolean;
  onToggleFavorite: (item: ApiEventItem) => void;
}) {
  return (
    <article className="group relative grid grid-cols-1 overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white transition-all duration-180 ease-[cubic-bezier(.2,.8,.2,1)] hover:border-[#CFC8BF] hover:shadow-[0_14px_28px_-14px_rgba(20,20,22,0.10)] focus-within:ring-2 focus-within:ring-[#141416] lg:grid-cols-[1.08fr_1fr] motion-reduce:transition-none">
      <div className="relative overflow-hidden bg-[#EFECE8] lg:h-full">
        <ListingImage
          module="event"
          seed={item.id}
          eager
          width={800}
          height={500}
          hint={`${item.category?.name ?? ""} ${item.title}`}
          images={item.images}
          alt={`Poster ${item.title}`}
          className="aspect-[16/10] h-full w-full object-cover transition-transform duration-600 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
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
          className={`absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 disabled:opacity-60 ${
            isFavorited
              ? "border-[#141416] bg-[#141416] text-white"
              : "border-[#E5E0DA] bg-white text-[#141416] hover:border-[#141416]"
          }`}
        >
          <HeartIcon filled={isFavorited} />
        </button>

        {(item.images?.length ?? 0) > 1 && (
          <span className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-[#141416]/85 px-2.5 py-1 text-[13px] font-medium text-white">
            {item.images?.length} foto
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col justify-between p-5 sm:p-7">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[#F4F1EE] px-2.5 py-1 text-[13px] font-medium text-[#57534E]">
              {item.category?.name ?? "Event Kampus"}
            </span>
            <span
              className={`rounded-md px-2.5 py-1 text-[13px] font-medium ${
                isUpcomingEvent(item.event_date)
                  ? "bg-[#E4F2EA] text-[#1E603E]"
                  : "bg-[#EFECE8] text-[#5F5B57]"
              }`}
            >
              {isUpcomingEvent(item.event_date) ? "Segera hadir" : "Telah berlangsung"}
            </span>
          </div>

          <h2 className="mt-3 line-clamp-2 break-words font-display text-xl font-semibold leading-snug tracking-tight text-[#141416] sm:text-[24px]">
            <Link
              href={`/events/${item.id}`}
              className="after:absolute after:inset-0 hover:underline focus:outline-none"
            >
              {item.title}
            </Link>
          </h2>

          <p className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 text-[13px] font-medium text-[#57534E]">
            <span className="truncate">{item.organizer_name}</span>
            {isVerifiedEventOrganizer(item) && <VerifiedBadge showLabel size="xs" />}
          </p>

          <p className="mt-3 line-clamp-3 break-words text-[14px] leading-relaxed text-[#57534E]">
            {item.description ?? "Informasi lengkap kegiatan tersedia pada halaman detail acara."}
          </p>
        </div>

        <div className="mt-5 space-y-4 border-t border-[#F1EDE8] pt-4">
          <div className="space-y-1.5 text-[13px]">
            <p className="flex min-w-0 items-center gap-2 font-medium text-[#141416]">
              <CalendarIcon />
              <span className="min-w-0 break-words">{formatLongDateTime(item)}</span>
            </p>
            <p className="flex min-w-0 items-center gap-2 text-[#57534E]">
              <LocationIcon />
              <span className="truncate">{item.location}</span>
            </p>
          </div>

          <span
            aria-hidden="true"
            className="inline-flex min-h-[44px] w-fit items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:-translate-y-[1px] group-hover:bg-[#242428] motion-reduce:transform-none motion-reduce:transition-none"
          >
            Lihat detail acara
          </span>
        </div>
      </div>
    </article>
  );
}

export function EventGridCard({
  item,
  eager,
  isFavorited,
  isTogglingFavorite,
  onToggleFavorite,
}: {
  item: ApiEventItem;
  eager: boolean;
  isFavorited: boolean;
  isTogglingFavorite: boolean;
  onToggleFavorite: (item: ApiEventItem) => void;
}) {
  const categoryName = item.category?.name ?? "Event Kampus";
  const upcoming = isUpcomingEvent(item.event_date);
  const photoCount = item.images?.length ?? 0;

  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white transition-all duration-180 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[2px] hover:border-[#CFC8BF] hover:shadow-[0_14px_28px_-14px_rgba(20,20,22,0.10)] focus-within:ring-2 focus-within:ring-[#141416] motion-reduce:transform-none motion-reduce:transition-none">
      <div className="relative overflow-hidden bg-[#EFECE8]">
        <ListingImage
          module="event"
          seed={item.id}
          eager={eager}
          width={800}
          height={450}
          hint={`${categoryName} ${item.title}`}
          images={item.images}
          alt={`Poster ${item.title}`}
          className="aspect-[16/9] w-full object-cover transition-transform duration-600 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
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
          <HeartIcon filled={isFavorited} />
        </button>

        {photoCount > 1 && (
          <span className="pointer-events-none absolute bottom-2.5 right-2.5 rounded-md bg-[#141416]/85 px-2.5 py-1 text-[13px] font-medium text-white">
            {photoCount} foto
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="max-w-[58%] truncate rounded-md bg-[#F4F1EE] px-2.5 py-1 text-[13px] font-medium text-[#57534E]">
            {categoryName}
          </span>
          <span
            className={`shrink-0 rounded-md px-2.5 py-1 text-[13px] font-medium ${
              upcoming
                ? "bg-[#E4F2EA] text-[#1E603E]"
                : "bg-[#EFECE8] text-[#5F5B57]"
            }`}
          >
            {upcoming ? "Segera hadir" : "Selesai"}
          </span>
        </div>

        <h3 className="mt-3 line-clamp-2 break-words font-display text-[16px] font-semibold leading-snug text-[#141416]">
          <Link
            href={`/events/${item.id}`}
            className="after:absolute after:inset-0 hover:underline focus:outline-none"
          >
            {item.title}
          </Link>
        </h3>

        <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-[#57534E]">
          <span className="truncate">{item.organizer_name}</span>
          {isVerifiedEventOrganizer(item) && <VerifiedBadge size="xs" />}
        </p>

        <p className="mt-2 line-clamp-2 flex-1 break-words text-[14px] leading-relaxed text-[#57534E]">
          {item.description ?? "Informasi lengkap tersedia pada halaman detail acara."}
        </p>

        <div className="mt-4 space-y-1.5 border-t border-[#F1EDE8] pt-4 text-[13px]">
          <p className="flex items-center gap-1.5 font-medium text-[#141416]">
            <CalendarIcon />
            <span className="truncate">
              {formatShortDate(item.event_date)}
              {item.event_time?.trim() ? ` · ${item.event_time.trim()}` : ""}
            </span>
          </p>
          <p className="flex min-w-0 items-center gap-1.5 text-[#6E6A66]">
            <LocationIcon />
            <span className="truncate">{item.location}</span>
          </p>
        </div>
      </div>
    </article>
  );
}
