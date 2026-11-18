"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AuthSplitShell,
  FieldErrorMessage,
  PasswordEyeButton,
} from "@/components/AuthSplitShell";
import { login, type ApiError } from "@/lib/api";
import { setAuth } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LoginField = "email" | "password";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<LoginField, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function markTouched(field: LoginField) {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }

  const emailError = useMemo(() => {
    const trimmed = email.trim();
    if (!trimmed) return "Email kampus wajib diisi.";
    if (!EMAIL_RE.test(trimmed)) {
      return "Format email tidak valid (contoh: nama@student.upnjatim.ac.id).";
    }
    return null;
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) return "Password wajib diisi.";
    return null;
  }, [password]);

  const showEmailError = touched.email || submitAttempted ? emailError : null;
  const showPasswordError =
    touched.password || submitAttempted ? passwordError : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitAttempted(true);

    if (emailError || passwordError) {
      return;
    }

    setLoading(true);
    try {
      const res = await login({ email: email.trim(), password });
      if (res.token && res.user) {
        setAuth(res.token, res.user);
      }
      router.push("/dashboard");
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.errors) {
        const firstFieldError = Object.values(apiError.errors).flat()[0];
        setError(firstFieldError || apiError.message);
      } else {
        setError(apiError.message || "Terjadi kesalahan saat masuk. Coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  }

  function inputBoxClass(hasErr: boolean, spacing = "mt-1.5 px-3.5"): string {
    return `${spacing} h-11 w-full rounded-xl border text-sm text-[#141416] placeholder:text-[#A8A39E] transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] focus:outline-none ${
      hasErr
        ? "border-[#E06C6C] bg-[#FFF8F8] focus:border-[#C53939] focus:bg-white focus:shadow-[0_0_0_3px_rgba(197,57,57,0.1)]"
        : "border-[#E6E1DC] bg-[#F6F4F1] hover:border-[#D7D0C8] focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)]"
    }`;
  }

  return (
    <AuthSplitShell
      activeTab="login"
      title="Selamat Datang Kembali"
      subtitle="Masukkan email kampus dan password untuk mengakses workspace mahasiswa Anda."
      footer={
        <>
          Belum punya akun?{" "}
          <Link
            href="/register"
            className="font-semibold text-[#141416] underline-offset-4 hover:underline"
          >
            Daftar sekarang
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="login-email"
            className="block text-xs font-medium text-[#57534E]"
          >
            Email Kampus <span className="text-[#C53939]">*</span>
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nama@student.upnjatim.ac.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => markTouched("email")}
            disabled={loading}
            aria-invalid={Boolean(showEmailError)}
            className={inputBoxClass(Boolean(showEmailError))}
          />
          <FieldErrorMessage message={showEmailError} />
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="block text-xs font-medium text-[#57534E]"
          >
            Password <span className="text-[#C53939]">*</span>
          </label>
          <div className="relative mt-1.5">
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Masukkan password Anda"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => markTouched("password")}
              disabled={loading}
              aria-invalid={Boolean(showPasswordError)}
              className={inputBoxClass(Boolean(showPasswordError), "pl-3.5 pr-10")}
            />
            <PasswordEyeButton
              shown={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
            />
          </div>
          <FieldErrorMessage message={showPasswordError} />
        </div>

        {error && (
          <p
            role="alert"
            className="auth-error-enter rounded-xl border border-[#F1C9C9] bg-[#FDF2F2] px-3.5 py-2.5 text-xs font-medium text-[#B83232]"
          >
            {error}
          </p>
        )}

        <div className="space-y-2.5 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center rounded-full bg-[#141416] px-5 text-sm font-medium text-white transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#242428] hover:shadow-[0_10px_22px_-10px_rgba(20,20,22,0.38)] active:translate-y-0 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
          >
            {loading ? "Memproses…" : "Masuk ke Portal"}
          </button>

          <Link
            href="/"
            className="flex h-11 w-full items-center justify-center rounded-full bg-[#EFECE8] px-5 text-sm font-medium text-[#27272A] transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#E5E1DC] active:translate-y-0 active:scale-[0.99]"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </form>
    </AuthSplitShell>
  );
}
