"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EventForm, {
  EMPTY_EVENT_FORM,
  type EventFormValues,
} from "@/components/admin/EventForm";
import {
  createAdminEvent,
  getAdminCategories,
  uploadAdminMedia,
  type CategoryItem,
} from "@/lib/admin-api";
import { extractAdminError, isAbortError } from "@/lib/api";

export default function EventCreatePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getAdminCategories({ type: "event" }, { signal: controller.signal }).then(
      (res) => {
        if (!controller.signal.aborted) setCategories(res.data);
      },
      (err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
      },
    );
    return () => {
      controller.abort();
    };
  }, []);

  async function handleSubmit(values: EventFormValues) {
    setSubmitting(true);
    setServerError(null);
    try {
      let imagePaths: string[] | undefined;
      if (values.posterFile) {
        const uploaded = await uploadAdminMedia(values.posterFile, "events");
        imagePaths = [uploaded.path];
      }
      await createAdminEvent({
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
        extractAdminError(
          err,
          "Gagal membuat event. Periksa isian lalu coba lagi.",
        ),
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
            <li className="font-semibold text-slate-600">Buat Event</li>
          </ol>
        </nav>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Buat Event &amp; Informasi
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Tambahkan kegiatan, pengumuman, atau informasi resmi baru untuk mahasiswa UPN.
        </p>
      </section>

      <EventForm
        initial={EMPTY_EVENT_FORM}
        categories={categories}
        submitLabel="Simpan Event"
        submitting={submitting}
        serverError={serverError}
        onSubmit={handleSubmit}
      />
    </main>
  );
}
