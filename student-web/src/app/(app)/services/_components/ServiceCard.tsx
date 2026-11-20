"use client";

import Link from "next/link";
import ListingImage from "@/components/ListingImage";
import VerifiedBadge from "@/components/VerifiedBadge";
import type { ApiImage } from "@/lib/images";
import { formatRupiah, formatTimeAgo, initialsOf } from "@/lib/formatters";

export type ApiServiceItem = {
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
  user?: {
    id: number;
    name: string;
    is_official_account?: boolean;
  } | null;
  category?: { id: number; name: string; slug: string } | null;
  images?: ApiImage[] | null;
};

export const PRICING_META: Record<string, { label: string; badgeClass: string }> = {
  starting_from: {
    label: "Mulai dari",
    badgeClass: "bg-[#F4F1EE] text-[#57534E]",
  },
  fixed: {
    label: "Tarif tetap",
    badgeClass: "bg-[#E4F2EA] text-[#1E603E]",
  },
  per_hour: {
    label: "Per jam",
    badgeClass: "bg-[#F4F1EE] text-[#57534E]",
  },
  negotiable: {
    label: "Negosiasi",
    badgeClass: "bg-[#FDF6EB] text-[#7C4A12]",
  },
};

export function formatPriceRange(min: number | string, max: number | string | null): string {
  if (max === null || max === undefined || max === "" || Number(max) <= 0) {
    return formatRupiah(min);
  }
  if (Number(max) === Number(min)) {
    return formatRupiah(min);
  }
  return `${formatRupiah(min)} - ${formatRupiah(max)}`;
}

export function ProviderAvatar({ name }: { name: string }) {
  const initials = initialsOf(name);
  return (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#141416] text-[13px] font-semibold text-white"
    >
      {initials}
    </span>
  );
}

export function ServiceCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white">
      <div className="aspect-[4/3] animate-pulse bg-[#EFECE8]" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="h-6 w-24 animate-pulse rounded-md bg-[#F4F1EE]" />
          <div className="h-6 w-20 animate-pulse rounded-md bg-[#F4F1EE]" />
        </div>
        <div className="h-5 w-4/5 animate-pulse rounded-lg bg-[#F4F1EE]" />
        <div className="h-6 w-2/5 animate-pulse rounded-lg bg-[#EFECE8]" />
        <div className="h-4 w-full animate-pulse rounded-lg bg-[#F4F1EE]" />
        <div className="mt-auto flex items-center justify-between border-t border-[#F1EDE8] pt-4">
          <div className="h-6 w-28 animate-pulse rounded-full bg-[#F4F1EE]" />
          <div className="h-4 w-16 animate-pulse rounded-lg bg-[#F4F1EE]" />
        </div>
      </div>
    </div>
  );
}

export function ServiceCard({
  item,
  eager = false,
  isFavorited,
  isTogglingFavorite,
  onToggleFavorite,
}: {
  item: ApiServiceItem;
  eager?: boolean;
  isFavorited: boolean;
  isTogglingFavorite: boolean;
  onToggleFavorite: (item: ApiServiceItem) => void;
}) {
  const categoryName = item.category?.name ?? "Lainnya";
  const providerName = item.user?.name ?? "Mahasiswa UPN";
  const pricingInfo = item.pricing_type
    ? (PRICING_META[item.pricing_type] ?? {
        label: item.pricing_type,
        badgeClass: "bg-[#F4F1EE] text-[#57534E]",
      })
    : null;
  const priceText =
    item.pricing_type === "per_hour"
      ? `${formatPriceRange(item.price_min, item.price_max)} / jam`
      : formatPriceRange(item.price_min, item.price_max);
  const footerMeta = item.estimated_time?.trim() || formatTimeAgo(item.created_at);
  const photoCount = item.images?.length ?? 0;

  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white transition-all duration-180 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[2px] hover:border-[#CFC8BF] hover:shadow-[0_14px_28px_-14px_rgba(20,20,22,0.10)] focus-within:ring-2 focus-within:ring-[#141416]">
      {/* Media Frame */}
      <div className="relative overflow-hidden bg-[#EFECE8]">
        <ListingImage
          module="service"
          seed={item.id}
          eager={eager}
          width={800}
          height={600}
          hint={`${categoryName} ${item.title}`}
          images={item.images}
          alt={`Foto layanan ${item.title}`}
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
          {pricingInfo && (
            <span
              className={`rounded-md px-2.5 py-1 text-[13px] font-medium ${pricingInfo.badgeClass}`}
            >
              {pricingInfo.label}
            </span>
          )}
        </div>

        <h2 className="mt-3 line-clamp-2 break-words font-display text-[16px] font-semibold leading-snug text-[#141416]">
          <Link
            href={`/services/${item.id}`}
            className="after:absolute after:inset-0 hover:underline focus:outline-none"
          >
            {item.title}
          </Link>
        </h2>

        <p className="mt-1.5 font-display text-[20px] font-bold tracking-tight text-[#141416]">
          {priceText}
        </p>

        <p className="mt-2 line-clamp-2 flex-1 break-words text-[14px] leading-relaxed text-[#57534E]">
          {item.description ?? "Tidak ada deskripsi tambahan."}
        </p>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#F1EDE8] pt-4">
          <span className="flex min-w-0 items-center gap-2">
            <ProviderAvatar name={providerName} />
            <span className="truncate text-[13px] font-medium text-[#141416]">
              {providerName}
            </span>
            {item.user?.is_official_account && (
              <VerifiedBadge size="xs" title="Akun resmi terverifikasi UPN" />
            )}
          </span>
          {footerMeta && (
            <span className="shrink-0 text-[13px] text-[#6E6A66]">{footerMeta}</span>
          )}
        </div>
      </div>
    </article>
  );
}
