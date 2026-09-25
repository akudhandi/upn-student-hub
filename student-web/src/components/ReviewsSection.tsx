"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchReviews,
  submitReview,
  type InteractableType,
  type ReviewItem,
  type ReviewSummary,
} from "@/lib/interactions";
import { type ApiError } from "@/lib/api";

function StarRow({ value, onSelect }: { value: number; onSelect?: (v: number) => void }) {
  return (
    <span className="inline-flex items-center gap-0.5" role={onSelect ? "radiogroup" : undefined} aria-label={onSelect ? "Pilih rating" : `Rating ${value} dari 5`}>
      {[1, 2, 3, 4, 5].map((star) =>
        onSelect ? (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} bintang`}
            onClick={() => onSelect(star)}
            className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true" className={star <= value ? "text-amber-500" : "text-slate-300"} fill="currentColor">
              <path d="M8 1.5L9.7 5.9H14.2L10.5 8.6L11.5 13.1L8 10.6L4.5 13.1L5.5 8.6L1.8 5.9H6.3L8 1.5Z" />
            </svg>
          </button>
        ) : (
          <svg key={star} width="13" height="13" viewBox="0 0 16 16" aria-hidden="true" className={star <= Math.round(value) ? "text-amber-500" : "text-slate-300"} fill="currentColor">
            <path d="M8 1.5L9.7 5.9H14.2L10.5 8.6L11.5 13.1L8 10.6L4.5 13.1L5.5 8.6L1.8 5.9H6.3L8 1.5Z" />
          </svg>
        )
      )}
    </span>
  );
}

export default function ReviewsSection({ type, id }: { type: InteractableType; id: number | string }) {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      const data = await fetchReviews(type, id);
      if (signal?.aborted) return;
      setSummary(data.summary);
      setReviews(data.reviews);
    } catch {
      if (!signal?.aborted) {
        setSummary(null);
        setReviews([]);
      }
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [type, id]);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch must populate state on mount
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await submitReview(type, id, rating, comment);
      setComment("");
      setRating(5);
      setNotice("Ulasan terkirim. Terima kasih!");
      await load();
    } catch (err) {
      const apiError = err as ApiError;
      const fieldErrors = apiError.errors
        ? Object.values(apiError.errors).flat().join(" ")
        : null;
      setError(fieldErrors || apiError.message || "Gagal mengirim ulasan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="ulasan-heading" className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
      <h2 id="ulasan-heading" className="text-[15px] font-bold text-slate-900">
        Ulasan &amp; Rating
      </h2>
      {isLoading ? (
        <div role="status" aria-busy="true" aria-label="Memuat ulasan" className="mt-3 space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
          <span className="sr-only">Memuat ulasan…</span>
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-3">
            <p className="text-2xl font-bold text-slate-900">
              {summary ? summary.average.toFixed(1) : "0.0"}
            </p>
            <div>
              <StarRow value={summary ? Math.round(summary.average) : 0} />
              <p className="mt-0.5 text-[11px] text-slate-500">
                {summary?.count ?? 0} ulasan
              </p>
            </div>
          </div>
          {summary && summary.count > 0 && (
            <div className="mt-3 space-y-1" aria-label="Distribusi rating">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = summary.distribution[String(star)] ?? 0;
                const pct = summary.count > 0 ? Math.round((count / summary.count) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="w-6 shrink-0">{star}★</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span className="block h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-8 shrink-0 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-[12px] font-semibold text-slate-900">Tulis ulasanmu</p>
            <div className="mt-1.5">
              <StarRow value={rating} onSelect={setRating} />
            </div>
            <textarea
              rows={2}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ceritakan pengalamanmu (opsional)…"
              aria-label="Komentar ulasan"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-[#F8F9FB] px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none"
            />
            {error && (
              <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
                {notice}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
            >
              {isSubmitting ? "Mengirim…" : "Kirim Ulasan"}
            </button>
          </form>

          {reviews.length > 0 && (
            <ul className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              {reviews.map((review) => (
                <li key={review.id} className="rounded-lg bg-slate-50 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12px] font-semibold text-slate-900">
                      {review.user?.name ?? "Mahasiswa UPN"}
                    </span>
                    <StarRow value={review.rating} />
                  </div>
                  {review.review && (
                    <p className="mt-1 text-[12px] leading-5 text-slate-600">{review.review}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
