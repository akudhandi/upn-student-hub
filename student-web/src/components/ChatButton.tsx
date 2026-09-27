"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { startConversation, type InteractableType } from "@/lib/interactions";
import type { ApiError } from "@/lib/api";

type ChatButtonProps = {
  recipientId: number | null | undefined;
  listingType: InteractableType;
  listingId: number | string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
};

// Reusable direct-chat CTA: POST /v1/conversations then redirect to inbox.
// Handles own-listing, missing recipient, loading, and API errors inline.
export default function ChatButton({
  recipientId,
  listingType,
  listingId,
  children,
  className,
  ariaLabel,
}: ChatButtonProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = getUser()?.id ?? null;

  if (!recipientId) {
    return (
      <p role="note" className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-4 text-slate-500">
        Kontak penjual belum tersedia untuk listing ini.
      </p>
    );
  }

  if (currentUserId !== null && recipientId === currentUserId) {
    return (
      <span
        role="note"
        title="Anda tidak dapat memulai chat dengan diri sendiri"
        className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-[13px] font-semibold text-slate-500"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M3 13.5C3 11 5 9.5 8 9.5C11 9.5 13 11 13 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        Ini Listing Anda
      </span>
    );
  }

  async function handleClick() {
    if (isStarting) return;
    setIsStarting(true);
    setError(null);
    try {
      const conversationId = await startConversation(
        recipientId as number,
        listingType,
        listingId
      );
      router.push(`/messages?conversation_id=${conversationId}`);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "Gagal memulai percakapan. Coba lagi.");
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={isStarting}
        aria-label={ariaLabel}
        className={className}
      >
        {isStarting ? "Membuka chat…" : children}
      </button>
      {error && (
        <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] leading-4 text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
