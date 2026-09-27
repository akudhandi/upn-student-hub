"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type EventCategory = { id: number; name: string };

export type EventFormValues = {
  title: string;
  category_id: string;
  organizer_name: string;
  event_date: string;
  event_time: string;
  location: string;
  registration_link: string;
  description: string;
  status: string;
};

export const EMPTY_EVENT_FORM: EventFormValues = {
  title: "",
  category_id: "",
  organizer_name: "",
  event_date: "",
  event_time: "",
  location: "",
  registration_link: "",
  description: "",
  status: "draft",
};

export function EventForm({
  initial,
  categories,
  submitLabel,
  isSubmitting,
  serverError,
  onSubmit,
}: {
  initial: EventFormValues;
  categories: EventCategory[];
  submitLabel: string;
  isSubmitting: boolean;
  serverError: string | null;
  onSubmit: (values: EventFormValues) => void;
}) {
  const [values, setValues] = useState<EventFormValues>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof EventFormValues, string>>>({});

  function set<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Partial<Record<keyof EventFormValues, string>> = {};
    if (!values.title.trim()) next.title = "Judul wajib diisi.";
    if (!values.organizer_name.trim()) next.organizer_name = "Penyelenggara wajib diisi.";
    if (!values.event_date) next.event_date = "Tanggal wajib diisi.";
    if (!values.location.trim()) next.location = "Lokasi wajib diisi.";
    if (!values.description.trim()) next.description = "Deskripsi wajib diisi.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSubmit(values);
  }

  const inputClass =
    "mt-1.5 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900";

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      {serverError && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="event-title">Judul event / informasi</Label>
          <Input id="event-title" value={values.title} onChange={(e) => set("title", e.target.value)} placeholder="Contoh: Seminar Karier…" className="mt-1.5" />
          {errors.title && <p role="alert" className="mt-1 text-xs text-red-600">{errors.title}</p>}
        </div>

        <div>
          <Label htmlFor="event-category">Kategori</Label>
          <select
            id="event-category"
            value={values.category_id}
            onChange={(e) => set("category_id", e.target.value)}
            className={inputClass}
          >
            <option value="">Tanpa kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="event-status">Status publikasi</Label>
          <select id="event-status" value={values.status} onChange={(e) => set("status", e.target.value)} className={inputClass}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div>
          <Label htmlFor="event-organizer">Penyelenggara</Label>
          <Input id="event-organizer" value={values.organizer_name} onChange={(e) => set("organizer_name", e.target.value)} placeholder="BEM / HIMA / UKM…" className="mt-1.5" />
          {errors.organizer_name && <p role="alert" className="mt-1 text-xs text-red-600">{errors.organizer_name}</p>}
        </div>

        <div>
          <Label htmlFor="event-location">Lokasi</Label>
          <Input id="event-location" value={values.location} onChange={(e) => set("location", e.target.value)} placeholder="Gedung / online…" className="mt-1.5" />
          {errors.location && <p role="alert" className="mt-1 text-xs text-red-600">{errors.location}</p>}
        </div>

        <div>
          <Label htmlFor="event-date">Tanggal pelaksanaan</Label>
          <Input id="event-date" type="date" value={values.event_date} onChange={(e) => set("event_date", e.target.value)} className="mt-1.5" />
          {errors.event_date && <p role="alert" className="mt-1 text-xs text-red-600">{errors.event_date}</p>}
        </div>

        <div>
          <Label htmlFor="event-time">Waktu (opsional)</Label>
          <Input id="event-time" value={values.event_time} onChange={(e) => set("event_time", e.target.value)} placeholder="09.00 – 12.00 WIB" className="mt-1.5" />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="event-link">Link pendaftaran (opsional)</Label>
          <Input id="event-link" type="url" value={values.registration_link} onChange={(e) => set("registration_link", e.target.value)} placeholder="https://…" className="mt-1.5" />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="event-description">Deskripsi</Label>
          <textarea
            id="event-description"
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            rows={6}
            className="mt-1.5 flex min-h-[140px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            placeholder="Detail kegiatan, syarat peserta, benefit…"
          />
          {errors.description && <p role="alert" className="mt-1 text-xs text-red-600">{errors.description}</p>}
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
