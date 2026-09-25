"use client";

import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/api";

// ---------------------------------------------------------------------------
// Shared client for the polymorphic interaction endpoints
// (GET/POST /v1/favorites, /v1/reviews, /v1/reports). Type aliases match the
// backend ResolvesMorphType map.
// ---------------------------------------------------------------------------
export type InteractableType = "marketplace" | "kost" | "service" | "lostfound" | "event";

export const REPORT_REASONS = [
  { value: "spam", label: "Spam / promosi" },
  { value: "fraud", label: "Penipuan / informasi palsu" },
  { value: "inappropriate", label: "Konten tidak pantas" },
  { value: "other", label: "Lainnya" },
] as const;

export type FavoriteEntry = {
  id: number;
  type: InteractableType | null;
  favorited_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- favoritable shape varies per module
  item: any;
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

export async function toggleFavorite(type: InteractableType, id: number | string): Promise<boolean> {
  const res = await apiFetch<{ message: string; favorited: boolean }>("/v1/favorites/toggle", {
    method: "POST",
    body: JSON.stringify({ favoritable_type: type, favoritable_id: Number(id) }),
  });
  return res.favorited;
}

export async function fetchFavorites(): Promise<FavoriteEntry[]> {
  const res = await apiFetch<{ message: string; data: FavoriteEntry[] }>("/v1/favorites");
  return res.data;
}

export async function submitReport(
  type: InteractableType,
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
  id: number | string
): Promise<{ summary: ReviewSummary; reviews: ReviewItem[] }> {
  const res = await apiFetch<{
    message: string;
    data: { summary: ReviewSummary; reviews: ReviewItem[] };
  }>(`/v1/reviews?type=${type}&id=${encodeURIComponent(String(id))}`);
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
};

export type ConversationItem = {
  id: number;
  recipient: { id: number; name: string } | null;
  last_message: { body: string; sender_id: number; created_at: string } | null;
  unread_count: number;
  context: ChatContext | null;
  updated_at: string;
};

export type ChatMessageItem = {
  id: number;
  body: string;
  sender_id: number;
  sender_name?: string | null;
  created_at: string;
};

export async function fetchConversations(): Promise<ConversationItem[]> {
  const res = await apiFetch<{ message: string; data: ConversationItem[] }>("/v1/conversations");
  return res.data;
}

export async function fetchConversation(
  id: number | string
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
  }>(`/v1/conversations/${encodeURIComponent(String(id))}`);
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

// Optimistic favorite toggle for detail pages. Reverts on API failure.
export function useFavorite(type: InteractableType, id: number | string | undefined) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const toggle = useCallback(async () => {
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
  }, [isToggling, type, id]);

  return { isFavorite, isToggling, toggle };
}
