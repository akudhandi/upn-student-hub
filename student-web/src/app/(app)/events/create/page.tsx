"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  apiFetch,
  fetchPublicCategories,
  uploadMedia,
  type ApiError,
} from "@/lib/api";
import { getUser, isOfficialAccount, USER_UPDATED_EVENT, type AuthUser } from "@/lib/auth";
import VerifiedBadge from "@/components/VerifiedBadge";

// ---------------------------------------------------------------------------
// API types — GET /api/v1/events is reused to resolve backend category ids
// for the design's "Kategori Kegiatan" pills.
// ---------------------------------------------------------------------------
type ApiEventCategory = { id: number; name: string; slug: string };

type ApiEventItem = {
  id: number;
  category?: ApiEventCategory | null;
};

type EventListResponse = {
  message: string;
  data: { data: ApiEventItem[] };
};

type EventCreateResponse = {
  message: string;
  data: { id: number };
};

type SpeakerRole = "narasumber" | "moderator";

type SpeakerForm = {
  localId: number;
  role: SpeakerRole;
  name: string;
  organization: string;
  topic: string;
};

type PicForm = { localId: number; name: string; whatsapp: string };

const DEFAULT_BENEFITS = [
  "E-Sertifikat Resmi UPN",
  "SKPI (Poin Kemahasiswaan)",
  "Konsumsi & Snack",
  "Modul & Materi Pembicara",
  "Grup Diskusi & Jejaring",
];

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002147]/15";

const labelClass = "text-[12px] font-semibold text-slate-900";

function SectionCard({
  step,
  title,
  hint,
  children,
}: {
  step: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[14px] font-bold text-slate-900">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
            {step}
          </span>
          {title}
        </h2>
        {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function EventCreatePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [title, setTitle] = useState("");
  const [organizer, setOrganizer] = useState("");

  useEffect(() => {
    const sync = () => {
      const u = getUser();
      setCurrentUser(u);
      if (u && isOfficialAccount(u)) {
        const officialName =
          (u.profile && typeof u.profile === "object" && "name" in u.profile
            ? (u.profile as { name?: string }).name
            : null) || u.name;
        if (officialName) {
          setOrganizer((prev) => prev || officialName);
        }
      }
    };
    sync();
    window.addEventListener(USER_UPDATED_EVENT, sync);
    return () => window.removeEventListener(USER_UPDATED_EVENT, sync);
  }, []);

  const canSubmitEvent = isOfficialAccount(currentUser);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [categoryOptions, setCategoryOptions] = useState<{ id: number; name: string }[]>([]);
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("08:30");
  const [location, setLocation] = useState("");
  const [registrationLink, setRegistrationLink] = useState("");
  const [speakers, setSpeakers] = useState<SpeakerForm[]>([]);
  const [benefits, setBenefits] = useState<string[]>([...DEFAULT_BENEFITS]);
  const [benefitInput, setBenefitInput] = useState("");
  const [description, setDescription] = useState("");
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [pics, setPics] = useState<PicForm[]>([{ localId: 1, name: "", whatsapp: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const localIdRef = useRef(2);

  // Fetch active event categories dynamically from backend.
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const cats = await fetchPublicCategories("event", controller.signal);
        if (controller.signal.aborted) return;
        if (cats.length > 0) {
          setCategoryOptions(cats.map((c) => ({ id: c.id, name: c.name })));
          return;
        }
        const res = await apiFetch<EventListResponse>("/v1/events", {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const byId = new Map<number, string>();
        for (const item of res.data.data) {
          if (item.category?.id && item.category?.name) byId.set(item.category.id, item.category.name);
        }
        setCategoryOptions([...byId.entries()].map(([id, name]) => ({ id, name })));
      } catch {
        if (!controller.signal.aborted) setCategoryOptions([]);
      }
    })();
    return () => controller.abort();
  }, []);

  function nextLocalId(): number {
    localIdRef.current += 1;
    return localIdRef.current;
  }

  function addSpeaker() {
    setSpeakers((prev) => [
      ...prev,
      { localId: nextLocalId(), role: "narasumber", name: "", organization: "", topic: "" },
    ]);
  }

  function updateSpeaker(id: number, patch: Partial<SpeakerForm>) {
    setSpeakers((prev) => prev.map((s) => (s.localId === id ? { ...s, ...patch } : s)));
  }

  function removeSpeaker(id: number) {
    setSpeakers((prev) => prev.filter((s) => s.localId !== id));
  }

  function removeBenefit(value: string) {
    setBenefits((prev) => prev.filter((b) => b !== value));
  }

  function addBenefit() {
    const value = benefitInput.trim();
    if (!value) return;
    setBenefits((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setBenefitInput("");
  }

  function setPoster(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (posterUrl) URL.revokeObjectURL(posterUrl);
    setPosterFile(files[0]);
    setPosterUrl(URL.createObjectURL(files[0]));
  }

  function addPic() {
    setPics((prev) => [...prev, { localId: nextLocalId(), name: "", whatsapp: "" }]);
  }

  function updatePic(id: number, patch: Partial<PicForm>) {
    setPics((prev) => prev.map((p) => (p.localId === id ? { ...p, ...patch } : p)));
  }

  const revokeAllPreviews = useCallback(() => {
    if (posterUrl) URL.revokeObjectURL(posterUrl);
    setPosterUrl(null);
    setPosterFile(null);
  }, [posterUrl]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const categoryId = selectedCategoryId ? Number(selectedCategoryId) : null;
      const uploadedPoster = posterFile
        ? await uploadMedia(posterFile, "events")
        : null;
      const res = await apiFetch<EventCreateResponse>("/v1/events", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          category_id: categoryId,
          organizer_name: organizer.trim(),
          event_date: eventDate,
          event_time: eventTime.trim() === "" ? null : eventTime.trim(),
          location: location.trim(),
          registration_link:
            registrationLink.trim() === "" ? null : registrationLink.trim(),
          description: description.trim(),
          image_paths: uploadedPoster ? [uploadedPoster.path] : [],
          speakers: speakers
            .filter((s) => s.name.trim() !== "")
            .map((s) => ({
              name: s.name.trim(),
              role: s.role,
              organization: s.organization.trim() === "" ? null : s.organization.trim(),
              topic: s.topic.trim() === "" ? null : s.topic.trim(),
            })),
          benefits,
          contact_pics: pics
            .filter((p) => p.name.trim() !== "" || p.whatsapp.trim() !== "")
            .map((p) => ({
              name: p.name.trim(),
              whatsapp: p.whatsapp.trim() === "" ? null : p.whatsapp.trim(),
            })),
        }),
      });
      revokeAllPreviews();
      router.push(`/events/${res.data.id}`);
    } catch (err) {
      const apiError = err as ApiError;
      const fieldErrors = apiError.errors
        ? Object.values(apiError.errors).flat().join(" ")
        : null;
      setSubmitError(fieldErrors || apiError.message || "Gagal mengajukan event. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!canSubmitEvent) {
    return (
      <div className="mx-auto max-w-[720px] py-8">
        <div className="rounded-[24px] border border-[#E7E2DD] bg-white p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4F1EE]">
            <VerifiedBadge size="sm" />
          </div>
          <h1 className="mt-4 font-display text-xl font-semibold tracking-tight text-[#141416]">
            Pengajuan Event Khusus Akun Resmi
          </h1>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#6E6A66]">
            Fitur pengajuan event kampus hanya tersedia bagi akun resmi{" "}
            <strong className="font-semibold text-[#141416]">HIMA</strong>,{" "}
            <strong className="font-semibold text-[#141416]">Ormawa</strong>, atau{" "}
            <strong className="font-semibold text-[#141416]">Fakultas</strong> yang
            telah disiapkan oleh Admin UPN Student Hub.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2.5">
            <Link
              href="/events"
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#141416] px-5 text-xs font-medium text-white transition-colors hover:bg-[#242428]"
            >
              ← Kembali ke Daftar Event
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <li><Link href="/dashboard" className="hover:text-slate-800 hover:underline">Beranda</Link></li>
          <li aria-hidden="true" className="text-slate-300">/</li>
          <li>Event &amp; Informasi</li>
          <li aria-hidden="true" className="text-slate-300">/</li>
          <li><span aria-current="page" className="font-medium text-slate-700">Form Pengajuan</span></li>
        </ol>
      </nav>

      <h1 className="mt-2 text-[22px] font-bold tracking-tight text-slate-900">
        Pengajuan Event &amp; Info Kampus
      </h1>
      <p className="mt-1 text-[13px] text-slate-500">
        Informasi akan dikurasi oleh admin BAAK / Kemahasiswaan sebelum dipublikasikan.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        {/* 1. Informasi Acara */}
        <SectionCard step="1" title="Informasi Acara">
          <fieldset>
            <legend className={labelClass}>
              Kategori Kegiatan
            </legend>
            <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup" aria-label="Kategori kegiatan">
              <label
                className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-center text-[12px] transition-colors ${
                  selectedCategoryId === ""
                    ? "border-[#0A2342] bg-[#0A2342] font-semibold text-white"
                    : "border-slate-200 bg-[#F1F3F5] text-slate-500 hover:bg-slate-100"
                }`}
              >
                <input
                  type="radio"
                  name="event-activity"
                  value=""
                  checked={selectedCategoryId === ""}
                  onChange={() => setSelectedCategoryId("")}
                  className="sr-only"
                />
                Umum / Pengumuman
              </label>
              {categoryOptions.map((cat) => {
                const value = String(cat.id);
                const checked = selectedCategoryId === value;
                return (
                  <label
                    key={cat.id}
                    className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-center text-[12px] transition-colors ${
                      checked
                        ? "border-[#0A2342] bg-[#0A2342] font-semibold text-white"
                        : "border-slate-200 bg-[#F1F3F5] text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="event-activity"
                      value={value}
                      checked={checked}
                      onChange={() => setSelectedCategoryId(value)}
                      className="sr-only"
                    />
                    {cat.name}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="mt-4">
            <label htmlFor="event-title" className={labelClass}>
              Judul Event / Informasi <span className="text-red-500">*</span>
            </label>
            <input
              id="event-title"
              type="text"
              required
              maxLength={255}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Seminar Nasional Riset & Inovasi Teknologi 2025"
              className={inputClass}
            />
          </div>
          <div className="mt-4">
            <label htmlFor="event-organizer" className={labelClass}>
              Penyelenggara <span className="text-red-500">*</span>
            </label>
            <input
              id="event-organizer"
              type="text"
              required
              maxLength={255}
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              placeholder="BEM FTI UPN 'Veteran'"
              className={inputClass}
            />
          </div>
        </SectionCard>

        {/* 2. Waktu & Tempat */}
        <SectionCard step="2" title="Waktu & Tempat">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="event-date" className={labelClass}>
                Tanggal Pelaksanaan <span className="text-red-500">*</span>
              </label>
              <input
                id="event-date"
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="event-time" className={labelClass}>
                Waktu <span className="text-red-500">*</span>
              </label>
              <input
                id="event-time"
                type="time"
                required
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="event-location" className={labelClass}>
              Lokasi / Format <span className="text-red-500">*</span>
            </label>
            <input
              id="event-location"
              type="text"
              required
              maxLength={255}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Auditorium Giri Santika"
              className={inputClass}
            />
          </div>
          <div className="mt-4">
            <label htmlFor="event-registration-link" className={labelClass}>
              Tautan Pendaftaran <span className="font-normal text-slate-400">(Opsional)</span>
            </label>
            <input
              id="event-registration-link"
              type="url"
              maxLength={2048}
              value={registrationLink}
              onChange={(e) => setRegistrationLink(e.target.value)}
              placeholder="https://forms.gle/..."
              className={inputClass}
            />
          </div>
        </SectionCard>

        {/* 3. Pembicara & Moderator */}
        <SectionCard step="3" title="Pembicara & Moderator" hint="Opsional">
          <div className="space-y-3">
            {speakers.map((speaker, index) => (
              <div key={speaker.localId} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2" role="radiogroup" aria-label={`Peran pembicara ${index + 1}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Profil {index + 1}
                    </span>
                    {(
                      [
                        { value: "narasumber", label: "Narasumber" },
                        { value: "moderator", label: "Moderator" },
                      ] as const
                    ).map((role) => (
                      <label
                        key={role.value}
                        className={`cursor-pointer rounded-md px-2 py-1 text-[11px] font-semibold ${
                          speaker.role === role.value
                            ? "bg-[#0A2342] text-white"
                            : "bg-slate-200/70 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`speaker-role-${speaker.localId}`}
                          checked={speaker.role === role.value}
                          onChange={() => updateSpeaker(speaker.localId, { role: role.value })}
                          className="sr-only"
                        />
                        {role.label}
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSpeaker(speaker.localId)}
                    aria-label={`Hapus pembicara ${index + 1}`}
                    className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                  >
                    🗑
                  </button>
                </div>
                <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <label className="text-[11px] font-semibold text-slate-700">
                    Nama Lengkap &amp; Gelar <span className="text-red-500">*</span>
                    <input
                      type="text"
                      required
                      value={speaker.name}
                      onChange={(e) => updateSpeaker(speaker.localId, { name: e.target.value })}
                      placeholder="Dr. Pratama Wicaksono, S.T., M.T."
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:outline-none"
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-700">
                    Instansi / Jabatan Profesional
                    <input
                      type="text"
                      value={speaker.organization}
                      onChange={(e) => updateSpeaker(speaker.localId, { organization: e.target.value })}
                      placeholder="AI Researcher BRIN"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:outline-none"
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-700 sm:col-span-2">
                    Deskripsi Singkat / Topik Materi
                    <input
                      type="text"
                      value={speaker.topic}
                      onChange={(e) => updateSpeaker(speaker.localId, { topic: e.target.value })}
                      placeholder="Pakar Rekayasa Kecerdasan Buatan & Transformasi Digital"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:outline-none"
                    />
                  </label>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addSpeaker}
              className="w-full rounded-lg border-2 border-dashed border-slate-300 px-3 py-2.5 text-[12px] font-semibold text-slate-500 hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]"
            >
              + Tambah Pembicara / Moderator
            </button>
          </div>
        </SectionCard>

        {/* 4. Benefit & Fasilitas */}
        <SectionCard step="4" title="Benefit & Fasilitas Peserta">
          <p className="text-[12px] font-semibold text-slate-900">Benefit Terpilih untuk Acara Ini</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5" aria-live="polite">
            {benefits.length === 0 && (
              <span className="text-[11px] text-slate-400">Belum ada benefit. Tambahkan lewat kolom di bawah.</span>
            )}
            {benefits.map((benefit) => (
              <span key={benefit} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-[#F1F3F5] px-2.5 py-1 text-[11px] font-medium text-slate-700">
                {benefit}
                <button
                  type="button"
                  onClick={() => removeBenefit(benefit)}
                  aria-label={`Hapus benefit ${benefit}`}
                  className="rounded px-0.5 text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={benefitInput}
              onChange={(e) => setBenefitInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addBenefit();
                }
              }}
              placeholder="Ketik benefit lain (misal: Merchandise Eksklusif, Voucher Diskon…)"
              aria-label="Tambah benefit kustom"
              className="flex-1 rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002147]/15"
            />
            <button
              type="button"
              onClick={addBenefit}
              className="shrink-0 rounded-lg bg-slate-200/70 px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]"
            >
              + Tambah
            </button>
          </div>
        </SectionCard>

        {/* 5. Deskripsi & Lampiran */}
        <SectionCard step="5" title="Deskripsi & Lampiran">
          <div>
            <label htmlFor="event-description" className={labelClass}>
              Deskripsi Singkat <span className="text-red-500">*</span>
            </label>
            <textarea
              id="event-description"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Latar belakang, tujuan, dan gambaran acara…"
              className={`${inputClass} leading-5`}
            />
          </div>
          <div className="mt-4">
            <span id="event-poster-label" className="text-[12px] font-semibold text-slate-900">
              Unggah Poster Acara <span className="font-normal text-slate-400">(Opsional)</span>
            </span>
            <label className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-[#F1F3F5] px-3 py-6 text-slate-500 hover:border-slate-400 hover:bg-slate-100 focus-within:outline-none focus-within:ring-2 focus-within:ring-[#002147]">
              {posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL preview only
                <img src={posterUrl} alt="Pratinjau poster acara" className="max-h-48 rounded-lg border border-slate-200 object-contain" />
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M8 10.5V2.5M8 2.5L5 5.5M8 2.5L11 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2.5 10.5V12.5C2.5 13.3 3.2 14 4 14H12C12.8 14 13.5 13.3 13.5 12.5V10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  <span className="text-[12px] font-semibold">Unggah Poster Acara (PNG/JPG/WebP, maks 5MB)</span>
                  <span className="text-[10px] text-slate-400">Klik untuk memilih berkas</span>
                </>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-labelledby="event-poster-label"
                className="sr-only"
                onChange={(e) => {
                  setPoster(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </SectionCard>

        {/* 6. Narahubung */}
        <SectionCard step="6" title="Narahubung (PIC)">
          <div className="space-y-3">
            {pics.map((pic, index) => (
              <div key={pic.localId} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  PIC {index === 0 ? "(Utama)" : `(${index + 1})`} · Kontak Primer
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <label className="text-[11px] font-semibold text-slate-700">
                    Nama PIC <span className="text-red-500">*</span>
                    <input
                      type="text"
                      required
                      value={pic.name}
                      onChange={(e) => updatePic(pic.localId, { name: e.target.value })}
                      placeholder="Rifki Pratama"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:outline-none"
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-700">
                    No. WhatsApp Aktif <span className="text-red-500">*</span>
                    <input
                      type="tel"
                      required
                      inputMode="numeric"
                      maxLength={15}
                      value={pic.whatsapp}
                      onChange={(e) => updatePic(pic.localId, { whatsapp: e.target.value.replace(/\D/g, "") })}
                      placeholder="081398765432"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:outline-none"
                    />
                  </label>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addPic}
              className="w-full rounded-lg border-2 border-dashed border-slate-300 px-3 py-2.5 text-[12px] font-semibold text-slate-500 hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]"
            >
              + Tambah Narahubung Baru
            </button>
          </div>
        </SectionCard>

        {submitError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {submitError}
          </p>
        )}

        {/* Footer action bar */}
        <div className="flex flex-col items-stretch justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="text-emerald-600" aria-hidden="true">✓</span>
            Kurasi admin memakan waktu 1×24 jam kerja.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="rounded-lg bg-slate-100 px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[#0A2342] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#12325e] disabled:opacity-60"
            >
              {isSubmitting ? "Mengajukan…" : "▷ Ajukan ke Admin"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
