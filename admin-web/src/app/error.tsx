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
      <div className="w-full max-w-md rounded-2xl border border-[#E5E0DA] bg-white p-6 text-center">
        <h2 className="font-display text-base font-semibold text-[#141416]">
          Terjadi kesalahan tak terduga
        </h2>
        <p className="mt-2 text-sm text-[#6E6A66]">
          Halaman mengalami gangguan saat memproses tampilan. Anda dapat mencoba
          memuat ulang bagian ini.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-[#787470]">
            Kode referensi: {error.digest}
          </p>
        )}
        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full bg-[#141416] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#242428]"
          >
            Coba lagi
          </button>
        </div>
      </div>
    </div>
  );
}
