"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { apiFetch, uploadMedia, type ApiError } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_PHOTOS } from "@/lib/constants";
import { formatRupiah } from "@/lib/formatters";
import {
  CONDITION_META,
  SellerAvatar,
  type ApiMarketplaceItem,
} from "./MarketplaceCard";

const CONDITION_OPTIONS = [
  { value: "new", label: "Baru" },
  { value: "like-new", label: "Seperti baru" },
  { value: "good", label: "Layak pakai" },
  { value: "fair", label: "Perlu perbaikan" },
] as const;

const EMPTY_FORM = {
  title: "",
  category_id: "",
  condition: "good",
  price: "",
  description: "",
};

type MarketplaceCreateResponse = {
  message: string;
  data: ApiMarketplaceItem;
};

function subscribeNoop() {
  return () => {};
}

export function CreateListingModal({
  categoryOptions,
  currentUser,
  onClose,
  onCreated,
}: {
  categoryOptions: { id: number; name: string }[];
  currentUser: AuthUser | null;
  onClose: () => void;
  onCreated: (created: { id: number; title: string }) => void;
}) {
  const isMounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState<{ id: number; url: string; file: File }[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const photoIdRef = useRef(0);
  const photosRef = useRef(photos);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, []);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    onClose();
  }, [isSubmitting, onClose]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const rafId = window.requestAnimationFrame(() => {
      titleInputRef.current?.focus({ preventScroll: true });
    });

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(rafId);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClose]);

  function updateForm<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPhotoError(null);

    const remaining = MAX_UPLOAD_PHOTOS - photos.length;
    if (remaining <= 0) {
      setPhotoError(`Maksimal ${MAX_UPLOAD_PHOTOS} foto per iklan.`);
      return;
    }

    const accepted: { id: number; url: string; file: File }[] = [];
    let skippedType = 0;
    let skippedSize = 0;

    for (const file of Array.from(files)) {
      if (accepted.length >= remaining) break;
      if (!file.type.startsWith("image/")) {
        skippedType += 1;
        continue;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        skippedSize += 1;
        continue;
      }
      photoIdRef.current += 1;
      accepted.push({
        id: photoIdRef.current,
        url: URL.createObjectURL(file),
        file,
      });
    }

    if (skippedType > 0 || skippedSize > 0) {
      const reasons: string[] = [];
      if (skippedType > 0) reasons.push("format harus berupa gambar");
      if (skippedSize > 0) reasons.push("ukuran maksimal 5 MB per foto");
      setPhotoError(`Sebagian file dilewati (${reasons.join(", ")}).`);
    }

    if (accepted.length > 0) {
      setPhotos((prev) => [...prev, ...accepted].slice(0, MAX_UPLOAD_PHOTOS));
    }
  }

  function removePhoto(id: number) {
    setPhotoError(null);
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const categoryId = Number(formData.category_id);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      setSubmitError("Pilih kategori barang yang tersedia terlebih dahulu.");
      return;
    }
    const parsedPrice = Number(formData.price);
    if (formData.price.trim() === "" || Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setSubmitError("Masukkan nominal harga yang valid (minimal Rp 0).");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const uploaded =
        photos.length > 0
          ? await Promise.all(photos.map((p) => uploadMedia(p.file, "marketplace")))
          : [];
      const created = await apiFetch<MarketplaceCreateResponse>("/v1/marketplace", {
        method: "POST",
        body: JSON.stringify({
          title: formData.title.trim(),
          category_id: categoryId,
          condition: formData.condition,
          price: parsedPrice,
          description: formData.description.trim(),
          image_paths: uploaded.map((u) => u.path),
        }),
      });
      onCreated({ id: created.data.id, title: created.data.title });
    } catch (err) {
      const apiError = err as ApiError;
      const fieldErrors = apiError.errors
        ? Object.values(apiError.errors).flat().join(" ")
        : null;
      setSubmitError(fieldErrors || apiError.message || "Gagal memasang iklan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const previewCategoryName =
    categoryOptions.find((c) => String(c.id) === formData.category_id)?.name ?? "Kategori";
  const previewSellerName = currentUser?.profile?.name || currentUser?.name || "Mahasiswa UPN";
  const previewSellerFaculty = currentUser?.profile?.faculty || "UPN Veteran Jatim";
  const parsedPreviewPrice = Number(formData.price);
  const hasValidPreviewPrice =
    formData.price.trim() !== "" && !Number.isNaN(parsedPreviewPrice) && parsedPreviewPrice >= 0;
  const previewCondition = CONDITION_META[formData.condition] ?? CONDITION_META.good;

  if (!isMounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#141416]/50 p-4"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pasang-iklan-title"
        onClick={(e) => e.stopPropagation()}
        className="auth-shell-enter max-h-[92vh] w-full max-w-[940px] overflow-y-auto rounded-[28px] border border-[#E5E0DA] bg-[#F4F1EE] p-5 shadow-[0_20px_48px_-20px_rgba(20,20,22,0.20)] sm:p-7"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E5E0DA] pb-4">
          <div>
            <p className="text-[13px] font-medium text-[#6E6A66]">
              Marketplace UPN · Pasang iklan baru
            </p>
            <h2
              id="pasang-iklan-title"
              className="mt-1 font-display text-2xl font-semibold tracking-tight text-[#141416]"
            >
              Pasang iklan barang.{" "}
              <span className="font-normal text-[#6E6A66]">
                Tawarkan ke sesama mahasiswa.
              </span>
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Tutup form pasang iklan"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5E0DA] bg-white text-lg text-[#57534E] transition-colors hover:border-[#141416] hover:text-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5">
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.45fr_0.85fr]">
            {/* Form Card */}
            <div className="space-y-4 rounded-[20px] border border-[#E5E0DA] bg-white p-5 sm:p-6">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="iklan-title"
                    className="block text-[14px] font-medium text-[#141416]"
                  >
                    Judul barang <span className="text-[#B83232]">*</span>
                  </label>
                  <span className="text-[13px] text-[#6E6A66]">
                    {formData.title.length}/255
                  </span>
                </div>
                <input
                  ref={titleInputRef}
                  id="iklan-title"
                  type="text"
                  required
                  maxLength={255}
                  value={formData.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  placeholder="Nama barang yang ditawarkan"
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 text-[14px] text-[#141416] placeholder:text-[#66625E] transition-all focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="iklan-category"
                    className="block text-[14px] font-medium text-[#141416]"
                  >
                    Kategori <span className="text-[#B83232]">*</span>
                  </label>
                  <select
                    id="iklan-category"
                    required
                    value={formData.category_id}
                    onChange={(e) => updateForm("category_id", e.target.value)}
                    disabled={categoryOptions.length === 0}
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 text-[14px] text-[#141416] transition-all focus:border-[#141416] focus:bg-white focus:outline-none disabled:opacity-60"
                  >
                    <option value="">Pilih kategori</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {categoryOptions.length === 0 && (
                    <p className="mt-1.5 text-[13px] text-[#6E6A66]">
                      Kategori belum tersedia. Tunggu data marketplace dimuat.
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="iklan-price"
                    className="block text-[14px] font-medium text-[#141416]"
                  >
                    Harga (Rp) <span className="text-[#B83232]">*</span>
                  </label>
                  <div className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 transition-all focus-within:border-[#141416] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(20,20,22,0.06)]">
                    <span className="text-[14px] font-semibold text-[#57534E]">Rp</span>
                    <input
                      id="iklan-price"
                      type="number"
                      required
                      min={0}
                      step="any"
                      value={formData.price}
                      onChange={(e) => updateForm("price", e.target.value)}
                      placeholder="Masukkan nominal harga"
                      className="w-full bg-transparent text-[14px] font-semibold text-[#141416] placeholder:font-normal placeholder:text-[#66625E] focus:outline-none"
                    />
                  </div>
                  {hasValidPreviewPrice && (
                    <p className="mt-1.5 text-[13px] text-[#6E6A66]">
                      Tampilan harga: {formatRupiah(parsedPreviewPrice)}
                    </p>
                  )}
                </div>
              </div>

              <fieldset>
                <legend className="text-[14px] font-medium text-[#141416]">
                  Kondisi barang <span className="text-[#B83232]">*</span>
                </legend>
                <div
                  className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"
                  role="radiogroup"
                  aria-label="Kondisi barang"
                >
                  {CONDITION_OPTIONS.map((opt) => {
                    const checked = formData.condition === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-center text-[13px] font-medium transition-all focus-within:ring-2 focus-within:ring-[#141416] focus-within:ring-offset-1 ${
                          checked
                            ? "border-[#141416] bg-[#141416] text-white"
                            : "border-[#E5E0DA] bg-[#F6F4F1] text-[#57534E] hover:border-[#CFC8BF]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="iklan-condition"
                          value={opt.value}
                          checked={checked}
                          onChange={(e) => updateForm("condition", e.target.value)}
                          required
                          className="sr-only"
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div>
                <label
                  htmlFor="iklan-description"
                  className="block text-[14px] font-medium text-[#141416]"
                >
                  Deskripsi barang <span className="text-[#B83232]">*</span>
                </label>
                <textarea
                  id="iklan-description"
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  placeholder="Jelaskan kondisi barang, kelengkapan, dan titik temu COD di area kampus"
                  className="mt-1.5 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] p-3.5 text-[14px] leading-relaxed text-[#141416] placeholder:text-[#66625E] transition-all focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    id="iklan-photos-label"
                    className="block text-[14px] font-medium text-[#141416]"
                  >
                    Foto barang ({photos.length}/{MAX_UPLOAD_PHOTOS})
                  </span>
                  <span className="text-[13px] text-[#6E6A66]">
                    Foto pertama menjadi sampul
                  </span>
                </div>
                <div
                  className="mt-2 flex flex-wrap gap-3"
                  role="group"
                  aria-labelledby="iklan-photos-label"
                >
                  {photos.map((photo, i) => (
                    <span key={photo.id} className="relative h-20 w-20">
                      {/* eslint-disable-next-line @next/next/no-img-element -- local object URLs for instant upload preview only */}
                      <img
                        src={photo.url}
                        alt={`Foto barang ${i + 1}`}
                        width={80}
                        height={80}
                        className="h-20 w-20 rounded-xl border border-[#E5E0DA] object-cover"
                      />
                      {i === 0 && (
                        <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-[#141416]/85 px-1.5 py-0.5 text-[11px] font-medium text-white">
                          Utama
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        aria-label={`Hapus foto barang ${i + 1}`}
                        className="group absolute -right-3 -top-3 flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#141416] text-[13px] font-bold leading-none text-white transition-colors group-hover:bg-[#B83232]">
                          ×
                        </span>
                      </button>
                    </span>
                  ))}
                  {photos.length < MAX_UPLOAD_PHOTOS && (
                    <label className="flex h-20 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#CFC8BF] bg-[#F6F4F1] text-[#57534E] transition-colors hover:border-[#141416] hover:bg-white focus-within:ring-2 focus-within:ring-[#141416]">
                      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <span className="text-[13px] font-medium">Tambah</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        aria-label="Tambah foto barang"
                        className="sr-only"
                        onChange={(e) => {
                          addPhotos(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
                {photoError && (
                  <p role="alert" className="mt-2 text-[13px] font-medium text-[#B83232]">
                    {photoError}
                  </p>
                )}
              </div>

              {submitError && (
                <p
                  role="alert"
                  className="rounded-xl border border-[#F1C9C9] bg-[#FDF2F2] px-4 py-3 text-[13px] font-medium text-[#B83232]"
                >
                  {submitError}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#F1EDE8] pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-60"
                >
                  {isSubmitting ? "Menyimpan iklan..." : "Terbitkan iklan barang"}
                </button>
              </div>
            </div>

            {/* Live Preview Card */}
            <aside
              aria-label="Pratinjau kartu iklan"
              className="rounded-[20px] border border-[#E5E0DA] bg-white p-5 lg:sticky lg:top-0"
            >
              <p className="text-[13px] font-semibold text-[#141416]">
                Pratinjau tampilan katalog
              </p>
              <div className="mt-3 overflow-hidden rounded-2xl border border-[#EAE5DF] bg-white">
                <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#EFECE8] text-[#5F5B57]">
                  {photos.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local preview before upload
                    <img
                      src={photos[0].url}
                      alt="Pratinjau foto barang"
                      width={640}
                      height={480}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[13px] font-medium">Belum ada foto dipilih</span>
                  )}
                  {photos.length > 1 && (
                    <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-[#141416]/85 px-2 py-0.5 text-[13px] font-medium text-white">
                      {photos.length} foto
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-md bg-[#F4F1EE] px-2.5 py-0.5 text-[13px] font-medium text-[#57534E]">
                      {previewCategoryName}
                    </span>
                    <span
                      className={`rounded-md px-2.5 py-0.5 text-[13px] font-medium ${previewCondition.badgeClass}`}
                    >
                      {previewCondition.label}
                    </span>
                  </div>
                  <p className="mt-2.5 line-clamp-2 font-display text-[15px] font-semibold text-[#141416]">
                    {formData.title.trim() || "Judul barang belum diisi"}
                  </p>
                  <p
                    className={`mt-1 font-display text-[17px] font-bold ${
                      hasValidPreviewPrice ? "text-[#141416]" : "font-medium text-[#6E6A66]"
                    }`}
                  >
                    {hasValidPreviewPrice
                      ? formatRupiah(parsedPreviewPrice)
                      : "Harga belum diisi"}
                  </p>
                  <div className="mt-3 flex items-center gap-2 border-t border-[#F1EDE8] pt-3">
                    <SellerAvatar name={previewSellerName} />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[#141416]">
                        {previewSellerName}
                      </p>
                      <p className="truncate text-[13px] text-[#6E6A66]">
                        {previewSellerFaculty}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
