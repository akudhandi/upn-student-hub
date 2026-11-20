import type { ApiError } from "@/lib/api";
import { UPN_FACULTIES } from "@/lib/constants";
import { formatRupiah } from "@/lib/formatters";
import type { ApiImage } from "@/lib/images";

export const FAKULTAS_OPTIONS = UPN_FACULTIES;

export const INPUT_CLASS =
  "mt-1.5 h-11 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 text-[14px] text-[#141416] placeholder:text-[#66625E] transition-all focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none";

export const SELECT_CLASS =
  "h-11 w-full appearance-none rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] pl-3.5 pr-9 text-[14px] text-[#141416] transition-all hover:border-[#CFC8BF] focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none";

export const TEXTAREA_CLASS =
  "mt-1.5 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] p-3.5 text-[14px] leading-relaxed text-[#141416] placeholder:text-[#66625E] transition-all focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none";

export type CategoryBrief = { id: number; name: string; slug: string };

export type RawMarketplaceItem = {
  id: number;
  title: string;
  description: string;
  price: number | string;
  condition: string;
  status: string;
  category_id: number | null;
  created_at: string;
  category?: CategoryBrief | null;
  images?: ApiImage[] | null;
};

export type RawServiceItem = {
  id: number;
  title: string;
  description: string;
  price_min: number | string;
  price_max: number | string | null;
  estimated_time?: string | null;
  whatsapp_number?: string | null;
  status: string;
  category_id: number | null;
  created_at: string;
  category?: CategoryBrief | null;
  images?: ApiImage[] | null;
};

export type RawLostFoundItem = {
  id: number;
  type: "lost" | "found" | string;
  title: string;
  description: string;
  location: string;
  contact_info: string;
  reward?: string | null;
  status: string;
  category_id: number | null;
  created_at: string;
  category?: CategoryBrief | null;
  images?: ApiImage[] | null;
};

export type ReceivedReview = {
  id: number;
  rating: number;
  review: string | null;
  created_at: string;
  reviewer_name: string;
  target_title: string;
};

export type MeResponse = {
  message: string;
  data: {
    user: import("@/lib/auth").AuthUser;
    stats: {
      active_listings_count: number;
      completed_count: number;
      rating_average: number;
      rating_count: number;
    };
    listings: {
      marketplace: RawMarketplaceItem[];
      services: RawServiceItem[];
      lost_found: RawLostFoundItem[];
    };
    reviews: ReceivedReview[];
  };
};

export type UnifiedKind = "marketplace" | "service" | "lostfound";
export type ModuleFilter = "all" | UnifiedKind;

export type UnifiedMyItem = {
  uid: string;
  kind: UnifiedKind;
  id: number;
  title: string;
  description: string;
  badge: string;
  toneClass: string;
  status: string;
  statusLabel: string;
  statusToneClass: string;
  isCompleted: boolean;
  priceLabel?: string;
  priceText?: string;
  sortPrice: number | null;
  locationNote?: string;
  detailHref: string;
  createdAt: string;
  images?: ApiImage[] | null;
  rawMarketplace?: RawMarketplaceItem;
  rawService?: RawServiceItem;
  rawLostFound?: RawLostFoundItem;
};

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diffDays <= 0) return "Hari ini";
  if (diffDays === 1) return "Kemarin";
  if (diffDays < 30) return `${diffDays} hari lalu`;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function extractApiErrorMessage(err: unknown, fallback: string): string {
  const apiErr = err as ApiError;
  const fieldErrors = apiErr.errors
    ? Object.values(apiErr.errors).flat().join(" ")
    : null;
  return fieldErrors || apiErr.message || fallback;
}

export function moderationBadgeTone(status: string, isCompleted: boolean): string {
  if (isCompleted) return "bg-[#E7EEF9] text-[#2D4880]";
  if (status === "hidden") return "bg-[#FDF6EB] text-[#7C4A12]";
  if (status === "active" || status === "open") return "bg-[#E4F2EA] text-[#1E603E]";
  return "bg-[#EFECE8] text-[#5F5B57]";
}

export function buildUnifiedItems(
  listings: MeResponse["data"]["listings"] | undefined
): UnifiedMyItem[] {
  if (!listings) return [];
  const list: UnifiedMyItem[] = [];

  for (const m of listings.marketplace) {
    const completed = m.status === "sold";
    const statusLabel =
      m.status === "active"
        ? "Tersedia"
        : m.status === "sold"
          ? "Terjual"
          : m.status === "hidden"
            ? "Disembunyikan Admin"
            : "Nonaktif";
    list.push({
      uid: `marketplace-${m.id}`,
      kind: "marketplace",
      id: m.id,
      title: m.title,
      description: m.description,
      badge: `Marketplace · ${m.category?.name ?? "Umum"}`,
      toneClass: "bg-[#FBEAD8] text-[#7C4A12]",
      status: m.status,
      statusLabel,
      statusToneClass: moderationBadgeTone(m.status, completed),
      isCompleted: completed,
      priceLabel: "Harga",
      priceText: formatRupiah(m.price),
      sortPrice: Number(m.price),
      detailHref: `/marketplace/${m.id}`,
      createdAt: m.created_at,
      images: m.images,
      rawMarketplace: m,
    });
  }

  for (const s of listings.services) {
    const hasMax =
      s.price_max !== null &&
      s.price_max !== undefined &&
      Number(s.price_max) > Number(s.price_min);
    const statusLabel =
      s.status === "active"
        ? "Buka Slot"
        : s.status === "hidden"
          ? "Disembunyikan Admin"
          : "Nonaktif";
    list.push({
      uid: `service-${s.id}`,
      kind: "service",
      id: s.id,
      title: s.title,
      description: s.description,
      badge: `Jasa · ${s.category?.name ?? "Layanan"}`,
      toneClass: "bg-[#E4F2EA] text-[#1E603E]",
      status: s.status,
      statusLabel,
      statusToneClass: moderationBadgeTone(s.status, false),
      isCompleted: false,
      priceLabel: "Tarif Layanan",
      priceText: hasMax
        ? `${formatRupiah(s.price_min)} - ${formatRupiah(s.price_max!)}`
        : formatRupiah(s.price_min),
      sortPrice: Number(s.price_min),
      detailHref: `/services/${s.id}`,
      createdAt: s.created_at,
      images: s.images,
      rawService: s,
    });
  }

  for (const lf of listings.lost_found) {
    const completed = lf.status === "resolved" || lf.status === "closed";
    const statusLabel = completed
      ? "Selesai / Ditemukan"
      : lf.status === "hidden"
        ? "Disembunyikan Admin"
        : `Aktif · ${formatRelativeDate(lf.created_at)}`;
    list.push({
      uid: `lostfound-${lf.id}`,
      kind: "lostfound",
      id: lf.id,
      title: lf.title,
      description: lf.description,
      badge: `${lf.type === "lost" ? "Barang Hilang" : "Barang Ditemukan"} · ${lf.category?.name ?? "Laporan"}`,
      toneClass:
        lf.type === "lost"
          ? "bg-[#FCEAE9] text-[#9A3434]"
          : "bg-[#E7EEF9] text-[#2D4880]",
      status: lf.status,
      statusLabel,
      statusToneClass: moderationBadgeTone(lf.status, completed),
      isCompleted: completed,
      sortPrice: null,
      locationNote: lf.location,
      detailHref: `/lost-found/${lf.id}`,
      createdAt: lf.created_at,
      images: lf.images,
      rawLostFound: lf,
    });
  }

  return list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
