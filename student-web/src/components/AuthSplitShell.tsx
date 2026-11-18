"use client";

import React from "react";
import Link from "next/link";

export function AuthSplitShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#EAEDF2] px-4 py-6 sm:px-6 sm:py-10">
      <div className="grid w-full max-w-[940px] grid-cols-1 items-stretch gap-3 rounded-[28px] border border-white/80 bg-white p-3 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.14)] sm:p-4 md:grid-cols-[1fr_1.04fr] md:gap-4">
        {/* Left Visual Showcase */}
        <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-[20px] bg-[#E5E8EE] sm:h-52 md:h-auto md:min-h-[580px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/auth-visual.jpg"
            alt="Ilustrasi portal mahasiswa UPN Student Hub"
            className="h-full w-full object-cover"
          />
          <Link
            href="/"
            className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-slate-800 shadow-xs backdrop-blur-sm transition hover:bg-white"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#002147] text-[8px] font-bold text-white">
              U
            </span>
            UPN Student Hub
          </Link>
        </div>

        {/* Right Form Panel */}
        <div className="flex flex-col justify-center px-4 py-5 sm:px-9 sm:py-7">
          <div className="mx-auto w-full max-w-[380px]">
            <div className="flex items-center justify-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#18191B] text-[10px] font-bold text-white">
                UPN
              </span>
              <span className="text-xs font-semibold tracking-tight text-slate-800">
                UPN Student Hub
              </span>
            </div>

            <div className="mt-4 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[26px]">
                {title}
              </h1>
              <p className="mt-1.5 text-xs text-slate-500">{subtitle}</p>
            </div>

            <div className="mt-6">{children}</div>

            <div className="mt-6 text-center text-xs text-slate-500">
              {footer}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export function PasswordEyeButton({
  shown,
  onToggle,
  ariaLabel,
}: {
  shown: boolean;
  onToggle: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={ariaLabel ?? (shown ? "Sembunyikan password" : "Tampilkan password")}
      title={ariaLabel ?? (shown ? "Sembunyikan password" : "Tampilkan password")}
      className="absolute right-0 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
    >
      {shown ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 3l18 18M10.58 10.58a2 2 0 002.83 2.83M9.88 4.24A10.94 10.94 0 0112 4c5.5 0 9.5 4.2 10.7 8-.5 1.56-1.45 3.1-2.74 4.37M6.61 6.61C4.55 8 3.06 10.02 2.3 12c1.2 3.8 5.2 8 9.7 8 1.58 0 3.07-.37 4.4-1.02"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M2.3 12C3.5 8.2 7.5 4 12 4s8.5 4.2 9.7 8c-1.2 3.8-5.2 8-9.7 8s-8.5-4.2-9.7-8z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      )}
    </button>
  );
}

export function FieldErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-[11px] leading-4 font-medium text-rose-600">
      {message}
    </p>
  );
}
