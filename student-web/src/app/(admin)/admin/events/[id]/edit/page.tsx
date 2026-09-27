"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { EMPTY_EVENT_FORM, EventForm, type EventCategory, type EventFormValues } from "../../EventForm";

type CategoryResponse = { message: string; data: { data: EventCategory[] } };

type EventDetail = {
  id: number;
  title: string;
  category_id?: number | null;
  organizer_name: string;
  event_date: string;
  event_time?: string | null;
  location: string;
  registration_link?: string | null;
  description: string | null;
  status: string;
};

type DetailResponse = { message: string; data: EventDetail };

function toFormValues(detail: EventDetail): EventFormValues {
  return {
    title: detail.title,
    category_id: detail.category_id ? String(detail.category_id) : "",
    organizer_name: detail.organizer_name,
    event_date: detail.event_date.slice(0, 10),
    event_time: detail.event_time ?? "",
    location: detail.location,
    registration_link: detail.registration_link ?? "",
    description: detail.description ?? "",
    status: detail.status,
  };
}

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

export default function AdminEventEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [initial, setInitial] = useState<EventFormValues | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const loadDetail = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const [detailRes, catRes] = await Promise.all([
          apiFetch<DetailResponse>(`/v1/admin/events/${id}`),
          apiFetch<CategoryResponse>("/v1/admin/categories?type=event").catch(() => null),
        ]);
        if (signal?.aborted) return;
        setInitial(toFormValues(detailRes.data));
        if (catRes) setCategories(catRes.data.data);
      } catch {
        if (signal?.aborted) return;
        setLoadError("Gagal memuat detail event.");
      } finally {
        if (signal?.aborted) return;
        setIsLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch must populate state on mount
    void loadDetail(controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadDetail]);

  async function handleSubmit(values: EventFormValues) {
    try {
      setIsSubmitting(true);
      setServerError(null);
      await apiFetch(`/v1/admin/events/${id}`, { method: "PUT", body: JSON.stringify(toPayload(values)) });
      router.push("/admin/events");
    } catch {
      setServerError("Gagal menyimpan perubahan. Periksa isian lalu coba lagi.");
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
          <li><span aria-current="page" className="font-medium text-slate-700">Ubah Event</span></li>
        </ol>
      </nav>
      <h1 className="mt-2 text-[22px] font-bold tracking-tight text-slate-900 sm:text-[26px]">Ubah Event</h1>
      <p className="mt-1 max-w-[600px] text-sm text-slate-500">Perbarui informasi kegiatan kampus.</p>

      <div className="mt-4 max-w-[760px]">
        {isLoading ? (
          <div role="status" aria-busy="true" aria-label="Memuat detail event" className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="h-5 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="mt-3 h-9 w-full animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-32 w-full animate-pulse rounded bg-slate-100" />
            <span className="sr-only">Memuat…</span>
          </div>
        ) : loadError || !initial ? (
          <div role="alert" className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-900">Gagal memuat event</p>
            <p className="mt-1 text-xs text-slate-500">{loadError}</p>
          </div>
        ) : (
          <EventForm
            key={id}
            initial={initial ?? EMPTY_EVENT_FORM}
            categories={categories}
            submitLabel="Simpan perubahan"
            isSubmitting={isSubmitting}
            serverError={serverError}
            onSubmit={(v) => void handleSubmit(v)}
          />
        )}
      </div>
    </div>
  );
}
