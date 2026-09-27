"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { EMPTY_EVENT_FORM, EventForm, type EventCategory, type EventFormValues } from "../EventForm";

type CategoryResponse = { message: string; data: { data: EventCategory[] } };

function toPayload(values: EventFormValues) {
  return {
    title: values.title.trim(),
    category_id: values.category_id ? Number(values.category_id) : null,
    organizer_name: values.organizer_name.trim(),
    event_date: values.event_date,
    event_time: values.event_time.trim() || null,
    location: values.location.trim(),
    registration_link: values.registration_link.trim() || null,
    description: values.description.trim(),
    status: values.status,
  };
}

export default function AdminEventCreatePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<CategoryResponse>("/v1/admin/categories?type=event")
      .then((res) => {
        if (!controller.signal.aborted) setCategories(res.data.data);
      })
      .catch(() => {});
    return () => {
      controller.abort();
    };
  }, []);

  async function handleSubmit(values: EventFormValues) {
    try {
      setIsSubmitting(true);
      setServerError(null);
      await apiFetch("/v1/admin/events", { method: "POST", body: JSON.stringify(toPayload(values)) });
      router.push("/admin/events");
    } catch {
      setServerError("Gagal membuat event. Periksa isian lalu coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <li><Link href="/admin/events" className="hover:text-slate-800 hover:underline">Event & Informasi</Link></li>
          <li aria-hidden="true" className="text-slate-300">/</li>
          <li><span aria-current="page" className="font-medium text-slate-700">Buat Event</span></li>
        </ol>
      </nav>
      <h1 className="mt-2 text-[22px] font-bold tracking-tight text-slate-900 sm:text-[26px]">Buat Event</h1>
      <p className="mt-1 max-w-[600px] text-sm text-slate-500">Terbitkan pengumuman atau kegiatan kampus baru.</p>
      <div className="mt-4 max-w-[760px]">
        <EventForm
          initial={EMPTY_EVENT_FORM}
          categories={categories}
          submitLabel="Buat event"
          isSubmitting={isSubmitting}
          serverError={serverError}
          onSubmit={(v) => void handleSubmit(v)}
        />
      </div>
    </div>
  );
}
