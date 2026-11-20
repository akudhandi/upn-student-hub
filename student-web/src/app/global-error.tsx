"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const detailMessage =
    process.env.NODE_ENV !== "production" && error.message
      ? error.message
      : "Terjadi kendala yang tidak terduga. Silakan muat ulang halaman atau coba lagi sebentar lagi.";

  return (
    <html lang="id">
      <body className="min-h-screen bg-[#F4F1EE] text-[#141416] antialiased">
        <div className="flex min-h-screen items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-[20px] border border-[#E5E0DA] bg-white p-7 text-center shadow-[0_14px_28px_-14px_rgba(20,20,22,0.10)]">
            <h2 className="font-display text-xl font-semibold tracking-tight text-[#141416]">
              Terjadi kesalahan pada aplikasi
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[#57534E]">
              {detailMessage}
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-colors hover:bg-[#242428] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2"
            >
              Muat ulang halaman
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
