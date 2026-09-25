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
