"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ListingImage from "@/components/ListingImage";
import VerifiedBadge from "@/components/VerifiedBadge";
import { apiFetch, uploadMedia, type ApiError } from "@/lib/api";
import {
  accountTypeLabel,
  getUser,
  isOfficialAccount,
  updateStoredUser,
  USER_UPDATED_EVENT,
  type AuthUser,
} from "@/lib/auth";
import { resolveStorageUrl, type ApiImage, type ImageModule } from "@/lib/images";

const FAKULTAS_OPTIONS = [
  "Fakultas Ilmu Komputer",
  "Fakultas Teknik",
  "Fakultas Ekonomi & Bisnis",
  "Fakultas Pertanian",
  "Fakultas Ilmu Sosial & Politik",
  "Fakultas Arsitektur & Desain",
  "Fakultas Hukum",
  "Fakultas Kedokteran",
] as const;

const INPUT_CLASS =
  "mt-1.5 h-11 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 text-[14px] text-[#141416] placeholder:text-[#66625E] transition-all focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none";

const SELECT_CLASS =
  "h-11 w-full appearance-none rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] pl-3.5 pr-9 text-[14px] text-[#141416] transition-all hover:border-[#CFC8BF] focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none";

const TEXTAREA_CLASS =
  "mt-1.5 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] p-3.5 text-[14px] leading-relaxed text-[#141416] placeholder:text-[#66625E] transition-all focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none";

type CategoryBrief = { id: number; name: string; slug: string };

type RawMarketplaceItem = {
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

type RawServiceItem = {
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

type RawLostFoundItem = {
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

type ReceivedReview = {
  id: number;
  rating: number;
  review: string | null;
  created_at: string;
  reviewer_name: string;
  target_title: string;
};

type MeResponse = {
  message: string;
  data: {
    user: AuthUser;
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

type UnifiedKind = "marketplace" | "service" | "lostfound";
type ModuleFilter = "all" | UnifiedKind;

type UnifiedMyItem = {
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

function formatRupiah(value: number | string): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatRelativeDate(iso: string): string {
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

function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "M"
  );
}

function extractApiErrorMessage(err: unknown, fallback: string): string {
  const apiErr = err as ApiError;
  const fieldErrors = apiErr.errors
    ? Object.values(apiErr.errors).flat().join(" ")
    : null;
  return fieldErrors || apiErr.message || fallback;
}

function moderationBadgeTone(status: string, isCompleted: boolean): string {
  if (isCompleted) return "bg-[#E7EEF9] text-[#2D4880]";
  if (status === "hidden") return "bg-[#FDF6EB] text-[#7C4A12]";
  if (status === "active" || status === "open") return "bg-[#E4F2EA] text-[#1E603E]";
  return "bg-[#EFECE8] text-[#5F5B57]";
}

function buildUnifiedItems(
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

function SelectChevron() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6E6A66]"
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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

/** Shared matte Warm-Alabaster modal wrapper with Escape key and backdrop dismissal. */
function ModalShell({
  titleId,
  eyebrow,
  title,
  subtitle,
  closeLabel,
  busy,
  maxWidthClass = "max-w-[600px]",
  onClose,
  children,
}: {
  titleId: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  closeLabel: string;
  busy: boolean;
  maxWidthClass?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#141416]/50 p-4"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`auth-shell-enter max-h-[92vh] w-full ${maxWidthClass} overflow-y-auto rounded-[28px] border border-[#E5E0DA] bg-[#F4F1EE] p-5 shadow-[0_20px_48px_-20px_rgba(20,20,22,0.20)] sm:p-7`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E5E0DA] pb-4">
          <div>
            <p className="text-[13px] font-medium text-[#6E6A66]">{eyebrow}</p>
            <h2
              id={titleId}
              className="mt-1 font-display text-2xl font-semibold tracking-tight text-[#141416]"
            >
              {title}{" "}
              {subtitle && (
                <span className="font-normal text-[#6E6A66]">{subtitle}</span>
              )}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={closeLabel}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5E0DA] bg-white text-lg text-[#57534E] transition-colors hover:border-[#141416] hover:text-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
          >
            ×
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function EditProfileModal({
  user,
  onSaved,
  onClose,
}: {
  user: AuthUser;
  onSaved: (updated: AuthUser) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(user.profile?.name || user.name || "");
  const [nim, setNim] = useState(user.profile?.nim ?? "");
  const [faculty, setFaculty] = useState(user.profile?.faculty ?? "");
  const [bio, setBio] = useState(user.profile?.bio ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user.profile?.avatar ? resolveStorageUrl(user.profile.avatar) : null
  );
  const objectUrlRef = useRef<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  function handleAvatarChange(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    const nextUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextUrl;
    setAvatarFile(file);
    setAvatarPreview(nextUrl);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nama lengkap wajib diisi.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let avatarPath = user.profile?.avatar ?? undefined;
      if (avatarFile) {
        const uploaded = await uploadMedia(avatarFile, "avatars");
        avatarPath = uploaded.path;
      }
      const res = await apiFetch<{ message: string; data: AuthUser }>(
        "/v1/users/profile",
        {
          method: "PUT",
          body: JSON.stringify({
            name: name.trim(),
            nim: nim.trim() || null,
            faculty: faculty.trim() || null,
            bio: bio.trim() || null,
            ...(avatarPath !== undefined ? { avatar: avatarPath } : {}),
          }),
        }
      );
      onSaved(res.data);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Gagal memperbarui profil."));
    } finally {
      setSaving(false);
    }
  }

  const hasCustomFaculty =
    faculty.trim() !== "" &&
    !FAKULTAS_OPTIONS.includes(faculty as (typeof FAKULTAS_OPTIONS)[number]);

  return (
    <ModalShell
      titleId="edit-profile-modal-title"
      eyebrow="Profil Mahasiswa · Identitas Akun"
      title="Edit profil."
      subtitle="Perbarui data tampil di portal dan KTM digital."
      closeLabel="Tutup form edit profil"
      busy={saving}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 rounded-[20px] border border-[#E5E0DA] bg-white p-5 sm:p-6">
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-[#F1C9C9] bg-[#FDF2F2] px-4 py-3 text-[13px] font-medium text-[#B83232]"
            >
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 border-b border-[#F1EDE8] pb-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E5E0DA] bg-[#141416] text-lg font-bold text-white">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element -- local/remote dynamic avatar preview
                <img
                  src={avatarPreview}
                  alt="Pratinjau foto profil"
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              ) : (
                initialsOf(name || user.name)
              )}
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="profile-avatar-upload"
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] hover:bg-[#FAF8F6] focus-within:ring-2 focus-within:ring-[#141416]"
              >
                Unggah foto profil
                <input
                  id="profile-avatar-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    handleAvatarChange(e.target.files);
                    e.target.value = "";
                  }}
                  className="sr-only"
                />
              </label>
              <p className="text-[13px] text-[#6E6A66]">
                Format JPG, PNG, atau WEBP (maksimal 5 MB).
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="profile-name"
              className="block text-[14px] font-medium text-[#141416]"
            >
              Nama lengkap <span className="text-[#B83232]">*</span>
            </label>
            <input
              id="profile-name"
              type="text"
              required
              maxLength={255}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama lengkap sesuai identitas mahasiswa"
              className={INPUT_CLASS}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="profile-nim"
                className="block text-[14px] font-medium text-[#141416]"
              >
                NIM / NPM
              </label>
              <input
                id="profile-nim"
                type="text"
                maxLength={50}
                value={nim}
                onChange={(e) => setNim(e.target.value)}
                placeholder="Masukkan NIM atau NPM Anda"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label
                htmlFor="profile-faculty"
                className="block text-[14px] font-medium text-[#141416]"
              >
                Fakultas
              </label>
              <div className="relative mt-1.5">
                <select
                  id="profile-faculty"
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="">Pilih fakultas</option>
                  {hasCustomFaculty && <option value={faculty}>{faculty}</option>}
                  {FAKULTAS_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <SelectChevron />
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="profile-bio"
              className="block text-[14px] font-medium text-[#141416]"
            >
              Bio singkat &amp; titik COD favorit
            </label>
            <textarea
              id="profile-bio"
              rows={3}
              maxLength={1000}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tuliskan jurusan, minat, atau titik temu COD di area kampus"
              className={TEXTAREA_CLASS}
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#F1EDE8] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-60"
            >
              {saving ? "Menyimpan…" : "Simpan profil"}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}

function EditListingModal({
  item,
  onSaved,
  onClose,
}: {
  item: UnifiedMyItem;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [price, setPrice] = useState(
    item.rawMarketplace ? String(Number(item.rawMarketplace.price)) : ""
  );
  const [condition, setCondition] = useState(
    item.rawMarketplace?.condition ?? "good"
  );
  const [priceMin, setPriceMin] = useState(
    item.rawService ? String(Number(item.rawService.price_min)) : ""
  );
  const [priceMax, setPriceMax] = useState(
    item.rawService?.price_max ? String(Number(item.rawService.price_max)) : ""
  );
  const [location, setLocation] = useState(item.rawLostFound?.location ?? "");
  const [contactInfo, setContactInfo] = useState(
    item.rawLostFound?.contact_info ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (item.kind === "marketplace") {
        await apiFetch(`/v1/marketplace/${item.id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            price: Number(price),
            condition,
          }),
        });
      } else if (item.kind === "service") {
        await apiFetch(`/v1/services/${item.id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            price_min: Number(priceMin),
            price_max: priceMax.trim() ? Number(priceMax) : null,
          }),
        });
      } else {
        await apiFetch(`/v1/lost-found/${item.id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            location: location.trim(),
            contact_info: contactInfo.trim(),
          }),
        });
      }
      onSaved();
    } catch (err) {
      setError(extractApiErrorMessage(err, "Gagal menyimpan perubahan iklan."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      titleId="edit-listing-modal-title"
      eyebrow={item.badge}
      title="Edit listing."
      subtitle="Perbarui judul, harga, atau keterangan."
      closeLabel="Tutup form edit iklan"
      busy={saving}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 rounded-[20px] border border-[#E5E0DA] bg-white p-5 sm:p-6">
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-[#F1C9C9] bg-[#FDF2F2] px-4 py-3 text-[13px] font-medium text-[#B83232]"
            >
              {error}
            </p>
          )}

          <div>
            <label
              htmlFor="edit-listing-title"
              className="block text-[14px] font-medium text-[#141416]"
            >
              Judul <span className="text-[#B83232]">*</span>
            </label>
            <input
              id="edit-listing-title"
              type="text"
              required
              maxLength={255}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nama barang, jasa, atau laporan"
              className={INPUT_CLASS}
            />
          </div>

          {item.kind === "marketplace" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="edit-listing-price"
                  className="block text-[14px] font-medium text-[#141416]"
                >
                  Harga (Rp) <span className="text-[#B83232]">*</span>
                </label>
                <input
                  id="edit-listing-price"
                  type="number"
                  required
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Masukkan nominal harga"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label
                  htmlFor="edit-listing-condition"
                  className="block text-[14px] font-medium text-[#141416]"
                >
                  Kondisi <span className="text-[#B83232]">*</span>
                </label>
                <div className="relative mt-1.5">
                  <select
                    id="edit-listing-condition"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className={SELECT_CLASS}
                  >
                    <option value="new">Baru</option>
                    <option value="like-new">Bekas Seperti Baru</option>
                    <option value="good">Layak Pakai</option>
                    <option value="fair">Perlu Perbaikan</option>
                  </select>
                  <SelectChevron />
                </div>
              </div>
            </div>
          )}

          {item.kind === "service" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="edit-service-min"
                  className="block text-[14px] font-medium text-[#141416]"
                >
                  Tarif minimal (Rp) <span className="text-[#B83232]">*</span>
                </label>
                <input
                  id="edit-service-min"
                  type="number"
                  required
                  min={0}
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  placeholder="Masukkan tarif awal"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label
                  htmlFor="edit-service-max"
                  className="block text-[14px] font-medium text-[#141416]"
                >
                  Tarif maksimal (opsional)
                </label>
                <input
                  id="edit-service-max"
                  type="number"
                  min={0}
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  placeholder="Kosongkan jika tarif tetap"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          )}

          {item.kind === "lostfound" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="edit-lf-location"
                  className="block text-[14px] font-medium text-[#141416]"
                >
                  Lokasi <span className="text-[#B83232]">*</span>
                </label>
                <input
                  id="edit-lf-location"
                  type="text"
                  required
                  maxLength={255}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Lokasi kejadian di area kampus"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label
                  htmlFor="edit-lf-contact"
                  className="block text-[14px] font-medium text-[#141416]"
                >
                  Kontak penghubung <span className="text-[#B83232]">*</span>
                </label>
                <input
                  id="edit-lf-contact"
                  type="text"
                  required
                  maxLength={50}
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="Kontak atau kanal yang aktif"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="edit-listing-desc"
              className="block text-[14px] font-medium text-[#141416]"
            >
              Deskripsi <span className="text-[#B83232]">*</span>
            </label>
            <textarea
              id="edit-listing-desc"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan detail informasi dan ketentuan yang relevan"
              className={TEXTAREA_CLASS}
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#F1EDE8] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-60"
            >
              {saving ? "Menyimpan…" : "Simpan perubahan"}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}

function ConfirmDeleteModal({
  item,
  deleting,
  error,
  onConfirm,
  onClose,
}: {
  item: UnifiedMyItem;
  deleting: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <ModalShell
      titleId="confirm-delete-modal-title"
      eyebrow="Konfirmasi Hapus Listing"
      title="Hapus permanen?"
      closeLabel="Tutup dialog konfirmasi hapus"
      busy={deleting}
      maxWidthClass="max-w-[480px]"
      onClose={onClose}
    >
      <div className="space-y-4 rounded-[20px] border border-[#E5E0DA] bg-white p-5">
        <div>
          <span
            className={`inline-block rounded-md px-2.5 py-1 text-[13px] font-medium ${item.toneClass}`}
          >
            {item.badge}
          </span>
          <p className="mt-2.5 font-display text-[16px] font-semibold text-[#141416]">
            {item.title}
          </p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-[#57534E]">
            Listing yang dihapus akan hilang dari daftar aktif dan riwayat Anda serta tidak dapat dipulihkan.
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-[#F1C9C9] bg-[#FDF2F2] px-4 py-3 text-[13px] font-medium text-[#B83232]"
          >
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#F1EDE8] pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#B83232] px-6 text-[14px] font-medium text-white transition-colors hover:bg-[#991B1B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-60"
          >
            {deleting ? "Menghapus…" : "Ya, hapus permanen"}
          </button>
        </div>
      </div>
    </ModalShell>
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

        {/* Right 5 Columns: Digital KTM & Ulasan Terbaru */}
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
                onClick={() => setEditProfileOpen(true)}
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
                {meData && meData.stats.rating_count > 0
                  ? `${meData.stats.rating_average.toFixed(1)} (${meData.stats.rating_count})`
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
                    onClick={() => {
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
                    }}
                    className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-4 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#141416] hover:bg-[#FAF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                  >
                    Lihat semua ulasan ({reviews.length})
                  </button>
                )}
              </>
            )}
          </section>
        </aside>
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
