"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AuthSplitShell,
  FieldValidationNote,
  PasswordEyeButton,
  type FieldCheck,
} from "@/components/AuthSplitShell";
import { register, type ApiError } from "@/lib/api";
import { setAuth } from "@/lib/auth";

const FAKULTAS_OPTIONS = [
  "Fakultas Ilmu Komputer",
  "Fakultas Teknik",
  "Fakultas Ekonomi & Bisnis",
  "Fakultas Pertanian",
  "Fakultas Ilmu Sosial & Politik",
  "Fakultas Arsitektur & Desain",
  "Fakultas Hukum",
  "Fakultas Kedokteran",
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [npm, setNpm] = useState("");
  const [faculty, setFaculty] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameCheck: FieldCheck = useMemo(() => {
    const trimmed = fullName.trim();
    if (!trimmed) {
      return {
        valid: false,
        tone: "required",
        message: "Wajib diisi — masukkan nama lengkap.",
      };
    }
    if (trimmed.length < 2) {
      return {
        valid: false,
        tone: "error",
        message: "Nama lengkap minimal 2 karakter.",
      };
    }
    return { valid: true, tone: "ok", message: "✓ Nama lengkap valid" };
  }, [fullName]);

  const npmCheck: FieldCheck = useMemo(() => {
    const trimmed = npm.trim();
    if (!trimmed) {
      return {
        valid: false,
        tone: "required",
        message: "Wajib diisi — 8–15 digit angka NPM.",
      };
    }
    if (!/^\d+$/.test(trimmed)) {
      return {
        valid: false,
        tone: "error",
        message: "NPM hanya boleh berisi angka 0–9.",
      };
    }
    if (trimmed.length < 8 || trimmed.length > 15) {
      return {
        valid: false,
        tone: "error",
        message: `NPM harus 8–15 digit (saat ini ${trimmed.length} digit).`,
      };
    }
    return { valid: true, tone: "ok", message: "✓ Format NPM valid" };
  }, [npm]);

  const facultyCheck: FieldCheck = useMemo(() => {
    if (!faculty) {
      return {
        valid: false,
        tone: "required",
        message: "Wajib dipilih — pilih fakultas Anda.",
      };
    }
    return { valid: true, tone: "ok", message: "✓ Fakultas dipilih" };
  }, [faculty]);

  const emailCheck: FieldCheck = useMemo(() => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      return {
        valid: false,
        tone: "required",
        message: "Wajib diisi — wajib domain @student.upnjatim.ac.id.",
      };
    }
    if (!EMAIL_RE.test(trimmed)) {
      return {
        valid: false,
        tone: "error",
        message: "Format email tidak valid (contoh: 22081010001@student.upnjatim.ac.id).",
      };
    }
    if (!trimmed.endsWith("@student.upnjatim.ac.id")) {
      return {
        valid: false,
        tone: "error",
        message: "Email wajib menggunakan domain @student.upnjatim.ac.id.",
      };
    }
    return { valid: true, tone: "ok", message: "✓ Email institusi UPN valid" };
  }, [email]);

  const passwordCheck: FieldCheck = useMemo(() => {
    if (!password) {
      return {
        valid: false,
        tone: "required",
        message: "Wajib diisi — minimal 8 karakter.",
      };
    }
    if (password.length < 8) {
      return {
        valid: false,
        tone: "error",
        message: `Minimal 8 karakter (${password.length}/8).`,
      };
    }
    return { valid: true, tone: "ok", message: "✓ Panjang password terpenuhi" };
  }, [password]);

  const confirmCheck: FieldCheck = useMemo(() => {
    if (!confirmPassword) {
      return {
        valid: false,
        tone: "required",
        message: "Wajib diisi — ulangi password.",
      };
    }
    if (confirmPassword !== password) {
      return {
        valid: false,
        tone: "error",
        message: "Konfirmasi password tidak cocok.",
      };
    }
    if (password.length < 8) {
      return {
        valid: false,
        tone: "error",
        message: "Password utama minimal 8 karakter.",
      };
    }
    return { valid: true, tone: "ok", message: "✓ Password cocok" };
  }, [confirmPassword, password]);

  const allValid =
    nameCheck.valid &&
    npmCheck.valid &&
    facultyCheck.valid &&
    emailCheck.valid &&
    passwordCheck.valid &&
    confirmCheck.valid;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!allValid) {
      setError("Mohon lengkapi semua kolom wajib sesuai ketentuan sebelum mendaftar.");
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        password_confirmation: confirmPassword,
        nim: npm.trim(),
        faculty,
      });
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
        setError(apiError.message || "Gagal membuat akun. Coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  }

  function borderTone(check: FieldCheck): string {
    if (check.tone === "error") return "border-rose-400 focus:border-rose-600";
    if (check.tone === "ok") return "border-emerald-500 focus:border-emerald-600";
    return "border-slate-300 focus:border-slate-900";
  }

  return (
    <AuthSplitShell
      title="Buat Akun Mahasiswa"
      subtitle="Daftar menggunakan email resmi @student.upnjatim.ac.id"
      footer={
        <>
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="font-semibold text-slate-900 underline-offset-4 hover:underline"
          >
            Masuk di sini
          </Link>
        </>
      }
    >
      <form className="space-y-3.5" onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="reg-fullname"
              className="block text-[11px] font-medium text-slate-500"
            >
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              id="reg-fullname"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              placeholder="Contoh: Budi Santoso"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              className={`mt-1 w-full border-0 border-b bg-transparent px-0 py-1.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none ${borderTone(nameCheck)}`}
            />
            <FieldValidationNote check={nameCheck} />
          </div>

          <div>
            <label
              htmlFor="reg-npm"
              className="block text-[11px] font-medium text-slate-500"
            >
              NPM <span className="text-rose-500">*</span>
            </label>
            <input
              id="reg-npm"
              name="npm"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              required
              placeholder="22081010001"
              value={npm}
              onChange={(e) => setNpm(e.target.value)}
              disabled={loading}
              className={`mt-1 w-full border-0 border-b bg-transparent px-0 py-1.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none ${borderTone(npmCheck)}`}
            />
            <FieldValidationNote check={npmCheck} />
          </div>
        </div>

        <div>
          <label
            htmlFor="reg-faculty"
            className="block text-[11px] font-medium text-slate-500"
          >
            Fakultas <span className="text-rose-500">*</span>
          </label>
          <select
            id="reg-faculty"
            name="faculty"
            required
            value={faculty}
            onChange={(e) => setFaculty(e.target.value)}
            disabled={loading}
            className={`mt-1 w-full border-0 border-b bg-transparent px-0 py-1.5 text-sm focus:outline-none ${
              faculty ? "text-slate-900" : "text-slate-400"
            } ${borderTone(facultyCheck)}`}
          >
            <option value="">Pilih fakultas…</option>
            {FAKULTAS_OPTIONS.map((opt) => (
              <option key={opt} value={opt} className="text-slate-900">
                {opt}
              </option>
            ))}
          </select>
          <FieldValidationNote check={facultyCheck} />
        </div>

        <div>
          <label
            htmlFor="reg-email"
            className="block text-[11px] font-medium text-slate-500"
          >
            Email Kampus <span className="text-rose-500">*</span>
          </label>
          <input
            id="reg-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="nama@student.upnjatim.ac.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className={`mt-1 w-full border-0 border-b bg-transparent px-0 py-1.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none ${borderTone(emailCheck)}`}
          />
          <FieldValidationNote check={emailCheck} />
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="reg-password"
              className="block text-[11px] font-medium text-slate-500"
            >
              Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative mt-1">
              <input
                id="reg-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className={`w-full border-0 border-b bg-transparent py-1.5 pr-8 pl-0 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none ${borderTone(passwordCheck)}`}
              />
              <PasswordEyeButton
                shown={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
              />
            </div>
            <FieldValidationNote check={passwordCheck} />
          </div>

          <div>
            <label
              htmlFor="reg-confirm"
              className="block text-[11px] font-medium text-slate-500"
            >
              Konfirmasi Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative mt-1">
              <input
                id="reg-confirm"
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className={`w-full border-0 border-b bg-transparent py-1.5 pr-8 pl-0 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none ${borderTone(confirmCheck)}`}
              />
              <PasswordEyeButton
                shown={showConfirm}
                onToggle={() => setShowConfirm((v) => !v)}
              />
            </div>
            <FieldValidationNote check={confirmCheck} />
          </div>
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
            {loading ? "Mendaftarkan Akun…" : "Daftar Akun"}
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
