"use client";

import "./globals.css";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin Web fatal error:", error);
  }, [error]);

  return (
    <html lang="id">
      <body className="flex min-h-screen items-center justify-center bg-[#F4F1EE] p-6 text-[#141416] antialiased">
        <div className="w-full max-w-md rounded-2xl border border-[#E5E0DA] bg-white p-6 text-center">
          <h1 className="font-display text-base font-semibold text-[#141416]">
            Aplikasi mengalami gangguan
          </h1>
          <p className="mt-2 text-sm text-[#6E6A66]">
            Terjadi kesalahan sistem pada panel admin. Silakan muat ulang halaman
            untuk melanjutkan.
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
              Muat ulang
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
