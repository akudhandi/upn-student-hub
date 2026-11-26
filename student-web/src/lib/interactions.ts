"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { ApiImage } from "@/lib/images";

// ---------------------------------------------------------------------------
// Shared client for the polymorphic interaction endpoints
// (GET/POST /v1/favorites, /v1/reviews, /v1/reports). Type aliases match the
// backend ResolvesMorphType map.
// ---------------------------------------------------------------------------
export type InteractableType = "marketplace" | "service" | "lostfound" | "event";
export type ReportableType = InteractableType | "user" | "chat";

export const REPORT_REASONS = [
  { value: "spam", label: "Spam / promosi" },
  { value: "fraud", label: "Penipuan / informasi palsu" },
  { value: "inappropriate", label: "Konten tidak pantas" },
  { value: "other", label: "Lainnya" },
] as const;

export type FavoriteItemPayload = {
  id?: number | string;
  title?: string | null;
  type?: string | null;
  price?: number | string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  reward?: string | null;
  location?: string | null;
  organizer_name?: string | null;
  event_date?: string | null;
  is_verified?: boolean | null;
  user?: {
    id?: number;
    name?: string | null;
    account_type?: string | null;
  } | null;
  category?: {
    id?: number;
    name?: string | null;
    slug?: string | null;
  } | null;
  images?: ApiImage[] | null;
};

export type FavoriteEntry = {
  id: number;
  type: InteractableType | null;
  favorited_at: string;
  item: FavoriteItemPayload | null;
};

export type ReviewSummary = {
  count: number;
  average: number;
  distribution: Record<string, number>;
};

export type ReviewItem = {
  id: number;
  rating: number;
  review: string | null;
  created_at: string;
  user?: { id: number; name: string } | null;
};

export async function checkFavorite(
  type: InteractableType,
  id: number | string,
  signal?: AbortSignal
): Promise<boolean> {
  const res = await apiFetch<{ message: string; favorited: boolean }>(
    `/v1/favorites/check?type=${encodeURIComponent(type)}&id=${encodeURIComponent(String(id))}`,
    { signal }
  );
  return Boolean(res.favorited);
}

export async function toggleFavorite(type: InteractableType, id: number | string): Promise<boolean> {
  const res = await apiFetch<{ message: string; favorited: boolean }>("/v1/favorites/toggle", {
    method: "POST",
    body: JSON.stringify({ favoritable_type: type, favoritable_id: Number(id) }),
  });
  return res.favorited;
}

export async function fetchFavorites(signal?: AbortSignal): Promise<FavoriteEntry[]> {
  const res = await apiFetch<{ message: string; data: FavoriteEntry[] }>("/v1/favorites", {
    signal,
  });
  return res.data;
}

export async function submitReport(
  type: ReportableType,
  id: number | string,
  reason: string,
  description?: string
): Promise<void> {
  await apiFetch("/v1/reports", {
    method: "POST",
    body: JSON.stringify({
      reportable_type: type,
      reportable_id: Number(id),
      reason,
      description: description?.trim() === "" ? null : (description ?? null),
    }),
  });
}

export async function fetchReviews(
  type: InteractableType,
  id: number | string,
  signal?: AbortSignal
): Promise<{ summary: ReviewSummary; reviews: ReviewItem[] }> {
  const res = await apiFetch<{
    message: string;
    data: { summary: ReviewSummary; reviews: ReviewItem[] };
  }>(`/v1/reviews?type=${type}&id=${encodeURIComponent(String(id))}`, { signal });
  return res.data;
}

export async function submitReview(
  type: InteractableType,
  id: number | string,
  rating: number,
  comment?: string
): Promise<void> {
  await apiFetch("/v1/reviews", {
    method: "POST",
    body: JSON.stringify({
      reviewable_type: type,
      reviewable_id: Number(id),
      rating,
      comment: comment?.trim() === "" ? null : (comment ?? null),
    }),
  });
}

export type ChatContext = {
  type: string | null;
  id: number | null;
  title: string | null;
  images?: ApiImage[] | null;
};

export type ConversationItem = {
  id: number;
  recipient: {
    id: number;
    name: string;
    account_type?: string | null;
    is_official_account?: boolean;
  } | null;
  last_message: { body: string; sender_id: number; is_edited?: boolean; is_deleted?: boolean; created_at: string } | null;
  unread_count: number;
  context: ChatContext | null;
  updated_at: string;
};

export type ChatMessageItem = {
  id: number;
  body: string;
  sender_id: number;
  sender_name?: string | null;
  is_edited?: boolean;
  edited_at?: string | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at?: string;
};

export async function fetchConversations(signal?: AbortSignal): Promise<ConversationItem[]> {
  const res = await apiFetch<{ message: string; data: ConversationItem[] }>("/v1/conversations", {
    signal,
  });
  return res.data;
}

export async function fetchConversation(
  id: number | string,
  signal?: AbortSignal
): Promise<{ conversation: ConversationItem; messages: ChatMessageItem[]; recipient: ConversationItem["recipient"]; context: ChatContext | null }> {
  const res = await apiFetch<{
    message: string;
    data: {
      id: number;
      recipient: ConversationItem["recipient"];
      last_message: ConversationItem["last_message"];
      unread_count: number;
      context: ChatContext | null;
      updated_at: string;
      messages: ChatMessageItem[];
    };
  }>(`/v1/conversations/${encodeURIComponent(String(id))}`, { signal });
  const { messages, ...conversation } = res.data;
  return { conversation, messages, recipient: res.data.recipient, context: res.data.context };
}

export async function startConversation(
  recipientId: number,
  listingType?: InteractableType,
  listingId?: number | string,
  message?: string
): Promise<number> {
  const res = await apiFetch<{ message: string; data: { id: number } }>("/v1/conversations", {
    method: "POST",
    body: JSON.stringify({
      recipient_id: recipientId,
      listing_type: listingType ?? null,
      listing_id: listingId !== undefined ? Number(listingId) : null,
      message: message ?? null,
    }),
  });
  return res.data.id;
}

export async function sendChatMessage(id: number | string, body: string): Promise<void> {
  await apiFetch(`/v1/conversations/${encodeURIComponent(String(id))}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function markConversationRead(id: number | string): Promise<void> {
  await apiFetch(`/v1/conversations/${encodeURIComponent(String(id))}/read`, {
    method: "PATCH",
  });
}

export async function updateChatMessage(
  conversationId: number | string,
  messageId: number | string,
  body: string
): Promise<ChatMessageItem> {
  const res = await apiFetch<{ message: string; data: ChatMessageItem }>(
    `/v1/conversations/${encodeURIComponent(String(conversationId))}/messages/${encodeURIComponent(String(messageId))}`,
    {
      method: "PUT",
      body: JSON.stringify({ body }),
    }
  );
  return res.data;
}

export async function deleteChatMessage(
  conversationId: number | string,
  messageId: number | string
): Promise<ChatMessageItem> {
  const res = await apiFetch<{ message: string; data: ChatMessageItem }>(
    `/v1/conversations/${encodeURIComponent(String(conversationId))}/messages/${encodeURIComponent(String(messageId))}`,
    {
      method: "DELETE",
    }
  );
  return res.data;
}

// Hydrated optimistic favorite toggle for detail pages. Reverts on API failure.
export function useFavorite(type: InteractableType, id: number | string | undefined) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    if (id === undefined || !getToken()) return;
    const controller = new AbortController();
    checkFavorite(type, id, controller.signal)
      .then((favorited) => {
        if (!controller.signal.aborted) setIsFavorite(favorited);
      })
      .catch(() => {
        // Ignore transient or unauthenticated state checks
      });
    return () => {
      controller.abort();
    };
  }, [type, id]);

  const toggle = useCallback(async () => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    if (isToggling || id === undefined) return;
    setIsToggling(true);
    setIsFavorite((v) => !v);
    try {
      const favorited = await toggleFavorite(type, id);
      setIsFavorite(favorited);
    } catch {
      setIsFavorite((v) => !v);
    } finally {
      setIsToggling(false);
    }
  }, [isToggling, type, id, router]);

  return { isFavorite, isToggling, toggle };
}
