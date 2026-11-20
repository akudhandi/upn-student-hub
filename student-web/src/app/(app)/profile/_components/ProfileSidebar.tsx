"use client";

import VerifiedBadge from "@/components/VerifiedBadge";
import type { AuthUser } from "@/lib/auth";
import { formatRelativeDate, type ReceivedReview } from "./profile-types";

export function ProfileSidebar({
  user,
  meDataStats,
  avatarUrl,
  initials,
  displayName,
  displayNim,
  displayFaculty,
  displayEmail,
  officialAccount,
  officialLabel,
  reviews,
  onOpenEditProfile,
  onViewAllReviews,
}: {
  user: AuthUser | null;
  meDataStats: { rating_average: number; rating_count: number } | null;
  avatarUrl: string | null;
  initials: string;
  displayName: string;
  displayNim: string;
  displayFaculty: string;
  displayEmail: string;
  officialAccount: boolean;
  officialLabel: string;
  reviews: ReceivedReview[];
  onOpenEditProfile: () => void;
  onViewAllReviews: () => void;
}) {
  return (
    <aside className="space-y-6 lg:col-span-5">
      {/* Digital KTM Card */}
      <section
        aria-labelledby="ktm-heading"
        className="rounded-[20px] border border-[#E5E0DA] bg-white p-5 sm:p-6"
      >
        <div className="flex items-center justify-between gap-2">
          <h2
            id="ktm-heading"
            className="flex items-center gap-2 font-display text-[17px] font-semibold text-[#141416]"
          >
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="2" y="3" width="12" height="10" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
              <circle cx="6" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M3.5 11.5C3.5 10 4.6 9 6 9s2.5 1 2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M10.5 6.5H12.5M10.5 8.5H12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Kartu Tanda Mahasiswa
          </h2>
          <span className="rounded-md bg-[#F4F1EE] px-2.5 py-1 text-[13px] font-medium text-[#57534E]">
            Digital KTM
          </span>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl bg-[#141416] p-5 text-white">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[13px] font-bold text-[#141416]">
              UPN
            </span>
            <div className="min-w-0">
              <p className="font-display text-[14px] font-semibold tracking-tight text-white">
                UPN &ldquo;Veteran&rdquo; Jawa Timur
              </p>
              <p className="mt-0.5 text-[13px] text-[#D6D1CA]">
                Kartu Identitas Komunitas Mahasiswa
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row">
            <div className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#EFECE8] text-lg font-bold text-[#141416]">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- dynamic avatar URL
                <img
                  src={avatarUrl}
                  alt={displayName}
                  width={80}
                  height={96}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>

            <dl className="min-w-0 flex-1 space-y-2">
              <div>
                <dt className="text-[13px] text-[#D6D1CA]">Nama lengkap</dt>
                <dd className="flex items-center gap-1.5 text-[14px] font-semibold text-white">
                  <span className="truncate">{displayName}</span>
                  {officialAccount && (
                    <VerifiedBadge
                      size="xs"
                      title={`Akun ${officialLabel} terverifikasi`}
                    />
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-[#D6D1CA]">NIM / NPM</dt>
                <dd className="font-display text-[14px] font-semibold text-white">
                  {displayNim}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-[#D6D1CA]">Fakultas</dt>
                <dd className="truncate text-[14px] text-white">
                  {displayFaculty}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-[#D6D1CA]">Email institusi</dt>
                <dd className="truncate text-[13px] text-[#D6D1CA]">
                  {displayEmail}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-white/15 pt-3.5 text-[13px]">
            <span className="text-[#D6D1CA]">
              {user?.id ? `ID Portal #${user.id}` : "Akun Terdaftar"}
            </span>
            <span
              className={`rounded-md px-2.5 py-0.5 text-[13px] font-medium ${
                user?.status === "suspended"
                  ? "bg-[#FCEAE9] text-[#9A3434]"
                  : "bg-[#E4F2EA] text-[#1E603E]"
              }`}
            >
              {user?.status === "suspended"
                ? "Akun Ditangguhkan"
                : "Aktif Terdaftar"}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1E603E]">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
              <path d="M5.5 8.2L7.4 10L10.6 6.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Sinkron dengan akun portal
          </p>
          <button
            type="button"
            onClick={onOpenEditProfile}
            className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-4 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#141416] hover:bg-[#FAF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
          >
            Perbarui data
          </button>
        </div>
      </section>

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
