"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin Web runtime error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          Terjadi kesalahan tak terduga
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Halaman mengalami gangguan saat memproses tampilan. Anda dapat mencoba
          memuat ulang bagian ini.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-slate-400">
            Kode referensi: {error.digest}
          </p>
        )}
        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            Coba lagi
          </button>
        </div>
      </div>
    </div>
  );
}
