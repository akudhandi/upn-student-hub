"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, uploadMedia } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";
import { resolveStorageUrl } from "@/lib/images";
import { initialsOf } from "@/lib/formatters";
import {
  extractApiErrorMessage,
  FAKULTAS_OPTIONS,
  INPUT_CLASS,
  SELECT_CLASS,
  TEXTAREA_CLASS,
  type UnifiedMyItem,
} from "./profile-types";

export function SelectChevron() {
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

/** Shared matte Warm-Alabaster modal wrapper with Escape key and backdrop dismissal. */
export function ModalShell({
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

export function EditProfileModal({
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

export function EditListingModal({
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
            contact_info: contactInfo.trim() === "" ? null : contactInfo.trim(),
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
                  Kontak penghubung <span className="font-normal text-[#6E6A66]">(Opsional)</span>
                </label>
                <input
                  id="edit-lf-contact"
                  type="text"
                  maxLength={80}
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="Nomor WhatsApp, @username medsos, atau kosongkan untuk chat"
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

export function ConfirmDeleteModal({
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
