"use client";

import { useEffect, useState } from "react";
import { REPORT_REASONS, submitReport, type InteractableType } from "@/lib/interactions";
import { type ApiError } from "@/lib/api";

export default function ReportModal({
  open,
  title,
  type,
  id,
  onClose,
}: {
  open: boolean;
  title: string;
  type: InteractableType;
  id: number | string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<string>("spam");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- modal form must reset each time it opens
    setReason("spam");
    setDescription("");
    setError(null);
    setIsSent(false);
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await submitReport(type, id, reason, description);
      setIsSent(true);
    } catch (err) {
      const apiError = err as ApiError;
      const fieldErrors = apiError.errors
        ? Object.values(apiError.errors).flat().join(" ")
        : null;
      setError(fieldErrors || apiError.message || "Gagal mengirim laporan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="report-modal-title" className="text-[15px] font-bold text-slate-900">
              Laporkan Postingan
            </h2>
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog laporan"
            className="rounded-md px-2 py-0.5 text-lg leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ×
          </button>
        </div>

        {isSent ? (
          <div className="mt-4">
            <p role="status" className="rounded-lg bg-green-50 px-3 py-2.5 text-[13px] leading-5 text-green-800">
              Laporan terkirim. Admin akan meninjau postingan ini. Terima kasih atas kepedulianmu menjaga komunitas UPN.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white hover:bg-slate-700"
            >
              Tutup
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4">
            <fieldset>
              <legend className="text-[12px] font-semibold text-slate-900">Alasan laporan</legend>
              <div className="mt-2 space-y-1.5" role="radiogroup" aria-label="Alasan laporan">
                {REPORT_REASONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px] transition-colors ${
                      reason === opt.value
                        ? "border-red-200 bg-red-50 font-medium text-slate-900"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={opt.value}
                      checked={reason === opt.value}
                      onChange={() => setReason(opt.value)}
                      className="h-3.5 w-3.5 shrink-0 accent-red-600"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <label htmlFor="report-description" className="mt-3 block text-[12px] font-semibold text-slate-900">
              Keterangan tambahan <span className="font-normal text-slate-400">(opsional)</span>
            </label>
            <textarea
              id="report-description"
              rows={3}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ceritakan singkat apa yang melanggar…"
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-[#F8F9FB] px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-red-400 focus:bg-white focus:outline-none"
            />
            {error && (
              <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-3 w-full rounded-lg bg-red-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {isSubmitting ? "Mengirim…" : "Kirim Laporan"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
