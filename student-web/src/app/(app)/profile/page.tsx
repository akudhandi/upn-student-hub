"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ListingImage from "@/components/ListingImage";
import VerifiedBadge from "@/components/VerifiedBadge";
import { apiFetch } from "@/lib/api";
import {
  accountTypeLabel,
  getUser,
  isOfficialAccount,
  updateStoredUser,
  USER_UPDATED_EVENT,
  type AuthUser,
} from "@/lib/auth";
import { resolveStorageUrl, type ImageModule } from "@/lib/images";
import { initialsOf } from "@/lib/formatters";
import {
  buildUnifiedItems,
  extractApiErrorMessage,
  formatRelativeDate,
  SELECT_CLASS,
  type MeResponse,
  type ModuleFilter,
  type UnifiedMyItem,
} from "./_components/profile-types";
import {
  ConfirmDeleteModal,
  EditListingModal,
  EditProfileModal,
  SelectChevron,
} from "./_components/ProfileModals";
import { ProfileSidebar } from "./_components/ProfileSidebar";

function StatIcon({ index }: { index: number }) {
  if (index === 0) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2 5.5L8 2L14 5.5V13H2V5.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M6 13V7H10V13" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    );
  }
  if (index === 1) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5.5 8.2L7.4 10L10.6 6.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2.5L9.8 6.1L13.7 6.6L10.8 9.3L11.6 13.2L8 11.2L4.4 13.2L5.2 9.3L2.3 6.6L6.2 6.1L8 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

type TabId = "listing" | "riwayat" | "ulasan";
type SortOption = "terbaru" | "termurah" | "termahal";

export default function ProfilePage() {
  const [cachedUser, setCachedUser] = useState<AuthUser | null>(() => getUser());
  const [meData, setMeData] = useState<MeResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("listing");
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("terbaru");
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UnifiedMyItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<UnifiedMyItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    function syncUser() {
      setCachedUser(getUser());
    }
    window.addEventListener(USER_UPDATED_EVENT, syncUser);
    return () => window.removeEventListener(USER_UPDATED_EVENT, syncUser);
  }, []);

  const reloadMe = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<MeResponse>("/v1/users/me");
      setMeData(res.data);
      updateStoredUser(res.data.user);
    } catch {
      setError("Gagal memuat profil mahasiswa. Periksa koneksi ke backend lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiFetch<MeResponse>("/v1/users/me")
      .then((res) => {
        if (cancelled) return;
        setMeData(res.data);
        updateStoredUser(res.data.user);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Gagal memuat profil mahasiswa. Periksa koneksi ke backend lalu coba lagi.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const user = meData?.user ?? cachedUser;
  const officialAccount = isOfficialAccount(user);
  const officialLabel = accountTypeLabel(user?.account_type);
  const displayName = user?.profile?.name || user?.name || "Mahasiswa UPN";
  const displayNim = user?.profile?.nim || "Belum diisi";
  const displayFaculty = user?.profile?.faculty || "Fakultas belum diisi";
  const displayEmail = user?.email || "-";
  const displayBio = user?.profile?.bio || null;
  const avatarUrl = user?.profile?.avatar
    ? resolveStorageUrl(user.profile.avatar)
    : null;
  const initials = initialsOf(displayName);

  const allItems = useMemo(
    () => buildUnifiedItems(meData?.listings),
    [meData?.listings]
  );

  const activeItems = useMemo(() => {
    const list = allItems.filter((i) => !i.isCompleted);
    if (sortBy === "termurah") {
      return [...list].sort(
        (a, b) =>
          (a.sortPrice ?? Number.MAX_SAFE_INTEGER) -
          (b.sortPrice ?? Number.MAX_SAFE_INTEGER)
      );
    }
    if (sortBy === "termahal") {
      return [...list].sort((a, b) => (b.sortPrice ?? -1) - (a.sortPrice ?? -1));
    }
    return list;
  }, [allItems, sortBy]);

  const completedItems = useMemo(
    () => allItems.filter((i) => i.isCompleted),
    [allItems]
  );

  const reviews = meData?.reviews ?? [];

  async function handleStatusChange(item: UnifiedMyItem, nextStatus: string) {
    setBusyUid(item.uid);
    setActionError(null);
    const endpoint =
      item.kind === "marketplace"
        ? `/v1/marketplace/${item.id}/status`
        : item.kind === "service"
          ? `/v1/services/${item.id}/status`
          : `/v1/lost-found/${item.id}/status`;
    try {
      await apiFetch(endpoint, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      await reloadMe();
    } catch (err) {
      setActionError(extractApiErrorMessage(err, "Gagal mengubah status iklan."));
    } finally {
      setBusyUid(null);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deletingItem) return;
    const target = deletingItem;
    setBusyUid(target.uid);
    setDeleteError(null);
    setActionError(null);
    const endpoint =
      target.kind === "marketplace"
        ? `/v1/marketplace/${target.id}`
        : target.kind === "service"
          ? `/v1/services/${target.id}`
          : `/v1/lost-found/${target.id}`;
    try {
      await apiFetch(endpoint, { method: "DELETE" });
      setDeletingItem(null);
      await reloadMe();
    } catch (err) {
      setDeleteError(extractApiErrorMessage(err, "Gagal menghapus iklan."));
    } finally {
      setBusyUid(null);
    }
  }

  const statCards = [
    {
      label: "Listing Aktif",
      value: meData ? String(meData.stats.active_listings_count) : null,
      hint: "barang, jasa, dan laporan",
    },
    {
      label: "Transaksi / Selesai",
      value: meData ? String(meData.stats.completed_count) : null,
      hint: "terjual dan terselesaikan",
    },
    {
      label: "Rating Ulasan",
      value: meData
        ? meData.stats.rating_count > 0
          ? meData.stats.rating_average.toFixed(1)
          : "0.0"
        : null,
      hint: meData ? `/ 5.0 (${meData.stats.rating_count} ulasan)` : "memuat ulasan",
    },
  ];

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "listing", label: "Listing Saya", count: activeItems.length },
    { id: "riwayat", label: "Riwayat Selesai", count: completedItems.length },
    { id: "ulasan", label: "Ulasan Teman Kampus", count: reviews.length },
  ];

  const baseListings =
    activeTab === "riwayat" ? completedItems : activeItems;

  const moduleCounts = useMemo(() => {
    const counts: Record<ModuleFilter, number> = {
      all: baseListings.length,
      marketplace: 0,
      service: 0,
      lostfound: 0,
    };
    for (const item of baseListings) {
      counts[item.kind] += 1;
    }
    return counts;
  }, [baseListings]);

  const displayedListings = useMemo(() => {
    if (moduleFilter === "all") return baseListings;
    return baseListings.filter((item) => item.kind === moduleFilter);
  }, [baseListings, moduleFilter]);

  const moduleFilterOptions: { id: ModuleFilter; label: string }[] = [
    { id: "all", label: "Semua" },
    { id: "marketplace", label: "Marketplace" },
    { id: "service", label: "Jasa" },
    { id: "lostfound", label: "Lost & Found" },
  ];

  function handleViewAllReviews() {
    setActiveTab("ulasan");
    setModuleFilter("all");
    const tabEl = document.getElementById("tab-ulasan");
    if (tabEl) {
      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      tabEl.scrollIntoView({
        behavior: prefersReduced ? "auto" : "smooth",
        block: "nearest",
      });
    }
  }

  return (
    <div className="auth-shell-enter mx-auto max-w-[1200px] space-y-7">
      {/* Calm Header Band */}
      <section className="flex flex-col justify-between gap-5 border-b border-[#E5E0DA] pb-6 lg:flex-row lg:items-end">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] font-medium text-[#6E6A66]">
            <span>Portal Mahasiswa / Profil Saya</span>
            <span aria-hidden="true" className="text-[#CFC8BF]">
              ·
            </span>
            <span>
              {loading && !meData
                ? "Memuat data akun…"
                : `${activeItems.length} listing aktif`}
            </span>
          </div>

          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[#141416] sm:text-[32px] sm:leading-[1.18]">
            Profil mahasiswa.{" "}
            <span className="font-normal text-[#6E6A66]">
              Kelola identitas akademik, KTM digital, dan daftar iklan Anda.
            </span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {officialAccount && (
            <Link
              href="/events/create"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-5 text-[14px] font-medium text-[#141416] transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:border-[#141416] hover:bg-[#FAF8F6] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
            >
              Ajukan kegiatan
            </Link>
          )}
          <button
            type="button"
            onClick={() => setEditProfileOpen(true)}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M11.5 2.5L13.5 4.5L5.5 12.5L2.5 13.5L3.5 10.5L11.5 2.5Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
            Edit profil
          </button>
        </div>
      </section>

      {/* Profile Overview Card + Real Stats */}
      <section
        aria-labelledby="profile-heading"
        className="rounded-[20px] border border-[#E5E0DA] bg-white p-5 sm:p-6"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E5E0DA] bg-[#141416] text-xl font-bold text-white">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- dynamic profile avatar URL
                <img
                  src={avatarUrl}
                  alt={displayName}
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2
                  id="profile-heading"
                  className="font-display text-xl font-semibold tracking-tight text-[#141416] sm:text-2xl"
                >
                  {displayName}
                </h2>
                {officialAccount && (
                  <VerifiedBadge
                    showLabel
                    label={officialLabel}
                    title={`Akun ${officialLabel} terverifikasi UPN`}
                  />
                )}
                <span
                  className={`rounded-md px-2.5 py-1 text-[13px] font-medium ${
                    user?.status === "suspended"
                      ? "bg-[#FCEAE9] text-[#9A3434]"
                      : "bg-[#E4F2EA] text-[#1E603E]"
                  }`}
                >
                  {user?.status === "suspended"
                    ? "Akun Ditangguhkan"
                    : "Mahasiswa Aktif"}
                </span>
              </div>

              <p className="mt-1 text-[14px] text-[#57534E]">
                {displayFaculty} · UPN &ldquo;Veteran&rdquo; Jawa Timur
              </p>

              {displayBio && (
                <p className="mt-2 max-w-[650px] text-[14px] leading-relaxed text-[#57534E]">
                  {displayBio}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-[#6E6A66]">
                <span>
                  NIM / NPM:{" "}
                  <strong className="font-semibold text-[#141416]">
                    {displayNim}
                  </strong>
                </span>
                <span aria-hidden="true" className="hidden text-[#CFC8BF] sm:inline">
                  ·
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="2" y="3.5" width="12" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M2.5 4L8 8.5L13.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                  <span className="break-all text-[#57534E]">{displayEmail}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Real Activity Stats */}
        <dl className="mt-6 grid grid-cols-1 gap-3 border-t border-[#F1EDE8] pt-5 sm:grid-cols-3">
          {statCards.map((stat, i) => (
            <div
              key={stat.label}
              className="flex items-center gap-3.5 rounded-2xl border border-[#EFECE8] bg-[#FAF8F6] px-4 py-3.5"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFECE8] text-[#141416]">
                <StatIcon index={i} />
              </span>
              <div className="min-w-0">
                <dt className="text-[13px] font-medium text-[#57534E]">
                  {stat.label}
                </dt>
                <dd className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
                  {stat.value === null ? (
                    <span className="inline-block h-6 w-12 animate-pulse rounded bg-[#EFECE8]" />
                  ) : (
                    <span className="font-display text-[20px] font-bold leading-none text-[#141416]">
                      {stat.value}
                    </span>
                  )}
                  <span className="text-[13px] text-[#6E6A66]">{stat.hint}</span>
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </section>

      {actionError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-[#F1C9C9] bg-[#FDF2F2] px-4 py-3 text-[13px] font-medium text-[#B83232]"
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Tutup pesan kesalahan"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg text-[#B83232] hover:bg-[#FCEAE9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
          >
            ×
          </button>
        </div>
      )}

      {/* Main 12-Column Workspace */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left 7 Columns: Tabs, Filters & Listings */}
        <section aria-label="Kelola listing dan ulasan" className="space-y-5 lg:col-span-7">
          <div className="rounded-[20px] border border-[#E5E0DA] bg-white p-5 sm:p-6">
            <div
              role="tablist"
              aria-label="Konten profil"
              className="flex flex-wrap items-center gap-2.5"
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`tab-${tab.id}`}
                    aria-selected={isActive}
                    aria-controls={`tabpanel-${tab.id}`}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setModuleFilter("all");
                    }}
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] ${
                      isActive
                        ? "bg-[#141416] text-white"
                        : "bg-[#F4F1EE] text-[#57534E] hover:bg-[#EAE6E2] hover:text-[#141416]"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[13px] font-semibold ${
                        isActive
                          ? "bg-white/15 text-white"
                          : "bg-[#EFECE8] text-[#5F5B57]"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {activeTab !== "ulasan" && (
              <div className="mt-4 flex flex-col gap-4 border-t border-[#F1EDE8] pt-4 sm:flex-row sm:items-end sm:justify-between">
                <div
                  className="flex flex-wrap items-center gap-2"
                  role="group"
                  aria-label="Filter berdasarkan jenis listing"
                >
                  {moduleFilterOptions.map((opt) => {
                    const selected = moduleFilter === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setModuleFilter(opt.id)}
                        className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] ${
                          selected
                            ? "border border-[#141416] bg-[#141416] text-white"
                            : "border border-[#E5E0DA] bg-[#FAF8F6] text-[#57534E] hover:border-[#CFC8BF] hover:text-[#141416]"
                        }`}
                      >
                        <span>{opt.label}</span>
                        <span
                          className={`text-[13px] ${
                            selected ? "text-[#D6D1CA]" : "text-[#6E6A66]"
                          }`}
                        >
                          ({moduleCounts[opt.id]})
                        </span>
                      </button>
                    );
                  })}
                </div>

                {activeTab === "listing" && (
                  <div className="w-full shrink-0 sm:w-48">
                    <label
                      htmlFor="sort-listing"
                      className="block text-[13px] font-medium text-[#57534E]"
                    >
                      Urutkan daftar
                    </label>
                    <div className="relative mt-1.5">
                      <select
                        id="sort-listing"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className={SELECT_CLASS}
                      >
                        <option value="terbaru">Terbaru</option>
                        <option value="termurah">Harga Terendah</option>
                        <option value="termahal">Harga Tertinggi</option>
                      </select>
                      <SelectChevron />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            className="space-y-4"
          >
            {loading ? (
              <div
                className="space-y-4"
                role="status"
                aria-busy="true"
                aria-label="Memuat daftar profil dan listing"
              >
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="rounded-[20px] border border-[#E5E0DA] bg-white p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <div className="h-28 w-full animate-pulse rounded-2xl bg-[#EFECE8] sm:h-[116px] sm:w-40" />
                      <div className="flex-1 space-y-3">
                        <div className="h-5 w-36 animate-pulse rounded-md bg-[#F4F1EE]" />
                        <div className="h-5 w-3/4 animate-pulse rounded-lg bg-[#F4F1EE]" />
                        <div className="h-4 w-full animate-pulse rounded-lg bg-[#F4F1EE]" />
                        <div className="h-6 w-28 animate-pulse rounded-lg bg-[#EFECE8]" />
                      </div>
                    </div>
                  </div>
                ))}
                <span className="sr-only">Memuat daftar listing dan ulasan…</span>
              </div>
            ) : error ? (
              <div
                role="alert"
                className="rounded-[20px] border border-[#E5E0DA] bg-white px-6 py-12 text-center"
              >
                <h3 className="font-display text-lg font-semibold text-[#141416]">
                  Gagal memuat data profil
                </h3>
                <p className="mx-auto mt-1.5 max-w-md text-[14px] text-[#6E6A66]">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => void reloadMe()}
                  className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                >
                  Muat ulang profil
                </button>
              </div>
            ) : activeTab === "ulasan" ? (
              reviews.length === 0 ? (
                <div className="rounded-[20px] border border-[#E5E0DA] bg-white px-6 py-12 text-center">
                  <h3 className="font-display text-lg font-semibold text-[#141416]">
                    Belum ada ulasan diterima
                  </h3>
                  <p className="mx-auto mt-1.5 max-w-[380px] text-[14px] leading-relaxed text-[#6E6A66]">
                    Ulasan dari mahasiswa lain pada iklan barang atau layanan jasa Anda akan tampil di sini.
                  </p>
                </div>
              ) : (
                reviews.map((rev) => (
                  <article
                    key={rev.id}
                    className="rounded-[20px] border border-[#E5E0DA] bg-white p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display text-[15px] font-semibold text-[#141416]">
                        {rev.reviewer_name}
                      </span>
                      <span className="rounded-md bg-[#FBEAD8] px-2.5 py-1 text-[13px] font-semibold text-[#7C4A12]">
                        ★ {rev.rating}.0
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] text-[#6E6A66]">
                      Pada: {rev.target_title} · {formatRelativeDate(rev.created_at)}
                    </p>
                    {rev.review && (
                      <p className="mt-2.5 text-[14px] leading-relaxed text-[#57534E]">
                        &ldquo;{rev.review}&rdquo;
                      </p>
                    )}
                  </article>
                ))
              )
            ) : displayedListings.length === 0 ? (
              <div className="rounded-[20px] border border-[#E5E0DA] bg-white px-6 py-12 text-center">
                <h3 className="font-display text-lg font-semibold text-[#141416]">
                  {moduleFilter !== "all" && baseListings.length > 0
                    ? "Tidak ada listing pada kategori ini"
                    : activeTab === "riwayat"
                      ? "Belum ada riwayat iklan selesai"
                      : "Belum ada iklan atau laporan aktif"}
                </h3>
                <p className="mx-auto mt-1.5 max-w-[400px] text-[14px] leading-relaxed text-[#6E6A66]">
                  {moduleFilter !== "all" && baseListings.length > 0
                    ? "Pilih filter Semua untuk melihat listing Anda dari modul lainnya."
                    : activeTab === "riwayat"
                      ? "Barang yang ditandai terjual atau laporan kehilangan yang sudah selesai akan masuk ke tab ini."
                      : "Mulai pasang iklan barang bekas, tawarkan jasa mahasiswa, atau buat laporan Lost & Found."}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {moduleFilter !== "all" && baseListings.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setModuleFilter("all")}
                      className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                    >
                      Tampilkan semua jenis
                    </button>
                  )}
                  {activeTab === "listing" && (
                    <>
                      <Link
                        href="/marketplace?action=create"
                        className="inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-5 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                      >
                        Pasang iklan barang
                      </Link>
                      <Link
                        href="/services?action=create"
                        className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                      >
                        Tawarkan jasa
                      </Link>
                      <Link
                        href="/lost-found?action=create"
                        className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                      >
                        Lapor Lost &amp; Found
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ) : (
              displayedListings.map((item, idx) => {
                const isBusy = busyUid === item.uid;
                return (
                  <article
                    key={item.uid}
                    className="group rounded-[20px] border border-[#E5E0DA] bg-white p-5 transition-all duration-180 ease-[cubic-bezier(.2,.8,.2,1)] hover:border-[#CFC8BF]"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <Link
                        href={item.detailHref}
                        aria-label={`Lihat detail ${item.title}`}
                        className="block h-36 w-full shrink-0 overflow-hidden rounded-2xl bg-[#F4F1EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] sm:h-[120px] sm:w-40"
                      >
                        <ListingImage
                          module={item.kind as ImageModule}
                          seed={item.id}
                          eager={idx < 3}
                          images={item.images}
                          hint={`${item.badge} ${item.title}`}
                          alt={item.title}
                          width={320}
                          height={240}
                          className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:scale-[1.03]"
                        />
                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`rounded-md px-2.5 py-1 text-[13px] font-medium ${item.toneClass}`}
                          >
                            {item.badge}
                          </span>
                          <span
                            className={`rounded-md px-2.5 py-1 text-[13px] font-medium ${item.statusToneClass}`}
                          >
                            {item.statusLabel}
                          </span>
                        </div>

                        <h3 className="mt-2.5 font-display text-[16px] font-semibold leading-snug text-[#141416]">
                          <Link
                            href={item.detailHref}
                            className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                          >
                            {item.title}
                          </Link>
                        </h3>

                        <p className="mt-1 line-clamp-2 text-[14px] leading-relaxed text-[#57534E]">
                          {item.description}
                        </p>

                        <div className="mt-3">
                          {item.priceText ? (
                            <div className="flex flex-wrap items-baseline gap-2">
                              <span className="text-[13px] text-[#6E6A66]">
                                {item.priceLabel}:
                              </span>
                              <span className="font-display text-[17px] font-bold text-[#141416]">
                                {item.priceText}
                              </span>
                            </div>
                          ) : (
                            item.locationNote && (
                              <p className="text-[13px] text-[#6E6A66]">
                                Lokasi:{" "}
                                <span className="font-medium text-[#141416]">
                                  {item.locationNote}
                                </span>
                              </p>
                            )
                          )}
                        </div>

                        {item.status === "hidden" && (
                          <p className="mt-3 rounded-xl border border-[#E6C999] bg-[#FDF6EB] px-3.5 py-2.5 text-[13px] font-medium text-[#7C4A12]">
                            Listing ini disembunyikan oleh moderator. Status publikasi tidak dapat diubah hingga peninjauan selesai.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5 border-t border-[#F1EDE8] pt-4">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setEditingItem(item)}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-4 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#141416] hover:bg-[#FAF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
                      >
                        Edit
                      </button>

                      {item.status !== "hidden" && (
                        <>
                          {item.kind === "marketplace" &&
                            (item.status === "sold" || item.status === "inactive" ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleStatusChange(item, "active")}
                                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-4 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#141416] hover:bg-[#FAF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
                              >
                                Aktifkan lagi
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => void handleStatusChange(item, "inactive")}
                                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-4 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#141416] hover:bg-[#FAF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
                                >
                                  Nonaktifkan
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => void handleStatusChange(item, "sold")}
                                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#1E603E] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#174D31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
                                >
                                  Tandai terjual
                                </button>
                              </>
                            ))}

                          {item.kind === "service" && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                void handleStatusChange(
                                  item,
                                  item.status === "active" ? "inactive" : "active"
                                )
                              }
                              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-4 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#141416] hover:bg-[#FAF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
                            >
                              {item.status === "active" ? "Tutup slot" : "Buka slot"}
                            </button>
                          )}

                          {item.kind === "lostfound" &&
                            (item.isCompleted ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleStatusChange(item, "open")}
                                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-4 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#141416] hover:bg-[#FAF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
                              >
                                Buka kembali
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleStatusChange(item, "resolved")}
                                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#1E603E] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#174D31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
                              >
                                Tandai selesai
                              </button>
                            ))}
                        </>
                      )}

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setDeleteError(null);
                          setDeletingItem(item);
                        }}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#F1C9C9] bg-white px-4 text-[13px] font-medium text-[#B83232] transition-colors hover:border-[#B83232] hover:bg-[#FDF2F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
                      >
                        Hapus
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* Right 5 Columns: Ulasan Terbaru */}
        <ProfileSidebar
          meDataStats={
            meData
              ? {
                  rating_average: meData.stats.rating_average,
                  rating_count: meData.stats.rating_count,
                }
              : null
          }
          reviews={reviews}
          onViewAllReviews={handleViewAllReviews}
        />
      </div>

      {editProfileOpen && user && (
        <EditProfileModal
          user={user}
          onSaved={(updated) => {
            updateStoredUser(updated);
            setMeData((prev) => (prev ? { ...prev, user: updated } : prev));
            setEditProfileOpen(false);
          }}
          onClose={() => setEditProfileOpen(false)}
        />
      )}

      {editingItem && (
        <EditListingModal
          item={editingItem}
          onSaved={() => {
            setEditingItem(null);
            void reloadMe();
          }}
          onClose={() => setEditingItem(null)}
        />
      )}

      {deletingItem && (
        <ConfirmDeleteModal
          item={deletingItem}
          deleting={busyUid === deletingItem.uid}
          error={deleteError}
          onConfirm={() => void handleDeleteConfirmed()}
          onClose={() => {
            if (busyUid !== deletingItem.uid) {
              setDeleteError(null);
              setDeletingItem(null);
            }
          }}
        />
      )}
    </div>
  );
}
