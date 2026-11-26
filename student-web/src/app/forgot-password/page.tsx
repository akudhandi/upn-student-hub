import Link from "next/link";
import { ForgotPasswordFormPanel } from "@/components/AuthForms";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#DFDBD7] px-3 py-5 text-[#141416] sm:px-6 sm:py-8">
      <div className="auth-shell-enter w-full max-w-[640px] rounded-[28px] border border-[#E7E2DD] bg-[#F4F1EE] p-4 shadow-[0_24px_60px_-28px_rgba(20,20,22,0.18)] sm:p-6 lg:p-7">
        <header className="flex flex-wrap items-center justify-between gap-3 pb-5">
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 text-sm font-semibold tracking-tight text-[#141416] transition-opacity hover:opacity-85"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#141416] text-white">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M8 1.5L9.8 6.2L14.5 8L9.8 9.8L8 14.5L6.2 9.8L1.5 8L6.2 6.2L8 1.5Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span>UPN Student Hub</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full border border-[#E2DDD7] bg-white px-4 py-1.5 text-xs font-medium text-[#141416] transition-colors hover:bg-[#FAF8F6]"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-[#141416] px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#242428]"
            >
              Daftar
            </Link>
          </div>
        </header>

        <section className="rounded-[24px] border border-[#E5E0DA] bg-white p-5 sm:p-7">
          <ForgotPasswordFormPanel />
        </section>
      </div>
    </main>
  );
}
