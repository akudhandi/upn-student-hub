"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, type ApiError } from "@/lib/api";

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
  photoUrl: string | null;
};

type DocForm = { localId: number; name: string; meta: string };

type PicForm = { localId: number; name: string; whatsapp: string };

const ACTIVITY_TYPES = [
  { value: "seminar", label: "Event / Seminar", match: "Seminar" },
  { value: "pengumuman", label: "Pengumuman", match: null },
  { value: "akademik", label: "Akademik", match: "Akademik" },
  { value: "organisasi", label: "Organisasi", match: "UKM" },
] as const;

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
  const [title, setTitle] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [activityType, setActivityType] = useState<string>("seminar");
  const [categoryOptions, setCategoryOptions] = useState<{ id: number; name: string }[]>([]);
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("08.30 WIB");
  const [location, setLocation] = useState("");
  const [speakers, setSpeakers] = useState<SpeakerForm[]>([]);
  const [benefits, setBenefits] = useState<string[]>([...DEFAULT_BENEFITS]);
  const [benefitInput, setBenefitInput] = useState("");
  const [description, setDescription] = useState("");
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocForm[]>([]);
  const [pics, setPics] = useState<PicForm[]>([{ localId: 1, name: "", whatsapp: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const localIdRef = useRef(2);
  const photoIdRef = useRef(0);

  // Resolve backend category ids once for the pill mapping.
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await apiFetch<EventListResponse>("/v1/events");
        if (controller.signal.aborted) return;
        const byId = new Map<number, string>();
        for (const item of res.data.data) {
          if (item.category?.id && item.category?.name) byId.set(item.category.id, item.category.name);
        }
        // Category lookup populates once on mount.
        setCategoryOptions([...byId.entries()].map(([id, name]) => ({ id, name })));
      } catch {
        if (!controller.signal.aborted) setCategoryOptions([]);
      }
    })();
    return () => controller.abort();
  }, []);

  const categoryByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of categoryOptions) {
      if (!map.has(c.name.toLowerCase())) map.set(c.name.toLowerCase(), c.id);
    }
    return map;
  }, [categoryOptions]);

  function nextLocalId(): number {
    localIdRef.current += 1;
    return localIdRef.current;
  }

  function addSpeaker() {
    setSpeakers((prev) => [
      ...prev,
      { localId: nextLocalId(), role: "narasumber", name: "", organization: "", topic: "", photoUrl: null },
    ]);
  }

  function updateSpeaker(id: number, patch: Partial<SpeakerForm>) {
    setSpeakers((prev) => prev.map((s) => (s.localId === id ? { ...s, ...patch } : s)));
  }

  function removeSpeaker(id: number) {
    setSpeakers((prev) => {
      const target = prev.find((s) => s.localId === id);
      if (target?.photoUrl) URL.revokeObjectURL(target.photoUrl);
      return prev.filter((s) => s.localId !== id);
    });
  }

  function setSpeakerPhoto(id: number, files: FileList | null) {
    if (!files || files.length === 0) return;
    photoIdRef.current += 1;
    const url = URL.createObjectURL(files[0]);
    setSpeakers((prev) =>
      prev.map((s) => {
        if (s.localId !== id) return s;
        if (s.photoUrl) URL.revokeObjectURL(s.photoUrl);
        return { ...s, photoUrl: url };
      })
    );
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
    setPosterUrl(URL.createObjectURL(files[0]));
  }

  function addDoc() {
    setDocs((prev) => [...prev, { localId: nextLocalId(), name: "", meta: "" }]);
  }

  function updateDoc(id: number, patch: Partial<DocForm>) {
    setDocs((prev) => prev.map((d) => (d.localId === id ? { ...d, ...patch } : d)));
  }

  function removeDoc(id: number) {
    setDocs((prev) => prev.filter((d) => d.localId !== id));
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
    setSpeakers((prev) => {
      prev.forEach((s) => {
        if (s.photoUrl) URL.revokeObjectURL(s.photoUrl);
      });
      return prev.map((s) => ({ ...s, photoUrl: null }));
    });
  }, [posterUrl]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const match = ACTIVITY_TYPES.find((t) => t.value === activityType)?.match ?? null;
      const categoryId = match ? (categoryByName.get(match.toLowerCase()) ?? null) : null;
      const res = await apiFetch<EventCreateResponse>("/v1/events", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          category_id: categoryId,
          organizer_name: organizer.trim(),
          event_date: eventDate,
          event_time: eventTime.trim() === "" ? null : eventTime.trim(),
          location: location.trim(),
          description: description.trim(),
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
          documents: docs
            .filter((d) => d.name.trim() !== "")
            .map((d) => ({
              name: d.name.trim(),
              meta: d.meta.trim() === "" ? null : d.meta.trim(),
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
              Kategori Kegiatan <span className="text-red-500">*</span>
            </legend>
            <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Kategori kegiatan">
              {ACTIVITY_TYPES.map((opt) => {
                const checked = activityType === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-center text-[12px] transition-colors ${
                      checked
                        ? "border-[#0A2342] bg-[#0A2342] font-semibold text-white"
                        : "border-slate-200 bg-[#F1F3F5] text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="event-activity"
                      value={opt.value}
                      checked={checked}
                      onChange={() => setActivityType(opt.value)}
                      required
                      className="sr-only"
                    />
                    {opt.label}
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
                type="text"
                required
                maxLength={50}
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                placeholder="08.30 WIB"
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
                <div className="mt-2.5 flex flex-col gap-3 sm:flex-row">
                  <label className="flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-white text-slate-500 hover:border-slate-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-[#002147]">
                    {speaker.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- local object URL preview only
                      <img src={speaker.photoUrl} alt={`Foto pembicara ${index + 1}`} className="h-full w-full object-cover" />
                    ) : (
                      <>
                        <span className="text-[10px] font-medium">Pilih Foto</span>
                        <span className="text-[9px] text-slate-400">Maks 2MB</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      aria-label={`Foto pembicara ${index + 1}`}
                      className="sr-only"
                      onChange={(e) => {
                        setSpeakerPhoto(speaker.localId, e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2">
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
              Unggah Poster Acara <span className="text-red-500">*</span>
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
                  <span className="text-[12px] font-semibold">Unggah Poster Acara (PNG/JPG, maks 5MB)</span>
                  <span className="text-[10px] text-slate-400">Klik untuk memilih berkas atau seret ke area ini</span>
                </>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg"
                aria-labelledby="event-poster-label"
                className="sr-only"
                onChange={(e) => {
                  setPoster(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[12px] font-semibold text-slate-900">
                Lampiran File Informasi Event Terkait <span className="font-normal text-slate-400">(Opsional)</span>
              </span>
              <span className="text-[10px] text-slate-400">Maks. 5 Berkas (PDF, DOCX, maks. 5MB)</span>
            </div>
            <div className="mt-1.5 space-y-2">
              {docs.map((doc) => (
                <div key={doc.localId} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-[#F1F3F5] px-3 py-2">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-slate-400">
                    <path d="M4 1.5H10L13 4.5V14.5H4V1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                    <path d="M10 1.5V4.5H13" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                  <input
                    type="text"
                    value={doc.name}
                    onChange={(e) => updateDoc(doc.localId, { name: e.target.value })}
                    placeholder="TOR_Kegiatan_Seminar2025.pdf"
                    aria-label="Nama berkas lampiran"
                    className="w-full bg-transparent text-[12px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={doc.meta}
                    onChange={(e) => updateDoc(doc.localId, { meta: e.target.value })}
                    placeholder="1.8 MB"
                    aria-label="Ukuran berkas lampiran"
                    className="w-20 shrink-0 bg-transparent text-right text-[11px] text-slate-500 placeholder:text-slate-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeDoc(doc.localId)}
                    aria-label={`Hapus lampiran ${doc.name || "baru"}`}
                    className="shrink-0 rounded px-1 text-slate-400 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                  >
                    🗑
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addDoc}
                className="w-full rounded-lg border-2 border-dashed border-slate-300 px-3 py-2.5 text-[12px] font-semibold text-slate-500 hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]"
              >
                + Tambah Berkas / File Lampiran
              </button>
            </div>
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
                      value={pic.whatsapp}
                      onChange={(e) => updatePic(pic.localId, { whatsapp: e.target.value })}
                      placeholder="0813-9876-5432"
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
              Simpan Draft
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
