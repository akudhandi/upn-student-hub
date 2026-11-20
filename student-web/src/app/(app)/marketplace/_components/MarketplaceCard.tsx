"use client";

import Link from "next/link";
import ListingImage from "@/components/ListingImage";
import VerifiedBadge from "@/components/VerifiedBadge";
import { formatRupiah, formatTimeAgo, initialsOf } from "@/lib/formatters";
import type { ApiImage } from "@/lib/images";

export type ApiMarketplaceItem = {
  id: number;
  title: string;
  description: string | null;
  price: number | string;
  condition: string;
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

export const CONDITION_META: Record<string, { label: string; badgeClass: string }> = {
  new: {
    label: "Baru",
    badgeClass: "bg-[#E4F2EA] text-[#1E603E]",
  },
  "like-new": {
    label: "Seperti baru",
    badgeClass: "bg-[#E4F2EA] text-[#1E603E]",
  },
  good: {
    label: "Layak pakai",
    badgeClass: "bg-[#F4F1EE] text-[#57534E]",
  },
  fair: {
    label: "Perlu perbaikan",
    badgeClass: "bg-[#FDF6EB] text-[#7C4A12]",
  },
};

export function SellerAvatar({ name }: { name: string }) {
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

export function ItemCardSkeleton() {
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

export function MarketplaceCard({
  item,
  eager,
  isFavorited,
  isTogglingFavorite,
  onToggleFavorite,
}: {
  item: ApiMarketplaceItem;
  eager: boolean;
  isFavorited: boolean;
  isTogglingFavorite: boolean;
  onToggleFavorite: (item: ApiMarketplaceItem) => void;
}) {
  const categoryName = item.category?.name ?? "Lainnya";
  const sellerName = item.user?.name ?? "Mahasiswa UPN";
  const conditionInfo = CONDITION_META[item.condition] ?? {
    label: item.condition,
    badgeClass: "bg-[#F4F1EE] text-[#57534E]",
  };
  const photoCount = item.images?.length ?? 0;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white transition-all duration-180 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[2px] hover:border-[#CFC8BF] hover:shadow-[0_14px_28px_-14px_rgba(20,20,22,0.10)] focus-within:ring-2 focus-within:ring-[#141416]">
      {/* Media Frame */}
      <div className="relative overflow-hidden bg-[#EFECE8]">
        <ListingImage
          module="marketplace"
          seed={item.id}
          eager={eager}
          hint={`${categoryName} ${item.title}`}
          images={item.images}
          alt={`Foto ${item.title}`}
          className="aspect-[4/3] w-full object-cover transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:scale-[1.03]"
        />

        {/* Quick Favorite Button (44px touch target, matte high-contrast surface) */}
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
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-md bg-[#F4F1EE] px-2.5 py-1 text-[13px] font-medium text-[#57534E]">
            {categoryName}
          </span>
          {conditionInfo.label && (
            <span
              className={`rounded-md px-2.5 py-1 text-[13px] font-medium ${conditionInfo.badgeClass}`}
            >
              {conditionInfo.label}
            </span>
          )}
        </div>

        <h2 className="mt-3 line-clamp-2 font-display text-[16px] font-semibold leading-snug text-[#141416]">
          <Link
            href={`/marketplace/${item.id}`}
            className="after:absolute after:inset-0 hover:underline focus:outline-none"
          >
            {item.title}
          </Link>
        </h2>

        <p className="mt-1.5 font-display text-[20px] font-bold tracking-tight text-[#141416]">
          {formatRupiah(item.price)}
        </p>

        <p className="mt-2 line-clamp-2 flex-1 text-[14px] leading-relaxed text-[#57534E]">
          {item.description ?? "Tidak ada deskripsi tambahan."}
        </p>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#F1EDE8] pt-4">
          <span className="flex min-w-0 items-center gap-2">
            <SellerAvatar name={sellerName} />
            <span className="truncate text-[13px] font-medium text-[#141416]">
              {sellerName}
            </span>
            {item.user?.is_official_account && (
              <VerifiedBadge
                size="xs"
                title="Akun resmi terverifikasi UPN"
              />
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
