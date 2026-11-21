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
      <body className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900 antialiased">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-base font-semibold text-slate-900">
            Aplikasi mengalami gangguan
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Terjadi kesalahan sistem pada panel admin. Silakan muat ulang halaman
            untuk melanjutkan.
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
              Muat ulang
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
