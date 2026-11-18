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

  const showEmailError = (touched.email || submitAttempted) ? emailError : null;
  const showPasswordError = (touched.password || submitAttempted) ? passwordError : null;

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

  return (
    <AuthSplitShell
      title="Selamat Datang Kembali!"
      subtitle="Masukkan detail akun mahasiswa Anda di bawah ini"
      footer={
        <>
          Belum punya akun?{" "}
          <Link
            href="/register"
            className="font-semibold text-slate-900 underline-offset-4 hover:underline"
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
            className="block text-[11px] font-medium text-slate-500"
          >
            Email Kampus <span className="text-rose-500">*</span>
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
            className={`mt-1 w-full border-0 border-b bg-transparent px-0 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none ${
              showEmailError
                ? "border-rose-400 focus:border-rose-600"
                : "border-slate-300 focus:border-slate-900"
            }`}
          />
          <FieldErrorMessage message={showEmailError} />
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="block text-[11px] font-medium text-slate-500"
          >
            Password <span className="text-rose-500">*</span>
          </label>
          <div className="relative mt-1">
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => markTouched("password")}
              disabled={loading}
              aria-invalid={Boolean(showPasswordError)}
              className={`w-full border-0 border-b bg-transparent py-2 pr-8 pl-0 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none ${
                showPasswordError
                  ? "border-rose-400 focus:border-rose-600"
                  : "border-slate-300 focus:border-slate-900"
              }`}
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
            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700"
          >
            {error}
          </p>
        )}

        <div className="space-y-2.5 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center rounded-full bg-[#18191B] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#2a2c30] disabled:opacity-60"
          >
            {loading ? "Memproses…" : "Masuk"}
          </button>

          <Link
            href="/"
            className="flex h-11 w-full items-center justify-center rounded-full bg-[#F3F4F6] px-5 text-sm font-medium text-slate-800 transition-colors hover:bg-[#E5E7EB]"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </form>
    </AuthSplitShell>
  );
}
