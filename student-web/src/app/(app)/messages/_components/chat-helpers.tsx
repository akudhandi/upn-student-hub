"use client";

import ListingImage from "@/components/ListingImage";
import { accountTypeLabel } from "@/lib/auth";
import type { ApiImage, ImageModule } from "@/lib/images";
import type {
  ChatContext,
  ConversationItem,
  InteractableType,
} from "@/lib/interactions";

export type ExtendedRecipient = NonNullable<ConversationItem["recipient"]> & {
  account_type?: string | null;
  is_official_account?: boolean;
};

export type ExtendedContext = ChatContext & {
  images?: ApiImage[] | null;
};

export const CONTEXT_LABELS: Record<string, string> = {
  marketplace: "Marketplace",
  service: "Jasa & Layanan",
  lostfound: "Barang Hilang",
  event: "Event & Info",
};

export function isOfficialRecipient(recipient: ConversationItem["recipient"]): boolean {
  if (!recipient) return false;
  const r = recipient as ExtendedRecipient;
  if (r.is_official_account === true) return true;
  return (
    r.account_type === "hima" ||
    r.account_type === "ormawa" ||
    r.account_type === "faculty"
  );
}

export function recipientRoleLabel(recipient: ConversationItem["recipient"]): string {
  if (!recipient) return "Mahasiswa UPN";
  const r = recipient as ExtendedRecipient;
  if (
    r.account_type === "hima" ||
    r.account_type === "ormawa" ||
    r.account_type === "faculty"
  ) {
    return accountTypeLabel(r.account_type);
  }
  if (r.is_official_account === true) {
    return "Akun Resmi UPN";
  }
  return "Mahasiswa UPN";
}

export function isImageModule(type: string | null | undefined): type is ImageModule {
  return (
    type === "marketplace" ||
    type === "service" ||
    type === "lostfound" ||
    type === "event"
  );
}

export function formatClock(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return date
    .toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    .replace(":", ".");
}

export function formatThreadTime(isoDate: string | null): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return formatClock(isoDate);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Kemarin";
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function dayKeyOf(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatDayLabel(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Hari ini";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Kemarin";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function contextDetailHref(context: ChatContext | null): string | null {
  if (!context?.type || !context?.id) return null;
  switch (context.type as InteractableType) {
    case "marketplace":
      return `/marketplace/${context.id}`;
    case "service":
      return `/services/${context.id}`;
    case "lostfound":
      return `/lost-found/${context.id}`;
    case "event":
      return `/events/${context.id}`;
    default:
      return null;
  }
}

export function ContextThumbnail({ context }: { context: ChatContext }) {
  const extended = context as ExtendedContext;
  if (isImageModule(context.type) && context.id !== null) {
    return (
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[#E5E0DA] bg-[#EFECE8]">
        <ListingImage
          module={context.type}
          seed={context.id}
          hint={context.title}
          images={extended.images}
          eager
          width={88}
          height={88}
          alt={context.title ? `Foto ${context.title}` : "Foto listing"}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E5E0DA] bg-white text-[#57534E]"
      aria-hidden="true"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 4.5C5 4 5.4 3.5 6 3.5H15L19 7.5V19.5C19 20 18.6 20.5 18 20.5H6C5.4 20.5 5 20 5 19.5V4.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M15 3.5V7.5H19"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function ThreadSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-[#EFECE8]" />
      <div className="min-w-0 flex-1 space-y-2 pt-0.5">
        <div className="flex items-center justify-between gap-2">
          <div className="h-3.5 w-1/2 animate-pulse rounded-md bg-[#EFECE8]" />
          <div className="h-3 w-12 animate-pulse rounded-md bg-[#F4F1EE]" />
        </div>
        <div className="h-3.5 w-4/5 animate-pulse rounded-md bg-[#F4F1EE]" />
      </div>
    </div>
  );
}
