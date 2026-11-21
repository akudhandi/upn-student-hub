"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EventForm, { type EventFormValues } from "@/components/admin/EventForm";
import {
  getAdminCategories,
  getAdminEvent,
  updateAdminEvent,
  uploadAdminMedia,
  type AdminEventItem,
  type CategoryItem,
  type EventStatus,
} from "@/lib/admin-api";
import { extractAdminError, isAbortError } from "@/lib/api";

function toFormValues(item: AdminEventItem): EventFormValues {
  return {
    title: item.title,
    category_id: item.category_id ? String(item.category_id) : "",
    organizer_name: item.organizer_name,
    event_date: item.event_date ? item.event_date.slice(0, 10) : "",
    event_time: item.event_time ?? "",
    location: item.location,
    registration_link: item.registration_link ?? "",
    status: (item.status as EventStatus) || "published",
    description: item.description ?? "",
    existingPosterPath: item.images?.[0]?.file_path ?? null,
    posterFile: null,
  };
}

export default function EventEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [initial, setInitial] = useState<EventFormValues | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getAdminEvent(id, { signal: controller.signal }),
      getAdminCategories({ type: "event" }, { signal: controller.signal }).catch(
        (err: unknown) => {
          if (controller.signal.aborted || isAbortError(err)) throw err;
          return null;
        },
      ),
    ]).then(
      ([detail, catRes]) => {
        if (controller.signal.aborted) return;
        setLoadError(null);
        setInitial(toFormValues(detail));
        if (catRes) setCategories(catRes.data);
      },
      (err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setLoadError("Gagal memuat detail event. Pastikan data tersedia.");
      },
    );
    return () => {
      controller.abort();
    };
  }, [id, retryKey]);

  async function handleSubmit(values: EventFormValues) {
    setSubmitting(true);
    setServerError(null);
    try {
      let imagePaths: string[] = values.existingPosterPath
        ? [values.existingPosterPath]
        : [];
      if (values.posterFile) {
        const uploaded = await uploadAdminMedia(values.posterFile, "events");
        imagePaths = [uploaded.path];
      }
      await updateAdminEvent(id, {
        title: values.title.trim(),
        category_id: values.category_id ? Number(values.category_id) : null,
        organizer_name: values.organizer_name.trim(),
        event_date: values.event_date,
        event_time: values.event_time.trim() || null,
        location: values.location.trim(),
        registration_link: values.registration_link.trim() || null,
        description: values.description.trim(),
        status: values.status,
        image_paths: imagePaths,
      });
      router.push("/events");
    } catch (err) {
      setServerError(
        extractAdminError(err, "Gagal menyimpan perubahan event. Coba lagi."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-4 sm:p-8">
      <section>
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-xs text-slate-400">
            <li>
              <Link href="/events" className="hover:text-slate-700 hover:underline">
                Event &amp; Informasi
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-semibold text-slate-600">Ubah Event</li>
          </ol>
        </nav>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Ubah Event &amp; Informasi
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Perbarui rincian kegiatan atau ubah status publikasinya.
        </p>
      </section>

      {loadError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-white px-5 py-12 shadow-sm">
          <p role="alert" className="text-sm font-medium text-rose-700">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => {
              setLoadError(null);
              setRetryKey((k) => k + 1);
            }}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            Coba lagi
          </button>
        </div>
      ) : !initial ? (
        <div
          aria-label="Memuat detail event"
          className="space-y-4 rounded-xl bg-white p-6 shadow-sm"
        >
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-36 animate-pulse rounded-lg bg-slate-100" />
        </div>
      ) : (
        <EventForm
          key={`${id}-${retryKey}`}
          initial={initial}
          categories={categories}
          submitLabel="Simpan Perubahan"
          submitting={submitting}
          serverError={serverError}
          onSubmit={handleSubmit}
        />
      )}
    </main>
  );
}
