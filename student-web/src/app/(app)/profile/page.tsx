"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ListingImage from "@/components/ListingImage";
import { apiFetch, uploadMedia, type ApiError } from "@/lib/api";
import { getUser, updateStoredUser, type AuthUser } from "@/lib/auth";
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
      badge: `Marketplace • ${m.category?.name ?? "Umum"}`,
      toneClass: "border-amber-200 bg-amber-50 text-amber-800",
      status: m.status,
      statusLabel,
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
      badge: `Jasa • ${s.category?.name ?? "Layanan"}`,
      toneClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
      status: s.status,
      statusLabel,
      isCompleted: false,
      priceLabel: "Tarif Layanan",
      priceText: hasMax
        ? `${formatRupiah(s.price_min)} – ${formatRupiah(s.price_max!)}`
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
        : `Aktif • ${formatRelativeDate(lf.created_at)}`;
    list.push({
      uid: `lostfound-${lf.id}`,
      kind: "lostfound",
      id: lf.id,
      title: lf.title,
      description: lf.description,
      badge: `${lf.type === "lost" ? "Barang Hilang" : "Barang Ditemukan"} • ${lf.category?.name ?? "Laporan"}`,
      toneClass: "border-indigo-200 bg-indigo-50 text-indigo-800",
      status: lf.status,
      statusLabel,
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

const STAT_STYLES = [
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-blue-100 text-blue-700",
];

function StatIcon({ index }: { index: number }) {
  if (index === 0) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2 5.5L8 2L14 5.5V13H2V5.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M6 13V7H10V13" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    );
  }
  if (index === 1) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
        <path d="M5.5 8.2L7.4 10L10.6 6.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2.5L9.8 6.1L13.7 6.6L10.8 9.3L11.6 13.2L8 11.2L4.4 13.2L5.2 9.3L2.3 6.6L6.2 6.1L8 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
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
  const [faculty, setFaculty] = useState(
    user.profile?.faculty ?? "Fakultas Ilmu Komputer"
  );
  const [bio, setBio] = useState(user.profile?.bio ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user.profile?.avatar ? resolveStorageUrl(user.profile.avatar) : null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, onClose]);

  function handleAvatarChange(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
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
      const apiErr = err as ApiError;
      setError(apiErr.message || "Gagal memperbarui profil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit Profil Mahasiswa"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-slate-900">Edit Profil Mahasiswa</h2>
        <p className="mt-1 text-xs text-slate-500">
          Perbarui identitas akademik dan foto profil yang tampil di portal serta KTM digital.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
          >
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#002147] text-lg font-bold text-white">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt="Preview avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                initialsOf(name || user.name)
              )}
            </div>
            <div>
              <label
                htmlFor="profile-avatar-upload"
                className="inline-flex cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Unggah Foto Profil
              </label>
              <input
                id="profile-avatar-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => handleAvatarChange(e.target.files)}
                className="sr-only"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                JPG, PNG, atau WEBP (maks. 5 MB).
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="profile-name"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Nama Lengkap
            </label>
            <input
              id="profile-name"
              type="text"
              required
              maxLength={255}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#002147] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="profile-nim"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                NIM / NPM
              </label>
              <input
                id="profile-nim"
                type="text"
                maxLength={50}
                value={nim}
                onChange={(e) => setNim(e.target.value)}
                placeholder="Contoh: 22081010001"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#002147] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="profile-faculty"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Fakultas
              </label>
              <select
                id="profile-faculty"
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#002147] focus:outline-none"
              >
                {FAKULTAS_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="profile-bio"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Bio Singkat / Titik COD Favorit
            </label>
            <textarea
              id="profile-bio"
              rows={3}
              maxLength={1000}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Contoh: Mahasiswa Informatika. Biasa COD di Perpustakaan Pusat UPN / Gazebo Fasilkom."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#002147] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#002147] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0a2f5c] disabled:opacity-60"
            >
              {saving ? "Menyimpan…" : "Simpan Profil"}
            </button>
          </div>
        </form>
      </div>
    </div>
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, onClose]);

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
      const apiErr = err as ApiError;
      setError(apiErr.message || "Gagal menyimpan perubahan iklan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${item.title}`}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-slate-900">Edit Iklan / Laporan</h2>
        <p className="mt-0.5 text-xs text-slate-500">{item.badge}</p>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
          >
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="edit-listing-title"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Judul
            </label>
            <input
              id="edit-listing-title"
              type="text"
              required
              maxLength={255}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#002147] focus:outline-none"
            />
          </div>

          {item.kind === "marketplace" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="edit-listing-price"
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  Harga (Rp)
                </label>
                <input
                  id="edit-listing-price"
                  type="number"
                  required
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#002147] focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-listing-condition"
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  Kondisi
                </label>
                <select
                  id="edit-listing-condition"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#002147] focus:outline-none"
                >
                  <option value="new">Baru</option>
                  <option value="like-new">Bekas Seperti Baru</option>
                  <option value="good">Layak Pakai</option>
                  <option value="fair">Perlu Perbaikan</option>
                </select>
              </div>
            </div>
          )}

          {item.kind === "service" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="edit-service-min"
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  Tarif Minimal (Rp)
                </label>
                <input
                  id="edit-service-min"
                  type="number"
                  required
                  min={0}
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#002147] focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-service-max"
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  Tarif Maksimal (Opsional)
                </label>
                <input
                  id="edit-service-max"
                  type="number"
                  min={0}
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#002147] focus:outline-none"
                />
              </div>
            </div>
          )}

          {item.kind === "lostfound" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="edit-lf-location"
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  Lokasi
                </label>
                <input
                  id="edit-lf-location"
                  type="text"
                  required
                  maxLength={255}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#002147] focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-lf-contact"
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  Kontak
                </label>
                <input
                  id="edit-lf-contact"
                  type="text"
                  required
                  maxLength={50}
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#002147] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="edit-listing-desc"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Deskripsi
            </label>
            <textarea
              id="edit-listing-desc"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#002147] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#002147] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0a2f5c] disabled:opacity-60"
            >
              {saving ? "Menyimpan…" : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type TabId = "listing" | "riwayat" | "ulasan";
type SortOption = "terbaru" | "termurah" | "termahal";

export default function ProfilePage() {
  const [cachedUser] = useState<AuthUser | null>(() => getUser());
  const [meData, setMeData] = useState<MeResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("listing");
  const [sortBy, setSortBy] = useState<SortOption>("terbaru");
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UnifiedMyItem | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const reloadMe = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<MeResponse>("/v1/users/me");
      setMeData(res.data);
      updateStoredUser(res.data.user);
    } catch {
      setError("Gagal memuat profil mahasiswa. Periksa koneksi ke backend.");
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
          setError("Gagal memuat profil mahasiswa. Periksa koneksi ke backend.");
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
  const displayName = user?.profile?.name || user?.name || "Mahasiswa UPN";
  const displayNim = user?.profile?.nim || "-";
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
      const apiErr = err as ApiError;
      setActionError(apiErr.message || "Gagal mengubah status iklan.");
    } finally {
      setBusyUid(null);
    }
  }

  async function handleDelete(item: UnifiedMyItem) {
    if (!window.confirm(`Hapus "${item.title}" secara permanen dari daftar Anda?`)) {
      return;
    }
    setBusyUid(item.uid);
    setActionError(null);
    const endpoint =
      item.kind === "marketplace"
        ? `/v1/marketplace/${item.id}`
        : item.kind === "service"
          ? `/v1/services/${item.id}`
          : `/v1/lost-found/${item.id}`;
    try {
      await apiFetch(endpoint, { method: "DELETE" });
      await reloadMe();
    } catch (err) {
      const apiErr = err as ApiError;
      setActionError(apiErr.message || "Gagal menghapus iklan.");
    } finally {
      setBusyUid(null);
    }
  }

  const statCards = [
    {
      label: "Listing Aktif",
      value: String(meData?.stats.active_listings_count ?? 0),
      hint: "barang, jasa & laporan",
    },
    {
      label: "Transaksi / Selesai",
      value: String(meData?.stats.completed_count ?? 0),
      hint: "terjual & terselesaikan",
    },
    {
      label: "Rating Ulasan",
      value:
        meData && meData.stats.rating_count > 0
          ? meData.stats.rating_average.toFixed(1)
          : "0.0",
      hint: `/ 5.0 (${meData?.stats.rating_count ?? 0} ulasan)`,
    },
  ];

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "listing", label: "Listing Saya", count: activeItems.length },
    { id: "riwayat", label: "Riwayat Selesai", count: completedItems.length },
    { id: "ulasan", label: "Ulasan Teman Kampus", count: reviews.length },
  ];

  const displayedListings =
    activeTab === "riwayat" ? completedItems : activeItems;

  return (
    <div className="mx-auto max-w-[1180px]">
      {/* ===== Header profil ===== */}
      <section
        aria-labelledby="profile-heading"
        className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="relative shrink-0">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#002147] text-xl font-bold text-white">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <span
                className="absolute right-1 bottom-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  id="profile-heading"
                  className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
                >
                  {displayName}
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                    aria-hidden="true"
                  />
                  {user?.status === "suspended"
                    ? "Akun Ditangguhkan"
                    : "Mahasiswa Aktif"}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-700">
                {displayFaculty} • UPN &ldquo;Veteran&rdquo; Jawa Timur
              </p>
              {displayBio && (
                <p className="mt-1.5 max-w-[600px] text-xs leading-5 text-slate-600">
                  {displayBio}
                </p>
              )}
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>
                  NIM:{" "}
                  <span className="font-semibold text-slate-700">
                    {displayNim}
                  </span>
                </span>
                <span
                  className="hidden text-slate-300 sm:inline"
                  aria-hidden="true"
                >
                  •
                </span>
                <span className="inline-flex items-center gap-1">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <rect
                      x="2"
                      y="3.5"
                      width="12"
                      height="9"
                      rx="1"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M2.5 4L8 8.5L13.5 4"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {displayEmail}
                </span>
                <span
                  className="hidden text-slate-300 sm:inline"
                  aria-hidden="true"
                >
                  •
                </span>
                <span>Kampus Rungkut, Surabaya</span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setEditProfileOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#002147] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a2f5c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M11.5 2.5L13.5 4.5L5.5 12.5L2.5 13.5L3.5 10.5L11.5 2.5Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
              </svg>
              Edit Profil
            </button>
          </div>
        </div>

        {/* Statistik */}
        <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
          {statCards.map((stat, i) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 rounded-lg bg-[#F8F9FB] px-4 py-3"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${STAT_STYLES[i]}`}
              >
                <StatIcon index={i} />
              </span>
              <div className="min-w-0">
                <dt className="text-xs text-slate-500">{stat.label}</dt>
                <dd className="text-sm text-slate-900">
                  <span className="text-lg font-bold">{stat.value}</span>{" "}
                  <span className="text-xs text-slate-500">{stat.hint}</span>
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </section>

      {actionError && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700"
        >
          {actionError}
        </div>
      )}

      {/* ===== Tab + sortir ===== */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Konten profil"
          className="flex gap-1 overflow-x-auto border-b border-slate-200 sm:gap-2"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-3 pb-2.5 pt-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2 ${
                  isActive
                    ? "border-b-2 border-slate-900 font-semibold text-slate-900"
                    : "font-medium text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}{" "}
                <span className="ml-1.5 text-xs text-slate-400">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
        {activeTab === "listing" && (
          <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
            <label htmlFor="sort-listing">Urutkan:</label>
            <select
              id="sort-listing"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-[#002147] focus:outline-none"
            >
              <option value="terbaru">Terbaru</option>
              <option value="termurah">Harga Terendah</option>
              <option value="termahal">Harga Tertinggi</option>
            </select>
          </div>
        )}
      </div>

      {/* ===== Isi 2 kolom ===== */}
      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_350px] lg:items-start">
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white p-4"
              />
            ))
          ) : error ? (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
              <p className="text-sm font-semibold text-slate-900">{error}</p>
              <button
                type="button"
                onClick={() => void reloadMe()}
                className="mt-3 rounded-lg bg-[#002147] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0a2f5c]"
              >
                Coba Lagi
              </button>
            </div>
          ) : activeTab === "ulasan" ? (
            reviews.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
                <p className="text-sm font-semibold text-slate-900">
                  Belum ada ulasan diterima
                </p>
                <p className="mx-auto mt-1 max-w-[360px] text-xs leading-5 text-slate-500">
                  Ulasan dari mahasiswa lain pada iklan barang atau jasa Anda akan tampil di sini.
                </p>
              </div>
            ) : (
              reviews.map((rev) => (
                <article
                  key={rev.id}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900">
                      {rev.reviewer_name}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">
                      ★ {rev.rating}.0
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Pada: {rev.target_title} •{" "}
                    {formatRelativeDate(rev.created_at)}
                  </p>
                  {rev.review && (
                    <p className="mt-2 text-xs leading-5 text-slate-600">
                      “{rev.review}”
                    </p>
                  )}
                </article>
              ))
            )
          ) : displayedListings.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
              <p className="text-sm font-semibold text-slate-900">
                {activeTab === "riwayat"
                  ? "Belum ada riwayat iklan selesai"
                  : "Belum ada iklan atau laporan aktif"}
              </p>
              <p className="mx-auto mt-1 max-w-[380px] text-xs leading-5 text-slate-500">
                {activeTab === "riwayat"
                  ? "Barang yang ditandai terjual atau laporan kehilangan yang selesai akan masuk ke tab ini."
                  : "Mulai pasang iklan barang bekas, tawarkan jasa mahasiswa, atau buat laporan Lost & Found."}
              </p>
              {activeTab === "listing" && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Link
                    href="/marketplace?action=create"
                    className="rounded-lg bg-[#002147] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0a2f5c]"
                  >
                    + Jual Barang
                  </Link>
                  <Link
                    href="/services?action=create"
                    className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    + Tawarkan Jasa
                  </Link>
                </div>
              )}
            </div>
          ) : (
            displayedListings.map((item) => {
              const isBusy = busyUid === item.uid;
              return (
                <article
                  key={item.uid}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <Link
                      href={item.detailHref}
                      className="block h-28 w-full shrink-0 overflow-hidden rounded-lg bg-[#EEF2F7] sm:h-[108px] sm:w-36"
                    >
                      <ListingImage
                        module={item.kind as ImageModule}
                        seed={item.id}
                        images={item.images}
                        hint={`${item.badge} ${item.title}`}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`rounded border px-2 py-0.5 text-[11px] font-medium ${item.toneClass}`}
                        >
                          {item.badge}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              item.isCompleted
                                ? "bg-sky-500"
                                : item.status === "active" ||
                                    item.status === "open"
                                  ? "bg-emerald-500"
                                  : "bg-slate-400"
                            }`}
                            aria-hidden="true"
                          />
                          {item.statusLabel}
                        </span>
                      </div>

                      <h2 className="mt-2 text-[15px] font-semibold leading-6 text-slate-900">
                        <Link href={item.detailHref} className="hover:underline">
                          {item.title}
                        </Link>
                      </h2>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                        {item.description}
                      </p>

                      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                        <div>
                          {item.priceText ? (
                            <>
                              <p className="text-[11px] text-slate-400">
                                {item.priceLabel}
                              </p>
                              <p className="text-base font-bold text-slate-900">
                                {item.priceText}
                              </p>
                            </>
                          ) : (
                            item.locationNote && (
                              <p className="text-xs text-slate-500">
                                Lokasi:{" "}
                                <span className="font-medium text-slate-700">
                                  {item.locationNote}
                                </span>
                              </p>
                            )
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setEditingItem(item)}
                            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            Edit
                          </button>

                          {item.status === "hidden" ? (
                            <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800">
                              Disembunyikan moderator
                            </span>
                          ) : (
                            <>
                              {item.kind === "marketplace" &&
                                (item.status === "sold" ? (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() =>
                                      void handleStatusChange(item, "active")
                                    }
                                    className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                  >
                                    Aktifkan Lagi
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() =>
                                      void handleStatusChange(item, "sold")
                                    }
                                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                  >
                                    Tandai Terjual
                                  </button>
                                ))}

                              {item.kind === "service" && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() =>
                                    void handleStatusChange(
                                      item,
                                      item.status === "active"
                                        ? "inactive"
                                        : "active"
                                    )
                                  }
                                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                  {item.status === "active"
                                    ? "Tutup Slot"
                                    : "Buka Slot"}
                                </button>
                              )}

                              {item.kind === "lostfound" &&
                                (item.isCompleted ? (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() =>
                                      void handleStatusChange(item, "open")
                                    }
                                    className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                  >
                                    Buka Kembali
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() =>
                                      void handleStatusChange(item, "resolved")
                                    }
                                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                  >
                                    Tandai Selesai
                                  </button>
                                ))}
                            </>
                          )}

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleDelete(item)}
                            className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Kolom kanan: widget */}
        <aside className="space-y-5">
          {/* Digital KTM */}
          <section
            aria-labelledby="ktm-heading"
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <h2
                id="ktm-heading"
                className="flex items-center gap-2 text-sm font-semibold text-slate-900"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                  className="text-slate-600"
                >
                  <rect
                    x="2"
                    y="3"
                    width="12"
                    height="10"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <circle
                    cx="6"
                    cy="7"
                    r="1.6"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M3.5 11.5C3.5 10 4.6 9 6 9s2.5 1 2.5 2.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M10.5 6.5H12.5M10.5 8.5H12.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
                Kartu Tanda Mahasiswa
              </h2>
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Digital KTM
              </span>
            </div>

            <div className="mt-3 overflow-hidden rounded-xl bg-[#002147] p-4 text-white">
              <div className="flex items-start gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#002147]">
                  UPN
                </span>
                <div>
                  <p className="text-[9px] font-semibold uppercase leading-3 tracking-wide text-amber-300">
                    Kementerian Pendidikan Tinggi, Sains, dan Teknologi
                  </p>
                  <p className="mt-0.5 text-[11px] font-bold leading-4">
                    UPN &ldquo;VETERAN&rdquo; JAWA TIMUR
                  </p>
                  <p className="text-[9px] uppercase tracking-widest text-slate-300">
                    Kartu Identitas Komunitas Mahasiswa
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <div className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-200 text-lg font-bold text-[#002147]">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <dl className="min-w-0 text-[10px] leading-4">
                  <dt className="uppercase tracking-wide text-slate-400">
                    Nama Lengkap
                  </dt>
                  <dd className="truncate text-xs font-semibold text-white">
                    {displayName}
                  </dd>
                  <dt className="mt-1.5 uppercase tracking-wide text-slate-400">
                    Nomor Induk Mahasiswa
                  </dt>
                  <dd className="text-xs font-bold text-amber-300">
                    {displayNim}
                  </dd>
                  <dt className="mt-1.5 uppercase tracking-wide text-slate-400">
                    Fakultas
                  </dt>
                  <dd className="truncate font-medium text-white">
                    {displayFaculty}
                  </dd>
                  <dt className="mt-1.5 uppercase tracking-wide text-slate-400">
                    Email Institusi
                  </dt>
                  <dd className="truncate font-medium text-slate-200">
                    {displayEmail}
                  </dd>
                </dl>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div
                    className="flex h-6 items-stretch gap-[2px]"
                    aria-hidden="true"
                  >
                    {[3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1, 2, 1].map(
                      (w, i) => (
                        <span
                          key={i}
                          className="bg-white"
                          style={{ width: `${w}px` }}
                        />
                      )
                    )}
                  </div>
                  <p className="mt-1 text-[9px] tracking-widest text-slate-300">
                    {displayNim !== "-" ? displayNim : `ID-${user?.id ?? 1}`}
                  </p>
                </div>
                <p className="text-right text-[9px] leading-3 text-slate-300">
                  Status Akun
                  <span className="mt-0.5 block text-[10px] font-semibold text-emerald-300">
                    Aktif Terdaftar
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 text-xs">
              <p className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                  <path
                    d="M5.5 8.2L7.4 10L10.6 6.4"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Sinkron dengan akun portal
              </p>
              <button
                type="button"
                onClick={() => setEditProfileOpen(true)}
                className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]"
              >
                Perbarui data
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M6 3L11 8L6 13"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </section>

          {/* Ulasan Terbaru */}
          <section
            aria-labelledby="reviews-heading"
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <h2
                id="reviews-heading"
                className="text-sm font-semibold text-slate-900"
              >
                Ulasan Terbaru
              </h2>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                ★{" "}
                {meData && meData.stats.rating_count > 0
                  ? `${meData.stats.rating_average.toFixed(1)} (${meData.stats.rating_count})`
                  : "Belum ada"}
              </span>
            </div>
            {reviews.length === 0 ? (
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Belum ada ulasan dari transaksi sebelumnya.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {reviews.slice(0, 3).map((review) => (
                  <li key={review.id} className="rounded-lg bg-[#F8F9FB] p-3">
                    <blockquote className="text-xs italic leading-5 text-slate-600">
                      “{review.review || `Memberikan rating ${review.rating}/5`}”
                    </blockquote>
                    <p className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="font-medium text-slate-700">
                        {review.reviewer_name}
                      </span>
                      <span className="text-slate-400">
                        {formatRelativeDate(review.created_at)}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
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
    </div>
  );
}
