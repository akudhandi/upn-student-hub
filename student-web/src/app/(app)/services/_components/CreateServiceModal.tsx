"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { apiFetch, uploadMedia, type ApiError } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_PHOTOS, UPN_FACULTIES } from "@/lib/constants";
import { formatRupiah } from "@/lib/formatters";
import FilterDropdown from "@/components/FilterDropdown";
import type { CategoryOption } from "@/components/CategoryTabs";
import {
  formatPriceRange,
  PRICING_META,
  ProviderAvatar,
  type ApiServiceItem,
} from "./ServiceCard";

type ServiceCreateResponse = {
  message: string;
  data: ApiServiceItem;
};

type ModalMenuKey = "modal-category" | "modal-estimasi" | null;

const EMPTY_FORM = {
  title: "",
  category_id: "",
  price_min: "",
  price_max: "",
  estimated_time: "1-2 Hari Kerja",
  whatsapp_number: "",
  description: "",
};

const TARGET_FAKULTAS_OPTIONS = UPN_FACULTIES;

const PRICING_MODELS = [
  { value: "starting_from", label: "Mulai Dari" },
  { value: "fixed", label: "Tarif Tetap" },
  { value: "per_hour", label: "Per Jam" },
  { value: "negotiable", label: "Negosiasi" },
] as const;

const PAYMENT_METHODS = [
  { value: "dp", label: "DP (Uang Muka)" },
  { value: "full", label: "Bayar Lunas Selesai" },
  { value: "flexible", label: "Fleksibel" },
] as const;

const ESTIMASI_OPTIONS = [
  "< 1 Hari",
  "1-2 Hari Kerja",
  "3-5 Hari Kerja",
  "1 Minggu+",
  "Fleksibel / Sesuai Kesepakatan",
] as const;

const MAX_PHOTOS = MAX_UPLOAD_PHOTOS;
const MAX_PHOTO_BYTES = MAX_UPLOAD_BYTES;

function subscribeNoop() {
  return () => {};
}

export type CreatedServiceSummary = {
  id: number;
  title: string;
};

export function CreateServiceModal({
  categoryOptions,
  currentUser,
  onClose,
  onCreated,
}: {
  categoryOptions: CategoryOption[];
  currentUser: AuthUser | null;
  onClose: () => void;
  onCreated: (created: CreatedServiceSummary) => void;
}) {
  const isMounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [pricingType, setPricingType] = useState<string>("starting_from");
  const [paymentMethod, setPaymentMethod] = useState<string>("flexible");
  const [targetMode, setTargetMode] = useState<"all" | "custom">("all");
  const [targetFakultas, setTargetFakultas] = useState<string[]>([...TARGET_FAKULTAS_OPTIONS]);
  const [photos, setPhotos] = useState<{ id: number; url: string; file: File }[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<ModalMenuKey>(null);

  const photoIdRef = useRef(0);
  const photosRef = useRef(photos);
  const modalCategoryRef = useRef<HTMLDivElement | null>(null);
  const modalEstimasiRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, []);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    onClose();
  }, [isSubmitting, onClose]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const rafId = window.requestAnimationFrame(() => {
      titleInputRef.current?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (openMenu !== null) {
          setOpenMenu(null);
          return;
        }
        handleClose();
      }
    }

    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (openMenu === "modal-category") {
        if (modalCategoryRef.current && !modalCategoryRef.current.contains(target)) {
          setOpenMenu(null);
        }
        return;
      }
      if (openMenu === "modal-estimasi") {
        if (modalEstimasiRef.current && !modalEstimasiRef.current.contains(target)) {
          setOpenMenu(null);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    if (openMenu !== null) {
      document.addEventListener("mousedown", handleMouseDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [openMenu, handleClose]);

  function toggleMenu(key: Exclude<ModalMenuKey, null>) {
    setOpenMenu((prev) => (prev === key ? null : key));
  }

  function updateForm<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function switchTargetMode(mode: "all" | "custom") {
    setTargetMode(mode);
    if (mode === "all") {
      setTargetFakultas([...TARGET_FAKULTAS_OPTIONS]);
    } else if (targetFakultas.length === TARGET_FAKULTAS_OPTIONS.length) {
      setTargetFakultas([]);
    }
  }

  function toggleFakultas(name: string) {
    setTargetFakultas((prev) =>
      prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name]
    );
  }

  function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPhotoError(null);

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      setPhotoError(`Maksimal ${MAX_PHOTOS} foto per layanan.`);
      return;
    }

    const accepted: { id: number; url: string; file: File }[] = [];
    let skippedType = 0;
    let skippedSize = 0;

    for (const file of Array.from(files)) {
      if (accepted.length >= remaining) break;
      if (!file.type.startsWith("image/")) {
        skippedType += 1;
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        skippedSize += 1;
        continue;
      }
      photoIdRef.current += 1;
      accepted.push({
        id: photoIdRef.current,
        url: URL.createObjectURL(file),
        file,
      });
    }

    if (skippedType > 0 || skippedSize > 0) {
      const reasons: string[] = [];
      if (skippedType > 0) reasons.push("format harus berupa gambar");
      if (skippedSize > 0) reasons.push("ukuran maksimal 5 MB per foto");
      setPhotoError(`Sebagian file dilewati (${reasons.join(", ")}).`);
    }

    if (accepted.length > 0) {
      setPhotos((prev) => [...prev, ...accepted].slice(0, MAX_PHOTOS));
    }
  }

  function removePhoto(id: number) {
    setPhotoError(null);
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  }

  function clearPhotos() {
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const categoryId = Number(formData.category_id);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      setSubmitError("Pilih kategori layanan yang tersedia terlebih dahulu.");
      return;
    }
    const priceMin = Number(formData.price_min);
    if (formData.price_min.trim() === "" || Number.isNaN(priceMin) || priceMin < 0) {
      setSubmitError("Masukkan nominal tarif yang valid (minimal Rp 0).");
      return;
    }
    const priceMaxRaw = formData.price_max.trim();
    const priceMax = pricingType === "fixed" || priceMaxRaw === "" ? null : Number(priceMaxRaw);
    if (priceMax !== null && (Number.isNaN(priceMax) || priceMax < priceMin)) {
      setSubmitError("Tarif maksimal tidak boleh lebih kecil dari tarif minimal.");
      return;
    }
    if (targetMode === "custom" && targetFakultas.length === 0) {
      setSubmitError("Pilih minimal satu target fakultas atau aktifkan Semua Fakultas.");
      return;
    }

    const rawWa = formData.whatsapp_number.trim();
    const waDigits = rawWa.replace(/\D/g, "");
    const normalizedWa =
      rawWa === ""
        ? null
        : waDigits.startsWith("8") && waDigits.length >= 9
          ? `0${waDigits}`
          : rawWa;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const uploaded =
        photos.length > 0
          ? await Promise.all(photos.map((p) => uploadMedia(p.file, "services")))
          : [];
      const created = await apiFetch<ServiceCreateResponse>("/v1/services", {
        method: "POST",
        body: JSON.stringify({
          title: formData.title.trim(),
          category_id: categoryId,
          price_min: priceMin,
          price_max: priceMax,
          pricing_type: pricingType,
          estimated_time:
            formData.estimated_time.trim() === "" ? null : formData.estimated_time.trim(),
          payment_method: paymentMethod,
          whatsapp_number: normalizedWa,
          target_faculties:
            targetMode === "all" ? [...TARGET_FAKULTAS_OPTIONS] : targetFakultas,
          description: formData.description.trim(),
          image_paths: uploaded.map((u) => u.path),
        }),
      });
      clearPhotos();
      onCreated({ id: created.data.id, title: created.data.title });
    } catch (err) {
      const apiError = err as ApiError;
      const fieldErrors = apiError.errors
        ? Object.values(apiError.errors).flat().join(" ")
        : null;
      setSubmitError(fieldErrors || apiError.message || "Gagal memasang iklan jasa. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const fakultasSummary =
    targetMode === "all" || targetFakultas.length === TARGET_FAKULTAS_OPTIONS.length
      ? "Semua Fakultas"
      : targetFakultas.length === 0
        ? "Belum ada target dipilih"
        : targetFakultas.length <= 2
          ? targetFakultas.join(", ")
          : `${targetFakultas.slice(0, 2).join(", ")} +${targetFakultas.length - 2}`;

  const previewCategory =
    categoryOptions.find((c) => String(c.id) === formData.category_id)?.name ?? "Kategori";
  const parsedPreviewMin = Number(formData.price_min);
  const hasValidPreviewPrice =
    formData.price_min.trim() !== "" &&
    !Number.isNaN(parsedPreviewMin) &&
    parsedPreviewMin >= 0;
  const parsedPreviewMax = Number(formData.price_max);
  const previewHasRange =
    pricingType !== "fixed" &&
    hasValidPreviewPrice &&
    formData.price_max.trim() !== "" &&
    !Number.isNaN(parsedPreviewMax) &&
    parsedPreviewMax > parsedPreviewMin;
  const previewModelLabel =
    PRICING_MODELS.find((m) => m.value === pricingType)?.label ?? "Mulai Dari";
  const previewPriceLine = !hasValidPreviewPrice
    ? "Tarif belum diisi"
    : pricingType === "per_hour"
      ? `${formatRupiah(parsedPreviewMin)} / jam`
      : pricingType === "negotiable"
        ? `${formatPriceRange(parsedPreviewMin, previewHasRange ? parsedPreviewMax : null)} (Nego)`
        : formatPriceRange(parsedPreviewMin, previewHasRange ? parsedPreviewMax : null);

  const previewProviderName =
    currentUser?.profile?.name || currentUser?.name || "Mahasiswa UPN";
  const previewProviderFaculty =
    currentUser?.profile?.faculty || "UPN Veteran Jatim";

  if (!isMounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#141416]/50 p-4 sm:p-8"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pasang-jasa-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[960px] flex-col overflow-hidden rounded-[24px] border border-[#E5E0DA] bg-[#F4F1EE] shadow-[0_20px_48px_-20px_rgba(20,20,22,0.20)] sm:max-h-[calc(100dvh-4rem)] sm:rounded-[28px]"
      >
        <div className="shrink-0 border-b border-[#E5E0DA] px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-[#E5E0DA] bg-white px-4 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M10 3.5L5.5 8L10 12.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Kembali</span>
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              aria-label="Tutup form tawarkan jasa"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5E0DA] bg-white text-lg text-[#57534E] transition-colors hover:border-[#141416] hover:text-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
            >
              ×
            </button>
          </div>
          <p className="text-[13px] font-medium text-[#6E6A66]">
            Layanan &amp; Jasa UPN · Tawarkan jasa baru
          </p>
          <h2
            id="pasang-jasa-title"
            className="mt-1 font-display text-2xl font-semibold tracking-tight text-[#141416]"
          >
            Tawarkan jasa mahasiswa.{" "}
            <span className="font-normal text-[#6E6A66]">
              Bagikan keahlian Anda ke sesama mahasiswa.
            </span>
          </h2>
        </div>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-5 sm:px-7 sm:pb-7"
        >
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.45fr_0.85fr]">
            {/* Form Card */}
            <div className="min-w-0 space-y-6 rounded-[20px] border border-[#E5E0DA] bg-white p-5 sm:p-6">
              {/* Informasi Layanan */}
              <section aria-labelledby="jasa-info-heading" className="space-y-4">
                <h3 id="jasa-info-heading" className="font-display text-[16px] font-semibold text-[#141416]">
                  Informasi layanan
                </h3>

                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <label htmlFor="jasa-title" className="block text-[14px] font-medium text-[#141416]">
                      Judul jasa atau layanan <span className="text-[#B83232]">*</span>
                    </label>
                    <span className="text-[13px] text-[#6E6A66]">
                      {formData.title.length}/255
                    </span>
                  </div>
                  <input
                    ref={titleInputRef}
                    id="jasa-title"
                    type="text"
                    required
                    maxLength={255}
                    value={formData.title}
                    onChange={(e) => updateForm("title", e.target.value)}
                    placeholder="Judul layanan yang ditawarkan"
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 text-[14px] text-[#141416] placeholder:text-[#66625E] transition-all focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none"
                  />
                  <p className="mt-1.5 text-[13px] text-[#6E6A66]">
                    Gunakan judul spesifik dan jelas agar mudah ditemukan di pencarian.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div ref={modalCategoryRef}>
                    <FilterDropdown
                      id="jasa-category"
                      label="Kategori layanan"
                      requiredMarker
                      value={formData.category_id}
                      displayLabel={
                        formData.category_id === ""
                          ? "Pilih kategori"
                          : (categoryOptions.find((c) => String(c.id) === formData.category_id)
                              ?.name ?? "Pilih kategori")
                      }
                      isOpen={openMenu === "modal-category"}
                      disabled={categoryOptions.length === 0}
                      onToggle={() => toggleMenu("modal-category")}
                      onSelect={(nextVal) => {
                        updateForm("category_id", nextVal);
                        setOpenMenu(null);
                      }}
                      options={categoryOptions.map((cat) => ({
                        value: String(cat.id),
                        label: cat.name,
                      }))}
                    />
                    {categoryOptions.length === 0 && (
                      <p className="mt-1.5 text-[13px] text-[#6E6A66]">
                        Kategori belum tersedia. Tunggu data jasa dimuat.
                      </p>
                    )}
                  </div>

                  <div ref={modalEstimasiRef}>
                    <FilterDropdown
                      id="jasa-estimasi"
                      label="Estimasi pengerjaan"
                      value={formData.estimated_time}
                      displayLabel={formData.estimated_time}
                      isOpen={openMenu === "modal-estimasi"}
                      onToggle={() => toggleMenu("modal-estimasi")}
                      onSelect={(nextVal) => {
                        updateForm("estimated_time", nextVal);
                        setOpenMenu(null);
                      }}
                      options={ESTIMASI_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                    />
                  </div>
                </div>

                <fieldset>
                  <legend className="text-[14px] font-medium text-[#141416]">
                    Target fakultas atau jurusan
                  </legend>
                  <div
                    className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"
                    role="radiogroup"
                    aria-label="Jangkauan target fakultas"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={targetMode === "all"}
                      onClick={() => switchTargetMode("all")}
                      className={`flex min-h-[44px] items-center justify-center rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] ${
                        targetMode === "all"
                          ? "border-[#141416] bg-[#141416] text-white"
                          : "border-[#E5E0DA] bg-[#F6F4F1] text-[#57534E] hover:border-[#CFC8BF] hover:text-[#141416]"
                      }`}
                    >
                      Semua Fakultas (8)
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={targetMode === "custom"}
                      onClick={() => switchTargetMode("custom")}
                      className={`flex min-h-[44px] items-center justify-center rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] ${
                        targetMode === "custom"
                          ? "border-[#141416] bg-[#141416] text-white"
                          : "border-[#E5E0DA] bg-[#F6F4F1] text-[#57534E] hover:border-[#CFC8BF] hover:text-[#141416]"
                      }`}
                    >
                      Pilih fakultas tertentu ({targetFakultas.length})
                    </button>
                  </div>

                  {targetMode === "custom" && (
                    <div
                      className="mt-2.5 grid grid-cols-1 gap-2 rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] p-2.5 sm:grid-cols-2"
                      role="group"
                      aria-label="Pilih target fakultas"
                    >
                      {TARGET_FAKULTAS_OPTIONS.map((f) => {
                        const checked = targetFakultas.includes(f);
                        return (
                          <label
                            key={f}
                            className={`flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors focus-within:ring-2 focus-within:ring-[#141416] ${
                              checked
                                ? "border-[#141416] bg-white text-[#141416]"
                                : "border-[#E5E0DA] bg-white text-[#57534E] hover:border-[#CFC8BF]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleFakultas(f)}
                              className="h-4 w-4 shrink-0 accent-[#141416] focus-visible:outline-none"
                            />
                            <span>{f}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </fieldset>
              </section>

              {/* Skema Tarif & Pembayaran */}
              <section
                aria-labelledby="jasa-tarif-heading"
                className="space-y-4 border-t border-[#F1EDE8] pt-5"
              >
                <h3 id="jasa-tarif-heading" className="font-display text-[16px] font-semibold text-[#141416]">
                  Skema tarif &amp; pelaksanaan
                </h3>

                <fieldset>
                  <legend className="text-[14px] font-medium text-[#141416]">Model tarif</legend>
                  <div
                    className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"
                    role="radiogroup"
                    aria-label="Model tarif"
                  >
                    {PRICING_MODELS.map((opt) => {
                      const checked = pricingType === opt.value;
                      return (
                        <label
                          key={opt.value}
                          className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-center text-[13px] font-medium transition-all focus-within:ring-2 focus-within:ring-[#141416] focus-within:ring-offset-1 ${
                            checked
                              ? "border-[#141416] bg-[#141416] text-white"
                              : "border-[#E5E0DA] bg-[#F6F4F1] text-[#57534E] hover:border-[#CFC8BF] hover:text-[#141416]"
                          }`}
                        >
                          <input
                            type="radio"
                            name="jasa-pricing"
                            value={opt.value}
                            checked={checked}
                            onChange={() => setPricingType(opt.value)}
                            className="sr-only"
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <div
                  className={`grid grid-cols-1 gap-4 ${
                    pricingType === "fixed" ? "" : "sm:grid-cols-2"
                  }`}
                >
                  <div>
                    <label
                      htmlFor="jasa-price-min"
                      className="block text-[14px] font-medium text-[#141416]"
                    >
                      {pricingType === "fixed"
                        ? "Tarif tetap (Rp)"
                        : pricingType === "per_hour"
                          ? "Tarif per jam (Rp)"
                          : "Tarif minimal (Rp)"}{" "}
                      <span className="text-[#B83232]">*</span>
                    </label>
                    <div className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 transition-all focus-within:border-[#141416] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(20,20,22,0.06)]">
                      <span className="text-[14px] font-semibold text-[#57534E]">Rp</span>
                      <input
                        id="jasa-price-min"
                        type="number"
                        required
                        min={0}
                        step="any"
                        value={formData.price_min}
                        onChange={(e) => updateForm("price_min", e.target.value)}
                        placeholder="Masukkan nominal tarif"
                        className="w-full bg-transparent text-[14px] font-semibold text-[#141416] placeholder:font-normal placeholder:text-[#66625E] focus:outline-none"
                      />
                    </div>
                    {hasValidPreviewPrice && (
                      <p className="mt-1.5 text-[13px] text-[#6E6A66]">
                        Tampilan tarif: {previewPriceLine}
                      </p>
                    )}
                  </div>

                  {pricingType !== "fixed" && (
                    <div>
                      <label
                        htmlFor="jasa-price-max"
                        className="block text-[14px] font-medium text-[#141416]"
                      >
                        Tarif maksimal (Rp){" "}
                        <span className="font-normal text-[#6E6A66]">(opsional)</span>
                      </label>
                      <div className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 transition-all focus-within:border-[#141416] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(20,20,22,0.06)]">
                        <span className="text-[14px] font-semibold text-[#57534E]">Rp</span>
                        <input
                          id="jasa-price-max"
                          type="number"
                          min={0}
                          step="any"
                          value={formData.price_max}
                          onChange={(e) => updateForm("price_max", e.target.value)}
                          placeholder="Batas atas jika bertingkat"
                          className="w-full bg-transparent text-[14px] font-semibold text-[#141416] placeholder:font-normal placeholder:text-[#66625E] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <fieldset>
                  <legend className="text-[14px] font-medium text-[#141416]">
                    Metode pembayaran
                  </legend>
                  <div
                    className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3"
                    role="radiogroup"
                    aria-label="Metode pembayaran"
                  >
                    {PAYMENT_METHODS.map((opt) => {
                      const checked = paymentMethod === opt.value;
                      return (
                        <label
                          key={opt.value}
                          className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-center text-[13px] font-medium transition-all focus-within:ring-2 focus-within:ring-[#141416] focus-within:ring-offset-1 ${
                            checked
                              ? "border-[#141416] bg-[#141416] text-white"
                              : "border-[#E5E0DA] bg-[#F6F4F1] text-[#57534E] hover:border-[#CFC8BF] hover:text-[#141416]"
                          }`}
                        >
                          <input
                            type="radio"
                            name="jasa-payment"
                            value={opt.value}
                            checked={checked}
                            onChange={() => setPaymentMethod(opt.value)}
                            className="sr-only"
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </section>

              {/* Deskripsi & Kontak */}
              <section
                aria-labelledby="jasa-deskripsi-heading"
                className="space-y-4 border-t border-[#F1EDE8] pt-5"
              >
                <h3 id="jasa-deskripsi-heading" className="font-display text-[16px] font-semibold text-[#141416]">
                  Deskripsi &amp; kontak
                </h3>

                <div>
                  <label
                    htmlFor="jasa-description"
                    className="block text-[14px] font-medium text-[#141416]"
                  >
                    Deskripsi layanan <span className="text-[#B83232]">*</span>
                  </label>
                  <textarea
                    id="jasa-description"
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                    placeholder="Jelaskan cakupan layanan, metode pengerjaan, dan cara pemesanan"
                    className="mt-1.5 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] p-3.5 text-[14px] leading-relaxed text-[#141416] placeholder:text-[#66625E] transition-all focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      id="jasa-photos-label"
                      className="block text-[14px] font-medium text-[#141416]"
                    >
                      Foto sampul atau portofolio ({photos.length}/{MAX_PHOTOS})
                    </span>
                    <span className="text-[13px] text-[#6E6A66]">
                      Foto pertama menjadi sampul
                    </span>
                  </div>
                  <div
                    className="mt-2 flex flex-wrap gap-3"
                    role="group"
                    aria-labelledby="jasa-photos-label"
                  >
                    {photos.map((photo, i) => (
                      <span key={photo.id} className="relative h-20 w-20">
                        {/* eslint-disable-next-line @next/next/no-img-element -- local object URLs for instant upload preview only */}
                        <img
                          src={photo.url}
                          alt={`Foto portofolio ${i + 1}`}
                          width={80}
                          height={80}
                          className="h-20 w-20 rounded-xl border border-[#E5E0DA] object-cover"
                        />
                        {i === 0 && (
                          <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-[#141416]/85 px-1.5 py-0.5 text-[11px] font-medium text-white">
                            Utama
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
                          aria-label={`Hapus foto portofolio ${i + 1}`}
                          className="group absolute -right-3 -top-3 flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#141416] text-[13px] font-bold leading-none text-white transition-colors group-hover:bg-[#B83232]">
                            ×
                          </span>
                        </button>
                      </span>
                    ))}
                    {photos.length < MAX_PHOTOS && (
                      <label className="flex h-20 min-w-[120px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#CFC8BF] bg-[#F6F4F1] px-4 text-[#57534E] transition-colors hover:border-[#141416] hover:bg-white focus-within:ring-2 focus-within:ring-[#141416]">
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path
                            d="M8 3v10M3 8h10"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="text-[13px] font-medium">Tambah foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          aria-label="Unggah foto sampul atau portofolio"
                          className="sr-only"
                          onChange={(e) => {
                            addPhotos(e.target.files);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                  {photoError && (
                    <p role="alert" className="mt-2 text-[13px] font-medium text-[#B83232]">
                      {photoError}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="jasa-wa" className="block text-[14px] font-medium text-[#141416]">
                    Nomor WhatsApp{" "}
                    <span className="font-normal text-[#6E6A66]">(opsional)</span>
                  </label>
                  <div className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-3.5 transition-all focus-within:border-[#141416] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(20,20,22,0.06)]">
                    <span className="shrink-0 rounded-md bg-[#EFECE8] px-2 py-0.5 text-[13px] font-semibold text-[#5F5B57]">
                      +62
                    </span>
                    <input
                      id="jasa-wa"
                      type="tel"
                      maxLength={20}
                      value={formData.whatsapp_number}
                      onChange={(e) => updateForm("whatsapp_number", e.target.value)}
                      placeholder="Masukkan nomor WhatsApp aktif (opsional)"
                      className="w-full bg-transparent text-[14px] text-[#141416] placeholder:text-[#66625E] focus:outline-none"
                    />
                  </div>
                  <p className="mt-1.5 text-[13px] text-[#6E6A66]">
                    Opsional. Kosongkan jika ingin dihubungi lewat Chat 1-on-1 dalam aplikasi saja.
                  </p>
                </div>
              </section>

              {submitError && (
                <p
                  role="alert"
                  className="rounded-xl border border-[#F1C9C9] bg-[#FDF2F2] px-4 py-3 text-[13px] font-medium text-[#B83232]"
                >
                  {submitError}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#F1EDE8] pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-5 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] active:translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-60"
                >
                  {isSubmitting ? "Menyimpan layanan..." : "Terbitkan layanan"}
                </button>
              </div>
            </div>

            {/* Live Preview Card */}
            <aside
              aria-label="Pratinjau kartu jasa"
              className="min-w-0 rounded-[20px] border border-[#E5E0DA] bg-white p-5 lg:sticky lg:top-0"
            >
              <p className="text-[13px] font-semibold text-[#141416]">
                Pratinjau tampilan katalog
              </p>
              <div className="mt-3 overflow-hidden rounded-2xl border border-[#EAE5DF] bg-white">
                <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#EFECE8] text-[#5F5B57]">
                  {photos.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local preview before upload
                    <img
                      src={photos[0].url}
                      alt="Pratinjau foto portofolio layanan"
                      width={640}
                      height={480}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[13px] font-medium">
                      Belum ada foto dipilih
                    </span>
                  )}
                  {photos.length > 1 && (
                    <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-[#141416]/85 px-2 py-0.5 text-[13px] font-medium text-white">
                      {photos.length} foto
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-md bg-[#F4F1EE] px-2.5 py-0.5 text-[13px] font-medium text-[#57534E]">
                      {previewCategory}
                    </span>
                    <span
                      className={`rounded-md px-2.5 py-0.5 text-[13px] font-medium ${
                        PRICING_META[pricingType]?.badgeClass ?? "bg-[#F4F1EE] text-[#57534E]"
                      }`}
                    >
                      {previewModelLabel}
                    </span>
                  </div>
                  <p className="mt-2.5 line-clamp-2 font-display text-[15px] font-semibold text-[#141416]">
                    {formData.title.trim() || "Judul layanan belum diisi"}
                  </p>
                  <p
                    className={`mt-1 font-display text-[17px] ${
                      hasValidPreviewPrice ? "font-bold text-[#141416]" : "font-medium text-[#6E6A66]"
                    }`}
                  >
                    {previewPriceLine}
                  </p>
                  <div className="mt-2 space-y-1 text-[13px] text-[#57534E]">
                    <p className="truncate">Estimasi: {formData.estimated_time || "Fleksibel"}</p>
                    <p className="truncate">Target: {fakultasSummary}</p>
                  </div>
                  <div className="mt-3 flex items-center gap-2 border-t border-[#F1EDE8] pt-3">
                    <ProviderAvatar name={previewProviderName} />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[#141416]">
                        {previewProviderName}
                      </p>
                      <p className="truncate text-[13px] text-[#6E6A66]">
                        {previewProviderFaculty}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
