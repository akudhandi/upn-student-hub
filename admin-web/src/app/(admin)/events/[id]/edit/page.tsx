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
    existingImagePaths: (item.images ?? [])
      .map((img) => img.file_path)
      .filter((path): path is string => Boolean(path)),
    newPosterFiles: [],
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
      const uploadedPaths = await Promise.all(
        values.newPosterFiles.map(async (file) => {
          const uploaded = await uploadAdminMedia(file, "events");
          return uploaded.path;
        }),
      );
      const imagePaths = [...values.existingImagePaths, ...uploadedPaths].slice(
        0,
        3,
      );
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
          <ol className="flex items-center gap-1.5 text-xs text-[#787470]">
            <li>
              <Link href="/events" className="transition-colors hover:text-[#141416] hover:underline">
                Event &amp; Informasi
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-semibold text-[#141416]">Ubah Event</li>
          </ol>
        </nav>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[#141416] sm:text-3xl">
          Ubah Event &amp; Informasi
        </h2>
        <p className="mt-1 text-sm text-[#6E6A66]">
          Perbarui rincian kegiatan atau ubah status publikasinya.
        </p>
      </section>

      {loadError ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#E5E0DA] bg-white px-5 py-12">
          <p role="alert" className="text-sm font-medium text-[#A62D2D]">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => {
              setLoadError(null);
              setRetryKey((k) => k + 1);
            }}
            className="rounded-full bg-[#141416] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#242428]"
          >
            Coba lagi
          </button>
        </div>
      ) : !initial ? (
        <div
          aria-label="Memuat detail event"
          className="space-y-4 rounded-2xl border border-[#E5E0DA] bg-white p-6"
        >
          <div className="h-10 animate-pulse rounded-xl bg-[#EFECE8]" />
          <div className="h-10 animate-pulse rounded-xl bg-[#EFECE8]" />
          <div className="h-36 animate-pulse rounded-xl bg-[#EFECE8]" />
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
