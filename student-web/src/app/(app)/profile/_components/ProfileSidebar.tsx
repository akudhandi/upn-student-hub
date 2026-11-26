"use client";

import { formatRelativeDate, type ReceivedReview } from "./profile-types";

export function ProfileSidebar({
  meDataStats,
  reviews,
  onViewAllReviews,
}: {
  meDataStats: { rating_average: number; rating_count: number } | null;
  reviews: ReceivedReview[];
  onViewAllReviews: () => void;
}) {
  return (
    <aside className="space-y-6 lg:col-span-5">
      {/* Ulasan Terbaru */}
      <section
        aria-labelledby="reviews-heading"
        className="rounded-[20px] border border-[#E5E0DA] bg-white p-5 sm:p-6"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[#EFECE8] pb-4">
          <h2
            id="reviews-heading"
            className="font-display text-[17px] font-semibold text-[#141416]"
          >
            Ulasan Terbaru
          </h2>
          <span className="rounded-md bg-[#FBEAD8] px-2.5 py-1 text-[13px] font-semibold text-[#7C4A12]">
            ★{" "}
            {meDataStats && meDataStats.rating_count > 0
              ? `${meDataStats.rating_average.toFixed(1)} (${meDataStats.rating_count})`
              : "Belum ada"}
          </span>
        </div>

        {reviews.length === 0 ? (
          <p className="mt-4 text-[14px] leading-relaxed text-[#6E6A66]">
            Belum ada ulasan dari transaksi sebelumnya.
          </p>
        ) : (
          <>
            <ul className="mt-4 space-y-3">
              {reviews.slice(0, 3).map((review) => (
                <li
                  key={review.id}
                  className="rounded-xl border border-[#EFECE8] bg-[#FAF8F6] p-3.5"
                >
                  <blockquote className="text-[14px] leading-relaxed text-[#57534E]">
                    &ldquo;{review.review || `Memberikan rating ${review.rating}/5`}&rdquo;
                  </blockquote>
                  <p className="mt-2 flex items-center justify-between gap-2 text-[13px]">
                    <span className="font-medium text-[#141416]">
                      {review.reviewer_name}
                    </span>
                    <span className="text-[#6E6A66]">
                      {formatRelativeDate(review.created_at)}
                    </span>
                  </p>
                </li>
              ))}
            </ul>

            {reviews.length > 3 && (
              <button
                type="button"
                onClick={onViewAllReviews}
                className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-4 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#141416] hover:bg-[#FAF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
              >
                Lihat semua ulasan ({reviews.length})
              </button>
            )}
          </>
        )}
      </section>
    </aside>
  );
}
