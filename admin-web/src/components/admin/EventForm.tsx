"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AdminImage from "@/components/admin/AdminImage";
import SelectWrapper from "@/components/admin/SelectWrapper";
import type { CategoryItem, EventStatus } from "@/lib/admin-api";
import { mediaUrl } from "@/lib/media";

export interface EventFormValues {
  title: string;
  category_id: string;
  organizer_name: string;
  event_date: string;
  event_time: string;
  location: string;
  registration_link: string;
  status: EventStatus;
  description: string;
  existingImagePaths: string[];
  newPosterFiles: File[];
}

export const EMPTY_EVENT_FORM: EventFormValues = {
  title: "",
  category_id: "",
  organizer_name: "",
  event_date: "",
  event_time: "",
  location: "",
  registration_link: "",
  status: "published",
  description: "",
  existingImagePaths: [],
  newPosterFiles: [],
};

const MAX_POSTER_BYTES = 5 * 1024 * 1024;
const MAX_POSTERS = 3;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

interface PendingPosterPreview {
  file: File;
  url: string;
}

export default function EventForm({
  initial,
  categories,
  submitLabel,
  submitting,
  serverError,
  onSubmit,
}: {
  initial: EventFormValues;
  categories: CategoryItem[];
  submitLabel: string;
  submitting: boolean;
  serverError: string | null;
  onSubmit: (values: EventFormValues) => void;
}) {
  const [values, setValues] = useState<EventFormValues>(initial);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pendingPreviews, setPendingPreviews] = useState<PendingPosterPreview[]>([]);
  const pendingUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    pendingUrlsRef.current = pendingPreviews.map((item) => item.url);
  }, [pendingPreviews]);

  useEffect(() => {
    return () => {
      for (const url of pendingUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  const activeCategories = categories.filter((cat) => cat.is_active);
  const hasInactiveSelectedCategory = Boolean(
    values.category_id &&
      categories.length > 0 &&
      !activeCategories.some((cat) => String(cat.id) === values.category_id),
  );
  const totalPosterCount =
    values.existingImagePaths.length + values.newPosterFiles.length;

  function setField<K extends keyof EventFormValues>(
    key: K,
    value: EventFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handlePosterChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (selected.length === 0) return;

    const remainingSlots = MAX_POSTERS - totalPosterCount;
    if (remainingSlots <= 0) {
      setValidationError(`Maksimal ${MAX_POSTERS} poster per event.`);
      return;
    }

    const accepted: PendingPosterPreview[] = [];
    for (const file of selected) {
      if (!ALLOWED_MIME.has(file.type)) {
        setValidationError("Format poster harus JPG, PNG, atau WebP.");
        return;
      }
      if (file.size > MAX_POSTER_BYTES) {
        setValidationError("Ukuran tiap poster maksimal 5 MB.");
        return;
      }
      if (accepted.length >= remainingSlots) {
        break;
      }
      accepted.push({
        file,
        url: URL.createObjectURL(file),
      });
    }

    if (selected.length > remainingSlots) {
      setValidationError(
        `Maksimal ${MAX_POSTERS} poster per event. Hanya ${remainingSlots} file pertama yang ditambahkan.`,
      );
    } else {
      setValidationError(null);
    }

    setPendingPreviews((prev) => [...prev, ...accepted]);
    setValues((prev) => ({
      ...prev,
      newPosterFiles: [...prev.newPosterFiles, ...accepted.map((item) => item.file)],
    }));
  }

  function handleRemoveExistingPoster(index: number) {
    setValidationError(null);
    setValues((prev) => ({
      ...prev,
      existingImagePaths: prev.existingImagePaths.filter((_, i) => i !== index),
    }));
  }

  function handleRemoveNewPoster(index: number) {
    setValidationError(null);
    const removed = pendingPreviews[index];
    if (removed) {
      URL.revokeObjectURL(removed.url);
    }
    setPendingPreviews((prev) => prev.filter((_, i) => i !== index));
    setValues((prev) => ({
      ...prev,
      newPosterFiles: prev.newPosterFiles.filter((_, i) => i !== index),
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !values.title.trim() ||
      !values.organizer_name.trim() ||
      !values.event_date ||
      !values.location.trim() ||
      !values.description.trim()
    ) {
      setValidationError(
        "Judul, penyelenggara, tanggal acara, lokasi, dan deskripsi wajib diisi.",
      );
      return;
    }
    setValidationError(null);
    onSubmit(values);
  }

  const displayError = validationError || serverError;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-[#E5E0DA] bg-white p-6"
    >
      {displayError && (
        <p
          role="alert"
          className="rounded-xl border border-[#F3C6C6] bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#A62D2D]"
        >
          {displayError}
        </p>
      )}

      <div>
        <label
          htmlFor="event-title"
          className="mb-1.5 block text-xs font-semibold text-[#57534E]"
        >
          Judul Event / Informasi <span className="text-[#C53939]">*</span>
        </label>
        <input
          id="event-title"
          type="text"
          required
          maxLength={255}
          value={values.title}
          onChange={(e) => setField("title", e.target.value)}
          placeholder="Contoh: Seminar Nasional Teknologi Informasi UPN 2026"
          className="w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] px-3.5 py-2.5 text-sm text-[#141416] outline-none transition placeholder:text-[#8C8782] focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="event-organizer"
            className="mb-1.5 block text-xs font-semibold text-[#57534E]"
          >
            Penyelenggara <span className="text-[#C53939]">*</span>
          </label>
          <input
            id="event-organizer"
            type="text"
            required
            maxLength={255}
            value={values.organizer_name}
            onChange={(e) => setField("organizer_name", e.target.value)}
            placeholder="Contoh: BEM Fasilkom UPN"
            className="w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] px-3.5 py-2.5 text-sm text-[#141416] outline-none transition placeholder:text-[#8C8782] focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
          />
        </div>

        <div>
          <label
            htmlFor="event-category"
            className="mb-1.5 block text-xs font-semibold text-[#57534E]"
          >
            Kategori
          </label>
          <SelectWrapper>
            <select
              id="event-category"
              value={values.category_id}
              onChange={(e) => setField("category_id", e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] py-2.5 pr-9 pl-3.5 text-sm text-[#141416] outline-none transition focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
            >
              <option value="">Pilih kategori (opsional)</option>
              {activeCategories.map((cat) => (
                <option key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </option>
              ))}
            </select>
          </SelectWrapper>
          {hasInactiveSelectedCategory && (
            <p className="mt-1.5 text-xs text-[#925814]">
              Kategori sebelumnya sedang nonaktif. Pilih kategori aktif di atas jika ingin menggantinya.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor="event-date"
            className="mb-1.5 block text-xs font-semibold text-[#57534E]"
          >
            Tanggal Acara <span className="text-[#C53939]">*</span>
          </label>
          <input
            id="event-date"
            type="date"
            required
            value={values.event_date}
            onChange={(e) => setField("event_date", e.target.value)}
            className="w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] px-3.5 py-2.5 text-sm text-[#141416] outline-none transition focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
          />
        </div>

        <div>
          <label
            htmlFor="event-time"
            className="mb-1.5 block text-xs font-semibold text-[#57534E]"
          >
            Waktu Pelaksanaan
          </label>
          <input
            id="event-time"
            type="text"
            maxLength={50}
            value={values.event_time}
            onChange={(e) => setField("event_time", e.target.value)}
            placeholder="09:00 – 12:00 WIB"
            className="w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] px-3.5 py-2.5 text-sm text-[#141416] outline-none transition placeholder:text-[#8C8782] focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
          />
        </div>

        <div>
          <label
            htmlFor="event-status"
            className="mb-1.5 block text-xs font-semibold text-[#57534E]"
          >
            Status Publikasi
          </label>
          <SelectWrapper>
            <select
              id="event-status"
              value={values.status}
              onChange={(e) => setField("status", e.target.value as EventStatus)}
              className="w-full cursor-pointer appearance-none rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] py-2.5 pr-9 pl-3.5 text-sm text-[#141416] outline-none transition focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
            >
              <option value="published">Published (Tayang)</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending Kurasi</option>
              <option value="archived">Archived (Arsip)</option>
              <option value="rejected">Rejected (Ditolak)</option>
            </select>
          </SelectWrapper>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="event-location"
            className="mb-1.5 block text-xs font-semibold text-[#57534E]"
          >
            Lokasi <span className="text-[#C53939]">*</span>
          </label>
          <input
            id="event-location"
            type="text"
            required
            maxLength={255}
            value={values.location}
            onChange={(e) => setField("location", e.target.value)}
            placeholder="Contoh: Gedung Giri Loka UPN / Zoom Meeting"
            className="w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] px-3.5 py-2.5 text-sm text-[#141416] outline-none transition placeholder:text-[#8C8782] focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
          />
        </div>

        <div>
          <label
            htmlFor="event-link"
            className="mb-1.5 block text-xs font-semibold text-[#57534E]"
          >
            Tautan Pendaftaran (Opsional)
          </label>
          <input
            id="event-link"
            type="url"
            maxLength={2048}
            value={values.registration_link}
            onChange={(e) => setField("registration_link", e.target.value)}
            placeholder="https://..."
            className="w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] px-3.5 py-2.5 text-sm text-[#141416] outline-none transition placeholder:text-[#8C8782] focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
          />
        </div>
      </div>

      {/* Poster Event */}
      <div>
        <label
          htmlFor="event-poster"
          className="mb-1.5 block text-xs font-semibold text-[#57534E]"
        >
          Poster / Gambar Event (Opsional, maks. {MAX_POSTERS} gambar)
        </label>
        <div className="space-y-3 rounded-xl border border-dashed border-[#D5cec6] bg-[#FAF8F6] p-4">
          {totalPosterCount > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {values.existingImagePaths.map((path, index) => (
                <div
                  key={`existing-${path}-${index}`}
                  className="overflow-hidden rounded-xl border border-[#E5E0DA] bg-white"
                >
                  <AdminImage
                    src={mediaUrl(path)}
                    alt={`Poster ${index + 1}`}
                    className="h-28 w-full bg-white object-cover"
                    fallbackClassName="flex h-28 w-full items-center justify-center bg-white px-2 text-center text-xs text-[#787470]"
                    fallbackLabel="Poster tidak dapat dimuat"
                  />
                  <div className="flex items-center justify-between gap-2 border-t border-[#F2EEEA] px-3 py-2">
                    <span className="text-xs font-medium text-[#57534E]">
                      {index === 0 ? "Poster Utama" : `Poster ${index + 1}`}
                    </span>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleRemoveExistingPoster(index)}
                      className="text-xs font-semibold text-[#C53939] hover:underline disabled:opacity-50"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
              {pendingPreviews.map((preview, index) => {
                const slotNumber = values.existingImagePaths.length + index + 1;
                return (
                  <div
                    key={`new-${preview.url}`}
                    className="overflow-hidden rounded-xl border border-[#E5E0DA] bg-white"
                  >
                    <AdminImage
                      src={preview.url}
                      alt={`Poster baru ${slotNumber}`}
                      className="h-28 w-full bg-white object-cover"
                      fallbackClassName="flex h-28 w-full items-center justify-center bg-white px-2 text-center text-xs text-[#787470]"
                      fallbackLabel="Poster tidak dapat dimuat"
                    />
                    <div className="flex items-center justify-between gap-2 border-t border-[#F2EEEA] px-3 py-2">
                      <span className="text-xs font-medium text-[#57534E]">
                        {slotNumber === 1 ? "Poster Utama" : `Poster ${slotNumber}`}
                      </span>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleRemoveNewPoster(index)}
                        className="text-xs font-semibold text-[#C53939] hover:underline disabled:opacity-50"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-24 w-full items-center justify-center rounded-xl border border-[#E5E0DA] bg-white text-xs text-[#787470]">
              Belum ada poster terpasang
            </div>
          )}

          <div className="space-y-1.5">
            <input
              id="event-poster"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              disabled={submitting || totalPosterCount >= MAX_POSTERS}
              onChange={handlePosterChange}
              className="block w-full text-xs text-[#57534E] file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-[#141416] file:px-3.5 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[#242428] disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-[#787470]">
              Format JPG, PNG, atau WebP. Maksimal {MAX_POSTERS} gambar, tiap file hingga 5 MB ({totalPosterCount}/{MAX_POSTERS} terisi).
            </p>
          </div>
        </div>
      </div>

      <div>
        <label
          htmlFor="event-description"
          className="mb-1.5 block text-xs font-semibold text-[#57534E]"
        >
          Deskripsi Lengkap <span className="text-[#C53939]">*</span>
        </label>
        <textarea
          id="event-description"
          required
          rows={6}
          value={values.description}
          onChange={(e) => setField("description", e.target.value)}
          placeholder="Tuliskan rincian agenda, persyaratan peserta, dan informasi penting lainnya…"
          className="w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] px-3.5 py-2.5 text-sm text-[#141416] outline-none transition placeholder:text-[#8C8782] focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-[#F2EEEA] pt-4">
        <Link
          href="/events"
          className="rounded-full border border-[#DFD9D2] bg-white px-4 py-2 text-xs font-semibold text-[#141416] transition hover:border-[#CFC8BF] hover:bg-[#FAF8F6]"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-[#141416] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#242428] disabled:opacity-60"
        >
          {submitting ? "Menyimpan…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
