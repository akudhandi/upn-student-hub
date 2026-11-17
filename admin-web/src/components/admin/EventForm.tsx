"use client";

import { useState } from "react";
import Link from "next/link";
import type { CategoryItem, EventStatus } from "@/lib/admin-api";

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
};

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

  function setField<K extends keyof EventFormValues>(
    key: K,
    value: EventFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
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
      className="space-y-5 rounded-xl bg-white p-6 shadow-sm"
    >
      {displayError && (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700"
        >
          {displayError}
        </p>
      )}

      <div>
        <label
          htmlFor="event-title"
          className="mb-1.5 block text-xs font-semibold text-slate-600"
        >
          Judul Event / Informasi <span className="text-rose-600">*</span>
        </label>
        <input
          id="event-title"
          type="text"
          required
          maxLength={255}
          value={values.title}
          onChange={(e) => setField("title", e.target.value)}
          placeholder="Contoh: Seminar Nasional Teknologi Informasi UPN 2026"
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="event-organizer"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            Penyelenggara <span className="text-rose-600">*</span>
          </label>
          <input
            id="event-organizer"
            type="text"
            required
            maxLength={255}
            value={values.organizer_name}
            onChange={(e) => setField("organizer_name", e.target.value)}
            placeholder="Contoh: BEM Fasilkom UPN"
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
          />
        </div>

        <div>
          <label
            htmlFor="event-category"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            Kategori
          </label>
          <select
            id="event-category"
            value={values.category_id}
            onChange={(e) => setField("category_id", e.target.value)}
            className="w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
          >
            <option value="">Pilih kategori (opsional)</option>
            {categories.map((cat) => (
              <option key={cat.id} value={String(cat.id)}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor="event-date"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            Tanggal Acara <span className="text-rose-600">*</span>
          </label>
          <input
            id="event-date"
            type="date"
            required
            value={values.event_date}
            onChange={(e) => setField("event_date", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
          />
        </div>

        <div>
          <label
            htmlFor="event-time"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
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
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
          />
        </div>

        <div>
          <label
            htmlFor="event-status"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            Status Publikasi
          </label>
          <select
            id="event-status"
            value={values.status}
            onChange={(e) => setField("status", e.target.value as EventStatus)}
            className="w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
          >
            <option value="published">Published (Tayang)</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending Kurasi</option>
            <option value="archived">Archived (Arsip)</option>
            <option value="rejected">Rejected (Ditolak)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="event-location"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            Lokasi <span className="text-rose-600">*</span>
          </label>
          <input
            id="event-location"
            type="text"
            required
            maxLength={255}
            value={values.location}
            onChange={(e) => setField("location", e.target.value)}
            placeholder="Contoh: Gedung Giri Loka UPN / Zoom Meeting"
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
          />
        </div>

        <div>
          <label
            htmlFor="event-link"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
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
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="event-description"
          className="mb-1.5 block text-xs font-semibold text-slate-600"
        >
          Deskripsi Lengkap <span className="text-rose-600">*</span>
        </label>
        <textarea
          id="event-description"
          required
          rows={6}
          value={values.description}
          onChange={(e) => setField("description", e.target.value)}
          placeholder="Tuliskan rincian agenda, persyaratan peserta, dan informasi penting lainnya…"
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <Link
          href="/events"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {submitting ? "Menyimpan…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
