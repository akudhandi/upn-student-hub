"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { apiFetch, uploadMedia, type ApiError } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { formatOptionalShortDate, initialsOf } from "@/lib/formatters";
import FilterDropdown from "@/components/FilterDropdown";
import type { CategoryOption } from "@/components/CategoryTabs";
import { StatusBadge, type ApiLostFoundItem } from "./ReportCard";

type LostFoundCreateResponse = {
  message: string;
  data: ApiLostFoundItem;
};

export type ReportType = "lost" | "found";
type ContactChannel = "chat" | "whatsapp" | "instagram" | "telegram" | "other";
type ModalMenuKey = "modal-category" | "modal-contact-channel" | null;

export type CreatedReportSummary = {
  id: number;
  title: string;
  type: ReportType;
};

const EMPTY_FORM = {
  title: "",
  category_id: "",
  location: "",
  date_event: "",
  reward: "",
  description: "",
  contact_info: "",
};

const CONTACT_CHANNEL_OPTIONS: { value: ContactChannel; label: string }[] = [
  { value: "chat", label: "Chat dalam aplikasi saja (Privasi)" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "telegram", label: "Telegram" },
  { value: "other", label: "Media sosial / kontak lain" },
];

const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = MAX_UPLOAD_BYTES;

function subscribeNoop() {
  return () => {};
}

export function CreateReportModal({
  categoryOptions,
  currentUser,
  onClose,
  onCreated,
}: {
  categoryOptions: CategoryOption[];
  currentUser: AuthUser | null;
  onClose: () => void;
  onCreated: (created: CreatedReportSummary) => void;
}) {
  const isMounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const [reportType, setReportType] = useState<ReportType>("lost");
  const [contactChannel, setContactChannel] = useState<ContactChannel>("chat");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState<{ id: number; url: string; file: File }[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<ModalMenuKey>(null);

  const photoIdRef = useRef(0);
  const photosRef = useRef(photos);
  const modalCategoryDropdownRef = useRef<HTMLDivElement | null>(null);
  const modalContactChannelDropdownRef = useRef<HTMLDivElement | null>(null);
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

    return () => {
      window.cancelAnimationFrame(rafId);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (openMenu !== null) {
          setOpenMenu(null);
          return;
        }
        handleClose();
      }
    }

    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (openMenu === "modal-category") {
        if (modalCategoryDropdownRef.current && !modalCategoryDropdownRef.current.contains(target)) {
          setOpenMenu(null);
        }
        return;
      }
      if (openMenu === "modal-contact-channel") {
        if (
          modalContactChannelDropdownRef.current &&
          !modalContactChannelDropdownRef.current.contains(target)
        ) {
          setOpenMenu(null);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    if (openMenu !== null) {
      document.addEventListener("mousedown", handleMouseDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [openMenu, handleClose]);

  function toggleMenu(key: Exclude<ModalMenuKey, null>) {
    setOpenMenu((prev) => (prev === key ? null : key));
  }

  function updateForm<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPhotoError(null);

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      setPhotoError(`Maksimal ${MAX_PHOTOS} foto per laporan.`);
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
      if (file.size > MAX_PHOTO_BYTES) {
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
      setPhotos((prev) => [...prev, ...accepted].slice(0, MAX_PHOTOS));
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
    const rewardRaw = formData.reward.trim();
    const rewardNumeric = Number(rewardRaw);

    let normalizedContact: string | null = null;
    const rawContact = formData.contact_info.trim();
    if (contactChannel === "whatsapp") {
      const contactDigits = rawContact.replace(/\D/g, "");
      if (contactDigits.length < 9) {
        setSubmitError("Masukkan nomor WhatsApp aktif yang valid atau pilih opsi Chat dalam aplikasi.");
        return;
      }
      normalizedContact = contactDigits.startsWith("8") ? `0${contactDigits}` : rawContact;
    } else if (contactChannel === "instagram") {
      const handle = rawContact.replace(/^@+/, "").replace(/\s+/g, "");
      if (!handle) {
        setSubmitError("Masukkan username Instagram atau pilih opsi Chat dalam aplikasi.");
        return;
      }
      normalizedContact = `Instagram: @${handle}`;
    } else if (contactChannel === "telegram") {
      const handle = rawContact.replace(/^@+/, "").replace(/\s+/g, "");
      if (!handle) {
        setSubmitError("Masukkan username Telegram atau pilih opsi Chat dalam aplikasi.");
        return;
      }
      normalizedContact = `Telegram: @${handle}`;
    } else if (contactChannel === "other") {
      if (!rawContact) {
        setSubmitError("Masukkan ID atau kontak yang dapat dihubungi, atau pilih opsi Chat dalam aplikasi.");
        return;
      }
      normalizedContact = rawContact;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const uploaded =
        photos.length > 0
          ? await Promise.all(photos.map((p) => uploadMedia(p.file, "lost-found")))
          : [];
      const created = await apiFetch<LostFoundCreateResponse>("/v1/lost-found", {
        method: "POST",
        body: JSON.stringify({
          type: reportType,
          title: formData.title.trim(),
          category_id: formData.category_id === "" ? null : Number(formData.category_id),
          location: formData.location.trim(),
          date_event: formData.date_event === "" ? null : formData.date_event,
          reward:
            reportType === "lost" && rewardRaw !== "" && !Number.isNaN(rewardNumeric) && rewardNumeric >= 0
              ? `Rp ${rewardNumeric.toLocaleString("id-ID")}`
              : null,
          description: formData.description.trim(),
          contact_info: normalizedContact,
          image_paths: uploaded.map((u) => u.path),
        }),
      });
      setPhotos((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.url));
        return [];
      });
      onCreated({
        id: created.data.id,
        title: created.data.title,
        type: reportType,
      });
    } catch (err) {
      const apiError = err as ApiError;
      const fieldErrors = apiError.errors
        ? Object.values(apiError.errors).flat().join(" ")
        : null;
      setSubmitError(fieldErrors || apiError.message || "Gagal mempublikasikan laporan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const previewCategory =
    categoryOptions.find((c) => String(c.id) === formData.category_id)?.name ?? "Kategori barang";
  const previewDate = formData.date_event
    ? formatOptionalShortDate(formData.date_event) ?? "Tanggal belum dipilih"
    : "Tanggal belum dipilih";
  const previewReporterName = currentUser?.profile?.name || currentUser?.name || "Mahasiswa UPN";
  const parsedPreviewReward = Number(formData.reward);
  const hasValidPreviewReward =
    reportType === "lost" &&
    formData.reward.trim() !== "" &&
    !Number.isNaN(parsedPreviewReward) &&
    parsedPreviewReward >= 0;

  if (!isMounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#141416]/50 p-4 sm:p-8"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lapor-barang-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[940px] flex-col overflow-hidden rounded-[28px] border border-[#E5E0DA] bg-[#F4F1EE] shadow-[0_20px_48px_-20px_rgba(20,20,22,0.20)] sm:max-h-[calc(100dvh-4rem)]"
      >
        <div className="shrink-0 border-b border-[#E5E0DA] px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-[#E5E0DA] bg-white px-4 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M10 3.5L5.5 8L10 12.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Kembali</span>
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              aria-label="Tutup form laporan barang"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5E0DA] bg-white text-lg text-[#57534E] transition-colors hover:border-[#141416] hover:text-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
            >
              ×
            </button>
          </div>
          <p className="text-[13px] font-medium text-[#6E6A66]">
            Portal Mahasiswa · Buat Laporan Barang
          </p>
          <h2
            id="lapor-barang-title"
            className="mt-1 font-display text-2xl font-semibold tracking-tight text-[#141416]"
          >
            {reportType === "lost" ? "Lapor barang hilang." : "Lapor barang temuan."}{" "}
            <span className="font-normal text-[#6E6A66]">
              {reportType === "lost"
                ? "Bantu rekan kampus mengenali barang Anda."
                : "Bantu pemilik menemukan kembali barangnya."}
            </span>
          </h2>
        </div>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-5 sm:px-7 sm:pb-7"
        >
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.45fr_0.85fr]">
            {/* Form Card */}
            <div className="min-w-0 space-y-5 rounded-[20px] border border-[#E5E0DA] bg-white p-5 sm:p-6">
              <fieldset>
                <legend className="text-[14px] font-medium text-[#141416]">
                  Jenis pelaporan <span className="text-[#B83232]">*</span>
                </legend>
                <div
                  className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"
                  role="radiogroup"
                  aria-label="Jenis pelaporan"
                >
                  {(
                    [
                      { value: "lost", label: "Barang Hilang" },
                      { value: "found", label: "Barang Ditemukan" },
                    ] as const
                  ).map((opt) => {
                    const checked = reportType === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border px-4 py-2 text-center text-[13px] font-medium transition-all focus-within:ring-2 focus-within:ring-[#141416] focus-within:ring-offset-1 ${
                          checked
                            ? "border-[#141416] bg-[#141416] text-white"
                            : "border-[#E5E0DA] bg-[#F6F4F1] text-[#57534E] hover:border-[#CFC8BF] hover:text-[#141416]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="laporan-jenis"
                          value={opt.value}
                          checked={checked}
                          onChange={() => setReportType(opt.value)}
                          className="sr-only"
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <section aria-labelledby="laporan-info-heading" className="space-y-4 border-t border-[#F1EDE8] pt-5">
                <h3 id="laporan-info-heading" className="font-display text-[16px] font-semibold text-[#141416]">
                  Informasi barang
                </h3>

                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <label htmlFor="laporan-title" className="block text-[14px] font-medium text-[#141416]">
                      Nama barang <span className="text-[#B83232]">*</span>
                    </label>
                    <span className="text-[13px] text-[#6E6A66]">
                      {formData.title.length}/255
                    </span>
                  </div>
                  <input
                    ref={titleInputRef}
                    id="laporan-title"
                    type="text"
                    required
                    maxLength={255}
                    value={formData.title}
                    onChange={(e) => updateForm("title", e.target.value)}
                    placeholder="Masukkan nama atau jenis barang"
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 text-[14px] text-[#141416] placeholder:text-[#66625E] transition-all focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none"
                  />
                </div>

                <div ref={modalCategoryDropdownRef}>
                  <FilterDropdown
                    id="laporan-category"
                    label="Kategori"
                    value={formData.category_id}
                    displayLabel={
                      formData.category_id === ""
                        ? "Pilih kategori (opsional)"
                        : (categoryOptions.find((c) => String(c.id) === formData.category_id)?.name ??
                          "Pilih kategori (opsional)")
                    }
                    isOpen={openMenu === "modal-category"}
                    disabled={categoryOptions.length === 0}
                    onToggle={() => toggleMenu("modal-category")}
                    onSelect={(nextVal) => {
                      updateForm("category_id", nextVal);
                      setOpenMenu(null);
                    }}
                    options={[
                      { value: "", label: "Tanpa kategori" },
                      ...categoryOptions.map((cat) => ({
                        value: String(cat.id),
                        label: cat.name,
                      })),
                    ]}
                  />
                  {categoryOptions.length === 0 && (
                    <p className="mt-1.5 text-[13px] text-[#6E6A66]">
                      Kategori belum tersedia. Anda tetap dapat melanjutkan tanpa kategori.
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <label htmlFor="laporan-description" className="block text-[14px] font-medium text-[#141416]">
                      Deskripsi dan ciri khusus <span className="text-[#B83232]">*</span>
                    </label>
                    <span className="text-[13px] text-[#6E6A66]">
                      {formData.description.length}/2000
                    </span>
                  </div>
                  <textarea
                    id="laporan-description"
                    required
                    rows={4}
                    maxLength={2000}
                    value={formData.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                    placeholder="Jelaskan warna, ciri khusus, kondisi, atau kronologi singkat"
                    className="mt-1.5 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] p-3.5 text-[14px] leading-relaxed text-[#141416] placeholder:text-[#66625E] transition-all focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span id="laporan-photos-label" className="block text-[14px] font-medium text-[#141416]">
                      {reportType === "lost" ? "Foto referensi barang" : "Dokumentasi foto"} ({photos.length}/{MAX_PHOTOS})
                    </span>
                    <span className="text-[13px] text-[#6E6A66]">
                      Foto pertama menjadi sampul
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3" role="group" aria-labelledby="laporan-photos-label">
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
                    {photos.length < MAX_PHOTOS && (
                      <label className="flex h-20 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#CFC8BF] bg-[#F6F4F1] text-[#57534E] transition-colors hover:border-[#141416] hover:bg-white focus-within:ring-2 focus-within:ring-[#141416]">
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <span className="text-[13px] font-medium">Tambah</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          aria-label="Unggah foto barang"
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
              </section>

              <section aria-labelledby="laporan-lokasi-heading" className="space-y-4 border-t border-[#F1EDE8] pt-5">
                <h3 id="laporan-lokasi-heading" className="font-display text-[16px] font-semibold text-[#141416]">
                  Lokasi dan waktu
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="laporan-location" className="block text-[14px] font-medium text-[#141416]">
                      Titik kampus <span className="text-[#B83232]">*</span>
                    </label>
                    <input
                      id="laporan-location"
                      type="text"
                      required
                      maxLength={255}
                      value={formData.location}
                      onChange={(e) => updateForm("location", e.target.value)}
                      placeholder="Sebutkan gedung, ruangan, atau area kampus"
                      className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 text-[14px] text-[#141416] placeholder:text-[#66625E] transition-all focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="laporan-date" className="block text-[14px] font-medium text-[#141416]">
                      Tanggal kejadian <span className="text-[#B83232]">*</span>
                    </label>
                    <input
                      id="laporan-date"
                      type="date"
                      required
                      value={formData.date_event}
                      onChange={(e) => updateForm("date_event", e.target.value)}
                      className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 text-[14px] text-[#141416] transition-all focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none"
                    />
                  </div>
                </div>
              </section>

              {reportType === "lost" && (
                <section
                  aria-labelledby="laporan-imbalan-heading"
                  className="rounded-[20px] border border-[#E8D8BE] bg-[#FAF4E8] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 id="laporan-imbalan-heading" className="text-[14px] font-semibold text-[#141416]">
                      Opsi imbalan <span className="font-normal text-[#57534E]">(Opsional)</span>
                    </h3>
                    <span className="rounded-md bg-[#F3E6CE] px-2.5 py-0.5 text-[13px] font-semibold text-[#78440E]">
                      Khusus barang hilang
                    </span>
                  </div>
                  <div className="mt-3">
                    <label htmlFor="laporan-reward" className="block text-[13px] font-medium text-[#141416]">
                      Nominal imbalan (Rp)
                    </label>
                    <div className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-[#E5E0DA] bg-white px-3.5 transition-all focus-within:border-[#141416] focus-within:shadow-[0_0_0_3px_rgba(20,20,22,0.06)]">
                      <span className="text-[14px] font-semibold text-[#57534E]">Rp</span>
                      <input
                        id="laporan-reward"
                        type="number"
                        min={0}
                        step="any"
                        value={formData.reward}
                        onChange={(e) => updateForm("reward", e.target.value)}
                        placeholder="Masukkan nominal imbalan (opsional)"
                        className="w-full bg-transparent text-[14px] font-semibold text-[#141416] placeholder:font-normal placeholder:text-[#66625E] focus:outline-none"
                      />
                    </div>
                    <p className="mt-1.5 text-[13px] text-[#57534E]">
                      Bersifat sukarela. Nominal dapat disepakati saat serah terima barang.
                    </p>
                  </div>
                </section>
              )}

              <section aria-labelledby="laporan-kontak-heading" className="space-y-3 border-t border-[#F1EDE8] pt-5">
                <h3 id="laporan-kontak-heading" className="font-display text-[16px] font-semibold text-[#141416]">
                  Kontak pelapor
                </h3>
                <div ref={modalContactChannelDropdownRef}>
                  <FilterDropdown
                    id="laporan-contact-channel"
                    label="Preferensi kontak"
                    placement="top"
                    value={contactChannel}
                    displayLabel={
                      CONTACT_CHANNEL_OPTIONS.find((opt) => opt.value === contactChannel)
                        ?.label ?? "Chat dalam aplikasi saja (Privasi)"
                    }
                    isOpen={openMenu === "modal-contact-channel"}
                    onToggle={() => toggleMenu("modal-contact-channel")}
                    onSelect={(nextVal) => {
                      setContactChannel(nextVal as ContactChannel);
                      updateForm("contact_info", "");
                      setSubmitError(null);
                      setOpenMenu(null);
                    }}
                    options={CONTACT_CHANNEL_OPTIONS}
                  />
                </div>

                {contactChannel === "chat" ? (
                  <p className="rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-4 py-3 text-[13px] leading-relaxed text-[#57534E]">
                    Nomor telepon dan akun media sosial Anda tetap privat. Rekan kampus tetap dapat menghubungi Anda lewat{" "}
                    <strong className="font-semibold text-[#141416]">
                      Chat 1-on-1 dalam aplikasi
                    </strong>{" "}
                    pada halaman detail laporan.
                  </p>
                ) : (
                  <div>
                    <label htmlFor="laporan-contact" className="block text-[14px] font-medium text-[#141416]">
                      {contactChannel === "whatsapp"
                        ? "Nomor WhatsApp"
                        : contactChannel === "instagram"
                          ? "Username Instagram"
                          : contactChannel === "telegram"
                            ? "Username Telegram"
                            : "Kontak atau ID media sosial lain"}{" "}
                      <span className="text-[#B83232]">*</span>
                    </label>
                    <div className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 transition-all focus-within:border-[#141416] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(20,20,22,0.06)]">
                      {(contactChannel === "whatsapp" ||
                        contactChannel === "instagram" ||
                        contactChannel === "telegram") && (
                        <span className="shrink-0 rounded-md bg-[#EFECE8] px-2 py-0.5 text-[13px] font-semibold text-[#5F5B57]">
                          {contactChannel === "whatsapp" ? "+62" : "@"}
                        </span>
                      )}
                      <input
                        id="laporan-contact"
                        type={contactChannel === "whatsapp" ? "tel" : "text"}
                        required
                        maxLength={contactChannel === "other" ? 65 : 50}
                        value={formData.contact_info}
                        onChange={(e) => updateForm("contact_info", e.target.value)}
                        placeholder={
                          contactChannel === "whatsapp"
                            ? "Masukkan nomor WhatsApp aktif"
                            : contactChannel === "instagram"
                              ? "Username Instagram tanpa @"
                              : contactChannel === "telegram"
                                ? "Username Telegram tanpa @"
                                : "Masukkan ID media sosial atau kanal aktif"
                        }
                        className="w-full bg-transparent text-[14px] text-[#141416] placeholder:text-[#66625E] focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </section>

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
                  {isSubmitting ? "Menyimpan laporan..." : "Publikasikan laporan"}
                </button>
              </div>
            </div>

            {/* Live Preview Card + Safety Guide */}
            <div className="min-w-0 space-y-4 lg:sticky lg:top-0">
              <aside
                aria-label="Pratinjau kartu laporan"
                className="rounded-[20px] border border-[#E5E0DA] bg-white p-5"
              >
                <p className="text-[13px] font-semibold text-[#141416]">
                  Pratinjau tampilan laporan
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
                      <span className="text-[13px] font-medium">
                        Belum ada foto dipilih
                      </span>
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
                        {previewCategory}
                      </span>
                      <StatusBadge type={reportType} status="open" />
                    </div>
                    <p className="mt-2.5 line-clamp-2 font-display text-[15px] font-semibold text-[#141416]">
                      {formData.title.trim() || "Judul laporan belum diisi"}
                    </p>
                    <p className="mt-1.5 truncate text-[13px] text-[#57534E]">
                      {formData.location.trim() || "Lokasi kejadian belum diisi"}
                    </p>
                    <p className="mt-1 text-[13px] text-[#6E6A66]">
                      {previewDate}
                    </p>
                    {hasValidPreviewReward && (
                      <p className="mt-2 w-fit rounded-md bg-[#FAF4E8] px-2.5 py-0.5 text-[13px] font-semibold text-[#78440E]">
                        Imbalan: Rp {parsedPreviewReward.toLocaleString("id-ID")}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2 border-t border-[#F1EDE8] pt-3">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#141416] text-[13px] font-semibold text-white"
                        aria-hidden="true"
                      >
                        {initialsOf(previewReporterName)}
                      </span>
                      <span className="truncate text-[13px] font-medium text-[#141416]">
                        {previewReporterName}
                      </span>
                    </div>
                  </div>
                </div>
              </aside>

              <aside
                aria-label="Panduan pelaporan dan keamanan"
                className="rounded-[20px] border border-[#E5E0DA] bg-white p-5"
              >
                <p className="font-display text-[15px] font-semibold text-[#141416]">
                  {reportType === "lost" ? "Panduan pelaporan" : "Panduan keamanan"}
                </p>
                <ul className="mt-2.5 space-y-2 text-[13px] leading-relaxed text-[#57534E]">
                  {reportType === "lost" ? (
                    <>
                      <li>
                        <strong className="text-[#141416]">Lapor ke pos satpam:</strong> segera lapor ke pos terdekat jika barang berharga.
                      </li>
                      <li>
                        <strong className="text-[#141416]">Periksa ruangan:</strong> cek kembali ruangan kelas terakhir sebelum jam kuliah selesai.
                      </li>
                      <li>
                        <strong className="text-[#141416]">Koordinasi aman:</strong> gunakan chat untuk koordinasi awal tanpa membagikan data sensitif.
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <strong className="text-[#141416]">Cek bukti kepemilikan:</strong> minta ciri khusus atau dokumen pendukung sebelum serah terima.
                      </li>
                      <li>
                        <strong className="text-[#141416]">Verifikasi KTM:</strong> cocokkan identitas pengambil dengan KTM aktif.
                      </li>
                      <li>
                        <strong className="text-[#141416]">Titik publik:</strong> lakukan serah terima di area ramai atau titipkan di pos satpam.
                      </li>
                    </>
                  )}
                </ul>
              </aside>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
